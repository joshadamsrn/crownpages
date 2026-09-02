'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  ChevronRight,
  Cloud,
  Download,
  Link2,
  MessageCircleMore,
  Wallet,
  X,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { trackEvent } from '@/lib/analytics';
import { detectPlatform, saveToWallet } from '@/lib/platform-utils';

interface PageSaveSheetProps {
  pageId: string;
  pageUrl?: string;
  pageTitle?: string;
  pageSlug?: string;
  businessSlug?: string;
  brochureSections?: Array<{ type: string; data: Record<string, unknown> }>;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  className?: string;
  triggerClassName?: string;
}

interface WalletResponsePayload {
  platform?: 'google';
  saveUrl?: string;
  ready?: boolean;
  error?: string;
  fallback?: 'app';
}

interface ParsedRouteContext {
  businessSlug?: string;
  pageSlug?: string;
}

interface PrintableAssetItem {
  title: string;
  kind: 'image';
  sourceUrl?: string;
  imageUrl?: string;
}

interface RenderedPrintableItem {
  title: string;
  kind: 'image';
  dataUrl?: string;
  width?: number;
  height?: number;
}

interface SocialLinkItem {
  label: string;
  url: string;
}

interface ContactInfoItem {
  label: string;
  value: string;
}

interface PageSectionGroup {
  title: string;
  items: PrintableAssetItem[];
}

interface BrochureContent {
  aboutTitle?: string;
  aboutText?: string;
  amenitiesTitle?: string;
  amenities: string[];
  galleryImages: string[];
  pageSections: PageSectionGroup[];
  contactInfo: ContactInfoItem[];
  contactName?: string;
  contactRole?: string;
}

const SOCIAL_LINK_LABELS = new Set(['instagram', 'website', 'linkedin', 'facebook', 'twitter', 'x', 'youtube', 'tiktok']);

type SaveActionKey =
  | 'save_opened'
  | 'save_text_clicked'
  | 'save_wallet_clicked'
  | 'save_drive_clicked'
  | 'save_files_clicked'
  | 'save_copy_link_clicked';

const buildQrUrl = (url: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const getImageFormat = (dataUrl: string): 'PNG' | 'JPEG' => {
  const prefix = dataUrl.slice(0, 32).toLowerCase();
  if (prefix.includes('image/png')) return 'PNG';
  return 'JPEG';
};

const getMediaDimensions = (dataUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = () => reject(new Error('Unable to load image dimensions'));
    image.src = dataUrl;
  });

const fallbackCopyText = (value: string) => {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

const stripHtml = (html?: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const resolveAssetUrl = (url?: string) => {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl) return url;
  return `${supabaseUrl}/storage/v1/object/public/uploads/${url.replace(/^\//, '')}`;
};

const normalizeLabel = (value?: string) => (value || '').trim().toLowerCase();

const formatDisplayUrl = (value?: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
    return `${parsed.hostname.replace(/^www\./i, '')}${path}`;
  } catch {
    return trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  }
};

const ensureAbsoluteHttpUrl = (value?: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const isSocialLinkLabel = (value?: string) => SOCIAL_LINK_LABELS.has(normalizeLabel(value));

const normalizeWhitespace = (value?: string) => (value || '').replace(/\s+/g, ' ').trim();

const normalizePhoneForPdf = (value?: string) => {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return trimmed;
};

const normalizeEmailForPdf = (value?: string) => normalizeWhitespace(value).replace(/\s*@\s*/g, '@');

const normalizeWebsiteForPdf = (value?: string) => {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return '';
  return formatDisplayUrl(trimmed).replace(/\s+/g, '');
};

const normalizeContactValueForPdf = (label: string, value?: string) => {
  const normalized = normalizeLabel(label);
  if (normalized === 'main office' || normalized === 'personal' || normalized === 'fax') {
    return normalizePhoneForPdf(value);
  }
  if (normalized === 'email') {
    return normalizeEmailForPdf(value);
  }
  if (normalized === 'website') {
    return normalizeWebsiteForPdf(value);
  }
  return normalizeWhitespace(value);
};

const parseRouteContext = (url?: string): ParsedRouteContext => {
  if (!url) return {};

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const systemRoutes = new Set([
      '(app)',
      '(tabs)',
      'app',
      'auth',
      'api',
      'protected',
      'mobile',
      'organization',
      'payment',
      'privacy-policy',
      'terms-of-service',
      'share',
      't',
      'admin',
      '_next',
      'static',
    ]);

    if (pathParts.length > 0 && systemRoutes.has(pathParts[0])) {
      return {};
    }

    return {
      businessSlug: pathParts[0] || undefined,
      pageSlug: pathParts[1] || undefined,
    };
  } catch {
    return {};
  }
};

export function PageSaveSheet({
  pageId,
  pageUrl,
  pageTitle,
  pageSlug,
  businessSlug,
  brochureSections,
  businessName,
  address,
  phone,
  email,
  contactName,
  heroImageUrl,
  logoUrl,
  className = '',
  triggerClassName = '',
}: PageSaveSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const platform = useMemo(() => detectPlatform(), []);
  const resolvedPageUrl =
    pageUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const resolvedTitle = pageTitle || businessName || 'Crown Page';
  const routeContext = useMemo(() => parseRouteContext(resolvedPageUrl), [resolvedPageUrl]);
  const resolvedBusinessSlug = businessSlug || routeContext.businessSlug;
  const resolvedPageSlug = pageSlug || routeContext.pageSlug;
  const walletLabel = 'Save to Wallet';
  const brochureContent = useMemo<BrochureContent>(() => {
    const aboutSection = brochureSections?.find((section) => section.type === 'about');
    const amenitiesSection = brochureSections?.find((section) => section.type === 'amenities');
    const gallerySections = brochureSections?.filter((section) => section.type === 'gallery') || [];
    const linksWithContactSection = brochureSections?.find((section) => section.type === 'linksWithContact');
    const pageSections = brochureSections?.filter((section) => section.type === 'pages') || [];
    const socialLinksSections = brochureSections?.filter((section) => section.type === 'socialLinks') || [];

    const aboutData = (aboutSection?.data || {}) as Record<string, unknown>;
    const amenitiesData = (amenitiesSection?.data || {}) as Record<string, unknown>;
    const linksWithContactData = (linksWithContactSection?.data || {}) as Record<string, unknown>;

    const amenities = Array.isArray(amenitiesData.amenities)
      ? amenitiesData.amenities
          .map((item) => (item && typeof item === 'object' ? String((item as { name?: string }).name || '') : ''))
          .filter(Boolean)
      : [];

    const galleryImages = gallerySections.flatMap((section) => {
      const data = section.data as Record<string, unknown>;
      const images = Array.isArray(data.images) ? data.images : [];
      return images
        .map((image) => (image && typeof image === 'object' ? resolveAssetUrl((image as { url?: string }).url) : undefined))
        .filter(Boolean) as string[];
    });

    const linksWithContactItems = Array.isArray(linksWithContactData.links) ? linksWithContactData.links : [];
    const socialLinks = [
      ...linksWithContactItems
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const link = item as { title?: string; url?: string };
          if (!link.title || !link.url || !isSocialLinkLabel(link.title)) return null;
          return {
            label: String(link.title).trim(),
            url: ensureAbsoluteHttpUrl(String(link.url).trim()),
          };
        })
        .filter(Boolean),
      ...socialLinksSections.flatMap((section) => {
        const data = (section.data || {}) as Record<string, unknown>;
        const links = Array.isArray(data.links) ? data.links : [];
        return links
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const link = item as { platform?: string; label?: string; url?: string };
            const label = String(link.label || link.platform || '').trim();
            if (!label || !link.url) return null;
            return {
              label,
              url: ensureAbsoluteHttpUrl(String(link.url).trim()),
            };
          })
          .filter(Boolean) as SocialLinkItem[];
      }),
    ] as SocialLinkItem[];

    const uniqueSocialLinks = socialLinks
      .map((item) => {
        const key = `${normalizeLabel(item.label)}::${item.url.toLowerCase()}`;
        return { ...item, key };
      })
      .filter((item, index, items) => items.findIndex((candidate) => candidate.key === item.key) === index)
      .map(({ key, ...item }) => item);

    const socialOrder = ['instagram', 'website', 'linkedin', 'facebook'];
    uniqueSocialLinks.sort((a, b) => {
      const aIndex = socialOrder.indexOf(normalizeLabel(a.label));
      const bIndex = socialOrder.indexOf(normalizeLabel(b.label));
      const resolvedA = aIndex === -1 ? socialOrder.length : aIndex;
      const resolvedB = bIndex === -1 ? socialOrder.length : bIndex;
      if (resolvedA !== resolvedB) return resolvedA - resolvedB;
      return a.label.localeCompare(b.label);
    });

    const pageSectionGroups: PageSectionGroup[] = [];

    const addPrintableItem = (
      sectionItems: PrintableAssetItem[],
      title: string,
      {
        sourceUrl,
        imageUrl,
      }: {
        sourceUrl?: string;
        imageUrl?: string;
      }
    ) => {
      const resolvedImageUrl = resolveAssetUrl(imageUrl || sourceUrl);
      if (!resolvedImageUrl) return;

      sectionItems.push({
        title,
        kind: 'image',
        sourceUrl: resolveAssetUrl(sourceUrl),
        imageUrl: resolvedImageUrl,
      });
    };

    const pushGroupedItems = (items: PrintableAssetItem[]) => {
      const itemsByTitle = new Map<string, PrintableAssetItem[]>();
      items.forEach((item) => {
        const groupTitle = item.title.trim() || 'Pages';
        const existing = itemsByTitle.get(groupTitle) || [];
        existing.push(item);
        itemsByTitle.set(groupTitle, existing);
      });

      itemsByTitle.forEach((groupItems, title) => {
        if (groupItems.length > 0) {
          pageSectionGroups.push({ title, items: groupItems });
        }
      });
    };

    pageSections.forEach((section) => {
      const data = section.data as Record<string, unknown>;
      const pages = Array.isArray(data.pages) ? data.pages : [];
      const sectionItems: PrintableAssetItem[] = [];

      pages.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const pageItem = item as {
          title?: string;
          type?: string;
          url?: string;
          image?: string;
          fileUrl?: string;
          fileType?: string;
          files?: Array<{
            url?: string;
            image?: string;
            previewImage?: string;
            type?: string;
            fileType?: string;
          }>;
        };
        const itemTitle = String(pageItem.title || '').trim() || 'Pages';

        if (Array.isArray(pageItem.files) && pageItem.files.length > 0) {
          pageItem.files.forEach((file) => {
            if (!file || typeof file !== 'object') return;
            const normalizedFileType = String(file.fileType || file.type || '').toLowerCase();
            if (normalizedFileType.includes('image') || file.previewImage || file.image) {
              addPrintableItem(sectionItems, itemTitle, {
                sourceUrl: file.url,
                imageUrl: file.previewImage || file.image,
              });
            }
          });
          return;
        }

        if (pageItem.type === 'external_link') {
          if (pageItem.image) {
            addPrintableItem(sectionItems, itemTitle, {
              sourceUrl: pageItem.url,
              imageUrl: pageItem.image,
            });
          }
          return;
        }

        if (pageItem.type !== 'file') return;
        const normalizedFileType = String(pageItem.fileType || '').toLowerCase();
        if (normalizedFileType.includes('image') || pageItem.image) {
          addPrintableItem(sectionItems, itemTitle, {
            sourceUrl: pageItem.fileUrl,
            imageUrl: pageItem.image,
          });
        }
      });

      if (sectionItems.length > 0) {
        pushGroupedItems(sectionItems);
      }
    });

    const contactFieldCandidates: ContactInfoItem[] = [
      {
        label: 'Main Office',
        value:
          typeof linksWithContactData.contactPhone === 'string'
            ? linksWithContactData.contactPhone
            : phone || '',
      },
      {
        label: 'Personal',
        value: typeof linksWithContactData.contactPhone2 === 'string' ? linksWithContactData.contactPhone2 : '',
      },
      {
        label: 'Email',
        value:
          typeof linksWithContactData.contactEmail === 'string'
            ? linksWithContactData.contactEmail
            : email || '',
      },
      {
        label: 'Fax',
        value: typeof linksWithContactData.contactFax === 'string' ? linksWithContactData.contactFax : '',
      },
      {
        label: 'Website',
        value:
          typeof linksWithContactData.contactWebsite === 'string'
            ? linksWithContactData.contactWebsite
            : uniqueSocialLinks.find((item) => normalizeLabel(item.label) === 'website')?.url || '',
      },
    ];

    const seenContactValues = new Set<string>();
    const contactInfo = contactFieldCandidates.filter((item) => {
      const trimmed = normalizeContactValueForPdf(item.label, item.value);
      if (!trimmed) return false;
      const key = trimmed.toLowerCase();
      if (seenContactValues.has(key)) return false;
      seenContactValues.add(key);
      item.value = trimmed;
      return true;
    });

    return {
      aboutTitle: typeof aboutData.title === 'string' ? aboutData.title : 'About',
      aboutText: stripHtml(typeof aboutData.content === 'string' ? aboutData.content : ''),
      amenitiesTitle: typeof amenitiesData.title === 'string' ? amenitiesData.title : 'Amenities',
      amenities,
      galleryImages,
      pageSections: pageSectionGroups,
      contactInfo,
      contactName:
        typeof linksWithContactData.contactName === 'string'
          ? linksWithContactData.contactName.trim()
          : contactName || '',
      contactRole:
        typeof linksWithContactData.contactRole === 'string'
          ? linksWithContactData.contactRole.trim()
          : '',
    };
  }, [brochureSections, contactName, email, phone]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const trackSaveAction = async (
    action: SaveActionKey,
    eventData: Record<string, unknown> = {}
  ) => {
    await trackEvent({
      pageId,
      eventType: 'save',
      eventData: {
        action,
        source: 'hero_save_sheet',
        page_url: resolvedPageUrl,
        ...eventData,
      },
    }).catch(() => {});
  };

  const fetchImageDataUrl = async (url?: string) => {
    if (!url) return null;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return await blobToDataUrl(blob);
    } catch {
      return null;
    }
  };

  const createSummaryFile = async () => {
    const doc = new jsPDF({
      unit: 'pt',
      format: 'letter',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;
    const colors = {
      ink: '#111827',
      muted: '#667085',
      accent: '#1d4ed8',
      highlight: '#0f172a',
      border: '#d9e2ef',
      navy: '#0a2158',
      gold: '#be953e',
    };
    let cursorY = 98;

    const pageSectionImageUrls = brochureContent.pageSections.flatMap((section) =>
      section.items.flatMap((item) => (item.imageUrl ? [item.imageUrl] : []))
    );
    const imageUrls = Array.from(
      new Set([heroImageUrl, logoUrl, ...brochureContent.galleryImages, ...pageSectionImageUrls].filter(Boolean) as string[])
    );

    const imageEntries = await Promise.all(
      imageUrls.map(async (url) => [url, await fetchImageDataUrl(url)] as const)
    );
    const imageMap = new Map(imageEntries);

    const [heroImageDataUrl, logoDataUrl, qrDataUrl] = await Promise.all([
      Promise.resolve(heroImageUrl ? imageMap.get(heroImageUrl) || null : null),
      Promise.resolve(logoUrl ? imageMap.get(logoUrl) || null : null),
      fetchImageDataUrl(buildQrUrl(resolvedPageUrl)),
    ]);
    const [heroImageDimensions, logoDimensions] = await Promise.all([
      heroImageDataUrl ? getMediaDimensions(heroImageDataUrl).catch(() => null) : Promise.resolve(null),
      logoDataUrl ? getMediaDimensions(logoDataUrl).catch(() => null) : Promise.resolve(null),
    ]);

    const renderedPageSections: Array<{ title: string; items: RenderedPrintableItem[] }> = [];
    for (const section of brochureContent.pageSections) {
      const renderedItems: RenderedPrintableItem[] = [];
      for (const asset of section.items) {
        const dataUrl = asset.imageUrl ? imageMap.get(asset.imageUrl) || null : null;
        if (!dataUrl) continue;
        try {
          const dimensions = await getMediaDimensions(dataUrl);
          renderedItems.push({ title: asset.title, kind: 'image', dataUrl, ...dimensions });
        } catch {
          renderedItems.push({ title: asset.title, kind: 'image', dataUrl });
        }
      }

      if (renderedItems.length > 0) {
        renderedPageSections.push({ title: section.title, items: renderedItems });
      }
    }

    let currentPage = 1;

    const drawPageChrome = () => {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setFillColor(10, 33, 88);
      doc.rect(0, 0, pageWidth, 76, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      const chromeTitle = doc.splitTextToSize(resolvedTitle, contentWidth - 20);
      doc.text(chromeTitle.slice(0, 1), margin, 48);
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
      doc.text('Crown Pages', margin, pageHeight - 18);
    };

    const addNewPage = () => {
      doc.addPage();
      currentPage += 1;
      drawPageChrome();
      cursorY = 98;
    };

    const ensureSpace = (height: number) => {
      if (cursorY + height > pageHeight - 70) {
        addNewPage();
      }
    };

    const drawSectionTitle = (title: string, subtitle?: string) => {
      ensureSpace(subtitle ? 48 : 28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(colors.ink);
      doc.text(title, margin, cursorY);
      cursorY += 6;
      doc.setDrawColor(190, 149, 62);
      doc.setLineWidth(1.5);
      doc.line(margin, cursorY + 2, margin + 42, cursorY + 2);
      cursorY += 12;
      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(colors.muted);
        const subtitleLines = doc.splitTextToSize(subtitle, contentWidth);
        doc.text(subtitleLines, margin, cursorY + 4);
        cursorY += subtitleLines.length * 13 + 8;
      } else {
        cursorY += 6;
      }
    };

    const drawTextBlock = (text: string) => {
      if (!text) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11.5);
      doc.setTextColor(colors.muted);
      const lines = doc.splitTextToSize(text, contentWidth);
      ensureSpace(lines.length * 15 + 8);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 15 + 4;
    };

    const drawTextCard = (text: string) => {
      if (!text) return;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11.5);
      doc.setTextColor(colors.muted);
      const textLines = doc.splitTextToSize(text, contentWidth - 36);
      const cardHeight = Math.max(108, textLines.length * 15 + 30);
      ensureSpace(cardHeight + 8);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, cursorY, contentWidth, cardHeight, 14, 14, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(margin, cursorY, contentWidth, cardHeight, 14, 14, 'S');
      doc.text(textLines, margin + 18, cursorY + 28);
      cursorY += cardHeight + 14;
    };

    const drawMediaFitted = (
      dataUrl: string,
      x: number,
      y: number,
      boxWidth: number,
      boxHeight: number,
      sourceWidth?: number,
      sourceHeight?: number
    ) => {
      const innerPadding = 8;
      const availableWidth = boxWidth - innerPadding * 2;
      const availableHeight = boxHeight - innerPadding * 2;
      const width = sourceWidth || availableWidth;
      const height = sourceHeight || availableHeight;
      const scale = Math.min(availableWidth / width, availableHeight / height);
      const renderWidth = width * scale;
      const renderHeight = height * scale;
      const renderX = x + innerPadding + (availableWidth - renderWidth) / 2;
      const renderY = y + innerPadding + (availableHeight - renderHeight) / 2;

      doc.addImage(dataUrl, getImageFormat(dataUrl), renderX, renderY, renderWidth, renderHeight, undefined, 'FAST');
    };

    const drawMediaBox = (item: RenderedPrintableItem, x: number, y: number, w: number, h: number) => {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, w, h, 12, 12, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, y, w, h, 12, 12, 'S');

      if (item.dataUrl) {
        drawMediaFitted(item.dataUrl, x, y, w, h, item.width, item.height);
      }
    };

    const getFullWidthMediaHeight = (item: { width?: number; height?: number } | null, maxHeight: number) => {
      if (!item?.width || !item?.height) {
        return Math.min(maxHeight, 260);
      }

      const proportionalHeight = (contentWidth * item.height) / item.width;
      return Math.min(maxHeight, Math.max(180, proportionalHeight));
    };

    const drawPhoneIcon = (centerX: number, centerY: number, scale = 1) => {
      doc.setDrawColor(10, 33, 88);
      doc.setLineWidth(1.8 * scale);
      doc.line(centerX - 6 * scale, centerY + 4 * scale, centerX - 1.5 * scale, centerY + 7 * scale);
      doc.line(centerX - 1.5 * scale, centerY + 7 * scale, centerX + 2 * scale, centerY + 3.5 * scale);
      doc.line(centerX + 2 * scale, centerY + 3.5 * scale, centerX + 5.5 * scale, centerY - 1 * scale);
      doc.line(centerX + 5.5 * scale, centerY - 1 * scale, centerX + 2.5 * scale, centerY - 5.5 * scale);
      doc.line(centerX + 2.5 * scale, centerY - 5.5 * scale, centerX - 2.5 * scale, centerY - 3 * scale);
    };

    const drawEnvelopeIcon = (centerX: number, centerY: number, scale = 1) => {
      const w = 16 * scale;
      const h = 11 * scale;
      const x = centerX - w / 2;
      const y = centerY - h / 2;
      doc.setDrawColor(10, 33, 88);
      doc.setLineWidth(1.4 * scale);
      doc.roundedRect(x, y, w, h, 1.5 * scale, 1.5 * scale, 'S');
      doc.line(x + 1.5 * scale, y + 1.5 * scale, centerX, y + h / 2 + 1 * scale);
      doc.line(x + w - 1.5 * scale, y + 1.5 * scale, centerX, y + h / 2 + 1 * scale);
    };

    const drawFaxIcon = (centerX: number, centerY: number, scale = 1) => {
      const w = 13 * scale;
      const h = 16 * scale;
      const x = centerX - w / 2;
      const y = centerY - h / 2;
      doc.setDrawColor(10, 33, 88);
      doc.setLineWidth(1.3 * scale);
      doc.roundedRect(x, y + 4 * scale, w, h - 4 * scale, 1.5 * scale, 1.5 * scale, 'S');
      doc.rect(x + 2.5 * scale, y, w - 5 * scale, 5 * scale, 'S');
      doc.line(x + 3 * scale, y + 9 * scale, x + w - 3 * scale, y + 9 * scale);
      doc.line(x + 3 * scale, y + 12 * scale, x + w - 3 * scale, y + 12 * scale);
    };

    const drawGlobeIcon = (centerX: number, centerY: number, scale = 1) => {
      const r = 7 * scale;
      doc.setDrawColor(10, 33, 88);
      doc.setLineWidth(1.3 * scale);
      doc.circle(centerX, centerY, r, 'S');
      doc.line(centerX - r, centerY, centerX + r, centerY);
      doc.line(centerX, centerY - r, centerX, centerY + r);
      doc.circle(centerX, centerY, r * 0.55, 'S');
    };

    const drawContactIcon = (label: string, centerX: number, centerY: number) => {
      const normalized = normalizeLabel(label);
      if (normalized === 'main office' || normalized === 'personal') {
        drawPhoneIcon(centerX, centerY, normalized === 'personal' ? 0.9 : 1);
        return;
      }
      if (normalized === 'email') {
        drawEnvelopeIcon(centerX, centerY, 1);
        return;
      }
      if (normalized === 'fax') {
        drawFaxIcon(centerX, centerY, 1);
        return;
      }
      if (normalized === 'website') {
        drawGlobeIcon(centerX, centerY, 1);
        return;
      }
    };

    const drawContactRows = (rows: ContactInfoItem[]) => {
      rows.forEach((row) => {
        const valueLines = doc.splitTextToSize(row.value, contentWidth - 96);
        const rowHeight = Math.max(68, 44 + valueLines.length * 16);
        ensureSpace(rowHeight + 8);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, cursorY, contentWidth, rowHeight, 12, 12, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, cursorY, contentWidth, rowHeight, 12, 12, 'S');

        doc.setFillColor(243, 246, 251);
        doc.circle(margin + 34, cursorY + rowHeight / 2, 16, 'F');
        drawContactIcon(row.label, margin + 34, cursorY + rowHeight / 2);

        doc.setDrawColor(226, 232, 240);
        doc.line(margin + 62, cursorY + 14, margin + 62, cursorY + rowHeight - 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        doc.setTextColor(colors.ink);
        doc.text(row.label, margin + 80, cursorY + 27);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(colors.navy);
        doc.text(valueLines.slice(0, 3), margin + 80, cursorY + 49);
        cursorY += rowHeight + 6;
      });
    };

    const drawImageLayoutPage = (title: string, items: RenderedPrintableItem[]) => {
      addNewPage();
      drawSectionTitle(title);
      const gap = 16;
      const halfWidth = (contentWidth - gap) / 2;
      const thirdWidth = (contentWidth - gap * 2) / 3;
      const topY = cursorY;

      if (items.length === 1) {
        const boxHeight = getFullWidthMediaHeight(items[0], 560);
        drawMediaBox(items[0], margin, topY, contentWidth, boxHeight);
        cursorY = topY + boxHeight + 16;
        return;
      }

      if (items.length === 2) {
        const leftRatio = items[0].width && items[0].height ? items[0].height / items[0].width : 1.15;
        const rightRatio = items[1].width && items[1].height ? items[1].height / items[1].width : 1.15;
        const boxHeight = Math.min(520, Math.max(240, Math.round(halfWidth * Math.max(leftRatio, rightRatio))));
        drawMediaBox(items[0], margin, topY, halfWidth, boxHeight);
        drawMediaBox(items[1], margin + halfWidth + gap, topY, halfWidth, boxHeight);
        cursorY = topY + boxHeight + 16;
        return;
      }

      if (items.length === 3) {
        const boxHeight = 238;
        drawMediaBox(items[0], margin, topY, thirdWidth, boxHeight);
        drawMediaBox(items[1], margin + thirdWidth + gap, topY, thirdWidth, boxHeight);
        drawMediaBox(items[2], margin + (thirdWidth + gap) * 2, topY, thirdWidth, boxHeight);
        cursorY = topY + boxHeight + 16;
        return;
      }

      drawMediaBox(items[0], margin, topY, halfWidth, 238);
      drawMediaBox(items[1], margin + halfWidth + gap, topY, halfWidth, 238);
      drawMediaBox(items[2], margin, topY + 254, halfWidth, 238);
      drawMediaBox(items[3], margin + halfWidth + gap, topY + 254, halfWidth, 238);
      cursorY = topY + 508;
    };

    const renderGroupedImagePages = (title: string, items: RenderedPrintableItem[]) => {
      for (let index = 0; index < items.length; index += 4) {
        drawImageLayoutPage(title, items.slice(index, index + 4));
      }
    };

    drawPageChrome();

    if (heroImageDataUrl) {
      const heroHeight = getFullWidthMediaHeight(heroImageDimensions, 250);
      doc.addImage(heroImageDataUrl, getImageFormat(heroImageDataUrl), margin, cursorY, contentWidth, heroHeight, undefined, 'FAST');
      cursorY += heroHeight + 14;
    }

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, cursorY, contentWidth, 146, 16, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, cursorY, contentWidth, 146, 16, 16, 'S');

    if (logoDataUrl) {
      const logoBoxWidth = 176;
      const logoBoxHeight = 102;
      drawMediaFitted(
        logoDataUrl,
        margin + 18,
        cursorY + 22,
        logoBoxWidth,
        logoBoxHeight,
        logoDimensions?.width,
        logoDimensions?.height
      );
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 202, cursorY + 18, margin + 202, cursorY + 128);
    }

    const introX = logoDataUrl ? margin + 222 : margin + 22;
    const introWidth = contentWidth - (introX - margin) - 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(colors.ink);
    const introTitleLines = doc.splitTextToSize(resolvedTitle, introWidth);
    doc.text(introTitleLines, introX, cursorY + 34);

    let infoY = cursorY + 56;
    const contactValueByLabel = new Map(
      brochureContent.contactInfo.map((item) => [normalizeLabel(item.label), item.value] as const)
    );
    const overviewRows = [
      { label: 'Address', value: normalizeWhitespace(address) },
      {
        label: 'Primary Contact',
        value: brochureContent.contactRole
          ? `${normalizeWhitespace(brochureContent.contactName || contactName)} • ${normalizeWhitespace(brochureContent.contactRole)}`
          : normalizeWhitespace(brochureContent.contactName || contactName),
      },
      { label: 'Main Office', value: contactValueByLabel.get('main office') || normalizePhoneForPdf(phone) },
      { label: 'Email', value: contactValueByLabel.get('email') || normalizeEmailForPdf(email) },
    ].filter((item) => item.value.trim());

    overviewRows.forEach((row, index) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(colors.muted);
      doc.text(row.label.toUpperCase(), introX, infoY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(colors.ink);
      const wrapped = doc.splitTextToSize(row.value, introWidth);
      doc.text(wrapped, introX, infoY + 15);
      infoY += wrapped.length * 13 + 10;

      if (index < overviewRows.length - 1) {
        doc.setDrawColor(229, 231, 235);
        doc.line(introX, infoY - 4, pageWidth - margin - 18, infoY - 4);
      }
    });
    cursorY += 160;

    if (brochureContent.aboutText || brochureContent.amenities.length > 0) {
      addNewPage();
    }

    if (brochureContent.aboutText) {
      drawSectionTitle(brochureContent.aboutTitle || 'About');
      drawTextCard(brochureContent.aboutText);
    }

    if (brochureContent.amenities.length > 0) {
      drawSectionTitle(brochureContent.amenitiesTitle || 'Amenities');
      const amenitiesCardY = cursorY;
      const amenityRowCount = Math.ceil(brochureContent.amenities.length / 2);
      const amenitiesCardHeight = Math.max(180, 44 + amenityRowCount * 28);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, amenitiesCardY, contentWidth, amenitiesCardHeight, 14, 14, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(margin, amenitiesCardY, contentWidth, amenitiesCardHeight, 14, 14, 'S');

      const columnWidth = (contentWidth - 88) / 2;
      let leftY = amenitiesCardY + 30;
      let rightY = amenitiesCardY + 30;

      brochureContent.amenities.forEach((item, index) => {
        const lines = doc.splitTextToSize(item, columnWidth - 18);
        const isLeft = index % 2 === 0;
        const x = isLeft ? margin + 24 : margin + 24 + columnWidth + 40;
        const y = isLeft ? leftY : rightY;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(colors.ink);
        doc.text('•', x, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(colors.muted);
        doc.text(lines, x + 16, y);
        if (isLeft) {
          leftY += Math.max(24, lines.length * 13 + 8);
        } else {
          rightY += Math.max(24, lines.length * 13 + 8);
        }
      });
      cursorY = amenitiesCardY + amenitiesCardHeight + 18;
    }

    const galleryCards = brochureContent.galleryImages
      .map((url) => imageMap.get(url) || null)
      .filter(Boolean) as string[];

    const renderedGalleryItems: RenderedPrintableItem[] = await Promise.all(
      galleryCards.map(async (dataUrl, index) => {
        try {
          const dimensions = await getMediaDimensions(dataUrl);
          return {
            title: `Photo ${index + 1}`,
            kind: 'image' as const,
            dataUrl,
            ...dimensions,
          };
        } catch {
          return {
            title: `Photo ${index + 1}`,
            kind: 'image' as const,
            dataUrl,
          };
        }
      })
    );

    if (renderedGalleryItems.length > 0) {
      renderGroupedImagePages('Photos', renderedGalleryItems);
    }

    renderedPageSections.forEach((section) => {
      renderGroupedImagePages(section.title, section.items);
    });

    if (brochureContent.contactInfo.length > 0) {
      addNewPage();
      drawSectionTitle('Contact');
      drawContactRows(brochureContent.contactInfo);
      if (logoDataUrl) {
        const logoBoxWidth = 260;
        const logoBoxHeight = 150;
        ensureSpace(logoBoxHeight + 18);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect((pageWidth - logoBoxWidth) / 2, cursorY + 8, logoBoxWidth, logoBoxHeight, 16, 16, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.roundedRect((pageWidth - logoBoxWidth) / 2, cursorY + 8, logoBoxWidth, logoBoxHeight, 16, 16, 'S');
        drawMediaFitted(
          logoDataUrl,
          (pageWidth - logoBoxWidth) / 2,
          cursorY + 8,
          logoBoxWidth,
          logoBoxHeight,
          logoDimensions?.width,
          logoDimensions?.height
        );
        cursorY += logoBoxHeight + 22;
      }
    }

    addNewPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(colors.ink);
    doc.text('Scan to View Full Digital Tour & Info Packet', pageWidth / 2, 140, {
      align: 'center',
      maxWidth: contentWidth,
    });

    if (qrDataUrl) {
      const qrSize = Math.min(contentWidth, pageHeight * 0.52);
      const qrX = (pageWidth - qrSize) / 2;
      doc.addImage(qrDataUrl, getImageFormat(qrDataUrl), qrX, 190, qrSize, qrSize, undefined, 'FAST');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(colors.muted);
    const footerLines = doc.splitTextToSize(
      'Open the live Crown Page for the interactive digital tour, full info packet, contact actions, and the latest content.',
      contentWidth - 50
    );
    doc.text(footerLines, pageWidth / 2, pageHeight - 150, {
      align: 'center',
      maxWidth: contentWidth - 50,
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(colors.ink);
    doc.text(formatDisplayUrl(resolvedPageUrl), pageWidth / 2, pageHeight - 88, {
      align: 'center',
      maxWidth: contentWidth - 80,
    });

    const blob = doc.output('blob');
    const filename = `${resolvedTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'crown-page'}.pdf`;
    const file =
      typeof File !== 'undefined'
        ? new File([blob], filename, { type: 'application/pdf' })
        : null;

    return { blob, file, filename };
  };

  const downloadSummaryFile = async () => {
    const { blob, filename } = await createSummaryFile();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareSummaryFile = async (title: string, text?: string) => {
    const { file } = await createSummaryFile();

    if (
      file &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      'canShare' in navigator &&
      navigator.canShare?.({ files: [file] })
    ) {
      const payload: ShareData = {
        title,
        files: [file],
      };

      if (text?.trim()) {
        payload.text = text;
      }

      await navigator.share(payload);
      return true;
    }

    return false;
  };

  const copyText = async (value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Fall through to legacy clipboard path.
      }
    }

    return fallbackCopyText(value);
  };

  const openSmsComposer = async () => {
    await trackSaveAction('save_text_clicked', {
      mode: 'direct_open',
    });

    const lines = [resolvedTitle, resolvedPageUrl].filter(Boolean);
    const separator = platform.isIOS ? '&' : '?';
    const smsUrl = `sms:${separator}body=${encodeURIComponent(lines.join('\n\n'))}`;

    setIsOpen(false);
    window.location.href = smsUrl;
  };

  const handleOpen = async () => {
    setIsOpen(true);
    await trackSaveAction('save_opened');
  };

  const handleCopyLink = async () => {
    await trackSaveAction('save_copy_link_clicked');
    const copied = await copyText(resolvedPageUrl);
    if (copied) {
      toast.success('Link copied');
    } else {
      window.prompt('Copy this link', resolvedPageUrl);
      toast('Copy the link manually.');
    }
    setIsOpen(false);
  };

  const handleSaveToWallet = async () => {
    await trackSaveAction('save_wallet_clicked', {
      wallet_target: platform.isIOS ? 'apple' : platform.isAndroid ? 'google' : 'generic',
    });

    if (platform.isInApp) {
      saveToWallet(pageId, resolvedBusinessSlug, resolvedPageSlug);
      setIsOpen(false);
      return;
    }

    const walletPlatform = platform.isIOS
      ? 'ios'
      : platform.isAndroid
        ? 'android'
        : 'generic';

    const walletParams = new URLSearchParams({
      platform: walletPlatform,
      pageId,
      pageUrl: resolvedPageUrl,
      pageTitle: resolvedTitle,
      ...(resolvedPageSlug ? { pageSlug: resolvedPageSlug } : {}),
      ...(resolvedBusinessSlug ? { businessSlug: resolvedBusinessSlug } : {}),
      ...(businessName ? { businessName } : {}),
      ...(address ? { address } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(contactName ? { contactName } : {}),
      ...(heroImageUrl ? { heroImageUrl } : {}),
      ...(logoUrl ? { logoUrl } : {}),
    });

    let shouldFallbackToAppWallet = false;

    try {
      if (platform.isIOS) {
        const preflightResponse = await fetch('/api/wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode: 'preflight',
            platform: walletPlatform,
            pageId,
            pageUrl: resolvedPageUrl,
            pageTitle: resolvedTitle,
            pageSlug: resolvedPageSlug,
            businessSlug: resolvedBusinessSlug,
            businessName,
            address,
            phone,
            email,
            contactName,
            heroImageUrl,
            logoUrl,
          }),
        });

        if (!preflightResponse.ok) {
          const payload = (await preflightResponse.json().catch(() => null)) as WalletResponsePayload | null;
          console.warn('Wallet preflight failed:', payload?.error || preflightResponse.statusText);
          shouldFallbackToAppWallet = true;
          throw new Error(payload?.error || 'Wallet preflight failed');
        }

        const payload = (await preflightResponse.json()) as WalletResponsePayload;
        if (!payload?.ready) {
          shouldFallbackToAppWallet = true;
          throw new Error('Wallet preflight did not confirm readiness.');
        }

        setIsOpen(false);
        window.location.href = `/api/wallet?${walletParams.toString()}`;
        return;
      }

      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: walletPlatform,
          pageId,
          pageUrl: resolvedPageUrl,
          pageTitle: resolvedTitle,
          pageSlug: resolvedPageSlug,
          businessSlug: resolvedBusinessSlug,
          businessName,
          address,
          phone,
          email,
          contactName,
          heroImageUrl,
          logoUrl,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as WalletResponsePayload;
        if (payload?.platform === 'google' && payload?.saveUrl) {
          window.location.href = payload.saveUrl;
          setIsOpen(false);
          return;
        }
        shouldFallbackToAppWallet = true;
      } else {
        const payload = await response.json().catch(() => null);
        if (payload?.error) {
          console.warn(payload.error);
        }
        shouldFallbackToAppWallet = true;
      }
    } catch (error) {
      console.error('Wallet route error:', error);
      shouldFallbackToAppWallet = true;
    }

    if (shouldFallbackToAppWallet && (platform.isAppInstalled || platform.isInApp || resolvedBusinessSlug || resolvedPageSlug)) {
      toast('Opening your wallet.');
      saveToWallet(pageId, resolvedBusinessSlug, resolvedPageSlug);
    } else {
      toast('Save to Wallet is not available for this page right now.');
    }
    setIsOpen(false);
  };

  const handleSaveToDrive = async () => {
    await trackSaveAction('save_drive_clicked');
    const shared = await shareSummaryFile(`${resolvedTitle} brochure`).catch(() => false);

    if (!shared) {
      await downloadSummaryFile();
      window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener,noreferrer');
      toast('PDF downloaded. Use Drive to upload it.');
    }
    setIsOpen(false);
  };

  const handleSaveToFiles = async () => {
    await trackSaveAction('save_files_clicked');
    await downloadSummaryFile();
    toast('PDF downloaded.');
    setIsOpen(false);
  };

  const options = [
    {
      key: 'text',
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#65e36c_0%,#42c957_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_18px_rgba(66,201,87,0.2)]">
          <MessageCircleMore className="h-6 w-6 text-white" strokeWidth={2.2} />
        </div>
      ),
      title: 'Text it to Myself',
      onClick: openSmsComposer,
    },
    {
      key: 'drive',
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#77b7ff_0%,#4f8dff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_6px_18px_rgba(79,141,255,0.18)]">
          <Cloud className="h-6 w-6 text-white" strokeWidth={2.1} />
        </div>
      ),
      title: 'Share PDF',
      onClick: handleSaveToDrive,
    },
    {
      key: 'files',
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff8e8e_0%,#e24949_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_6px_18px_rgba(226,73,73,0.22)]">
          <Download className="h-6 w-6 text-white" strokeWidth={2.1} />
        </div>
      ),
      title: 'Download PDF',
      onClick: handleSaveToFiles,
    },
    {
      key: 'wallet',
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#2c2d31_0%,#141519_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_6px_18px_rgba(17,17,17,0.16)]">
          <Wallet className="h-6 w-6 text-[#f4d06c]" strokeWidth={2.1} />
        </div>
      ),
      title: walletLabel,
      onClick: handleSaveToWallet,
    },
    {
      key: 'copy',
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#eef2ff_0%,#dbe5ff_100%)] shadow-[inset_0_0_0_1px_rgba(46,82,204,0.12),0_6px_18px_rgba(59,91,219,0.12)]">
          <Link2 className="h-5 w-5 text-[#3451c6]" strokeWidth={2.25} />
        </div>
      ),
      title: 'Copy Link',
      onClick: handleCopyLink,
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`group flex items-center justify-center text-black ${className} ${triggerClassName}`}
        aria-label="Save this page for later"
      >
        <span className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.08)] ring-1 ring-black/5 backdrop-blur-sm transition-all duration-200 group-hover:scale-[1.02] group-hover:bg-white">
          <Bookmark className="h-[25px] w-[25px] text-[#1f2b6c]" strokeWidth={2} />
        </span>
      </button>

      {isMounted && isOpen
        ? createPortal(
            <div className="fixed inset-0 z-[1000]">
              <button
                type="button"
                className="absolute inset-0 bg-black/38 backdrop-blur-[3px]"
                onClick={() => setIsOpen(false)}
                aria-label="Close save sheet"
              />

              <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[84vh] w-full max-w-[440px] flex-col rounded-t-[32px] bg-white px-5 pb-5 pt-3 shadow-[0_-12px_44px_rgba(0,0,0,0.18)]">
                <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-[#dbdde2]" />

                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-gray-950">
                      Save this page for later
                    </h2>
                    <p className="mt-1 max-w-[300px] text-[15px] leading-5 text-gray-500">
                      Keep the details, link, and contact info close at hand.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f7] text-[#7d7d80] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pb-1">
                  <div className="overflow-hidden rounded-[22px] border border-[#e6e7eb] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    {options.map((option, index) => {
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={option.onClick}
                          className={`flex w-full items-center gap-4 px-5 py-[16px] text-left transition-colors hover:bg-gray-50 ${
                            index < options.length - 1 ? 'border-b border-gray-200' : ''
                          }`}
                        >
                    {option.icon}
                    <div className="min-w-0 flex-1 text-[17px] font-semibold tracking-[-0.02em] text-gray-950">
                      {option.title}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-5 w-full rounded-[18px] bg-[#f5f5f7] px-4 py-[14px] text-[18px] font-medium text-[#2f4fc8] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
              </div>

            </div>,
            document.body
          )
        : null}
    </>
  );
}
