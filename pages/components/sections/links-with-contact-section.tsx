'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BusinessData } from '@crown-pages/types';
import { useTheme, useContactModal } from '../enhanced-page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles } from '@/types';
import Image from 'next/image';
import { 
  ChevronRight, 
  ExternalLink, 
  Globe, 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Youtube, 
  FileText, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Handshake,
  Link as LinkIcon,
  LucideIcon,
  UserPlus,
  Check,
  Home,
  Heart,
  ImageIcon,
  ListChecks,
  Video,
  Utensils
} from 'lucide-react';
import { DocumentViewerModal } from '../document-viewer-modal';
import { ConnectRequestModal } from '../page-engagement-actions';
import { trackEvent } from '@/lib/analytics';

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail?: string;
}

interface LinkItem {
  id: string;
  title: string;
  url?: string;
  icon?: string;
  image?: string;
  thumbnail?: string;
  mediaItems?: MediaItem[];
}

interface ContactData {
  contactName?: string;
  contactRole?: string;
  phone?: string;
  email?: string;
  link?: string;
  logo?: string;
  fax?: string;
  personalPhone?: string;
  communityName?: string;
  address?: string;
  contactImageUrl?: string;
}

interface LinksWithContactData {
  title?: string;
  links: LinkItem[];
  contactButton?: {
    enabled?: boolean;
    contactData?: ContactData;
  };
  // Direct contact fields (new approach)
  contactName?: string;
  contactRole?: string;
  contactPhone?: string;
  contactPhone2?: string;
  contactEmail?: string;
  contactFax?: string;
  contactWebsite?: string;
  contactImageUrl?: string;
}

interface LinksWithContactSectionProps {
  data: LinksWithContactData;
  business?: BusinessData;
  pageId?: string;
  pageTitle?: string;
  sectionId?: string;
  styles?: SectionStyles;
  referralSafeHref?: string;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
};

const isSupabaseFile = (url?: string) => {
  if (!url) return false;
  // Check if it's a Supabase storage URL or a relative path (which we convert to Supabase)
  return !url.startsWith('http://') && !url.startsWith('https://');
};

const getFullFileUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${url}`;
};

// Map icon names to Lucide React icons
const getIconComponent = (iconName?: string): LucideIcon => {
  if (!iconName) return LinkIcon;
  
  const iconMap: { [key: string]: LucideIcon } = {
    'web': Globe,
    'website': Globe,
    'globe': Globe,
    'globe-outline': Globe,
    'instagram': Instagram,
    'logo-instagram': Instagram,
    'facebook': Facebook,
    'logo-facebook': Facebook,
    'twitter': Twitter,
    'logo-twitter': Twitter,
    'linkedin': Linkedin,
    'logo-linkedin': Linkedin,
    'youtube': Youtube,
    'logo-youtube': Youtube,
    'file-pdf-box': FileText,
    'pdf': FileText,
    'file': FileText,
    'document': FileText,
    'document-outline': FileText,
    'floor-plans': FileText,
    'list': ListChecks,
    'list-checks': ListChecks,
    'amenities': ListChecks,
    'home': Home,
    'house': Home,
    'heart': Heart,
    'heart-outline': Heart,
    'image': ImageIcon,
    'photo': ImageIcon,
    'gallery': ImageIcon,
    'video': Video,
    'videocam': Video,
    'restaurant': Utensils,
    'dining': Utensils,
    'email': Mail,
    'mail': Mail,
    'mail-outline': Mail,
    'phone': Phone,
    'call': Phone,
    'call-outline': Phone,
    'location': MapPin,
    'map': MapPin,
    'location-outline': MapPin,
    'map-outline': MapPin,
    'calendar': Calendar,
    'calendar-outline': Calendar,
    'link': LinkIcon,
    'link-outline': LinkIcon,
  };
  
  const lowerIconName = iconName.toLowerCase();
  return iconMap[lowerIconName] || LinkIcon;
};

export function LinksWithContactSection({ data, business, pageId, pageTitle, sectionId, styles, referralSafeHref }: LinksWithContactSectionProps) {
  const { title, links, contactButton, contactName, contactRole, contactPhone, contactPhone2, contactEmail, contactFax, contactWebsite, contactImageUrl } = data;
  const displayTitle = title && title.trim() !== '' ? title : 'Pages';
  const theme = useTheme();
  const { openContactModal, contactCardData } = useContactModal();

  // DEBUG: Log the incoming data
  console.log('🔍 LinksWithContactSection data:', { contactName, contactRole, contactPhone, contactPhone2, contactEmail, contactFax, contactWebsite, contactImageUrl, fullData: data });

  // Local modal state for backward compatibility with old pages
  const [localModalVisible, setLocalModalVisible] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [isContactSaved, setIsContactSaved] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);

  // Lock body scroll while contact drawer is open
  useEffect(() => {
    if (localModalVisible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [localModalVisible]);
  
  // Document viewer modal state
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<{
    url: string;
    title: string;
    thumbnail?: string;
    mediaItems?: { id: string; type: 'photo' | 'video'; url: string; thumbnail?: string | null }[];
  } | null>(null);

  // Build contact data from direct fields (new split-view approach)
  const directContactData = (contactName || contactPhone || contactEmail) ? {
    contactName,
    contactRole,
    phone: contactPhone,
    personalPhone: contactPhone2,
    email: contactEmail,
    fax: contactFax,
    link: contactWebsite,
    contactImageUrl,
  } : null;
  
  console.log('🔍 directContactData:', directContactData);

  // Support both old (contactButton in section data) and new (contactCard section) approaches
  // Priority: direct fields (section-specific) > contactButton > contactCard (global fallback)
  const useDirectFields = directContactData !== null;
  const useOldApproach = !useDirectFields && contactButton?.contactData && Object.keys(contactButton.contactData).length > 0;
  const useNewApproach = !useDirectFields && !useOldApproach && contactCardData && Object.keys(contactCardData).length > 0;

  console.log('🔍 Modal logic:', { useNewApproach, useDirectFields, useOldApproach, contactCardData });

  // For the contact button in this section, ONLY use section-specific data
  // Do NOT fall back to global contactCardData - that's for the header contact card
  const sectionContactData = directContactData || contactButton?.contactData;
  const showContactButton = (() => {
    if (referralSafeHref) return true;
    // No section-specific contact data? Don't show button
    if (!sectionContactData || Object.keys(sectionContactData).length === 0) {
      return false;
    }
    
    // If using direct fields (new approach), always show if data exists
    if (useDirectFields) {
      return true;
    }
    
    // If using old contactButton approach, respect the enabled flag
    if (useOldApproach) {
      return contactButton?.enabled !== false;
    }
    
    return false;
  })();

  // For modal display, we can fall back to global contactCardData if needed
  const effectiveContactData = directContactData || contactButton?.contactData || contactCardData;

  const handleContactClick = () => {
    if (pageId && sectionId) {
      trackEvent({
        pageId,
        eventType: 'contact_open',
        eventData: { section_type: 'linksWithContact', section_id: sectionId },
      }).catch(() => {});
    }
    if (useDirectFields || useOldApproach) {
      setLocalModalVisible(true);
      setIsAnimatingIn(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(true);
        });
      });
    } else if (useNewApproach) {
      openContactModal();
    }
  };

  const handleCloseModal = () => {
    setIsAnimatingIn(false);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setLocalModalVisible(false);
      setIsContactSaved(false); // Reset save state when modal closes
    }, 300);
  };

  // Loads the image onto a canvas, scales it down so the longest side is ≤500px,
  // then exports as compressed JPEG. Returns null on any failure (CORS, unsupported
  // format like HEIC, load error, etc.)
  const getBase64FromUrl = async (url: string): Promise<string | null> => {
    // Check content-type before attempting canvas — HEIC/HEIF and other non-web formats
    // can't be reliably drawn to canvas and exported
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const contentType = head.headers.get('content-type') ?? '';
      const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!supported.some((t) => contentType.startsWith(t))) return null;
    } catch {
      return null;
    }

    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const MAX = 500;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) {
            height = Math.round((height / width) * MAX);
            width = MAX;
          } else {
            width = Math.round((width / height) * MAX);
            height = MAX;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl.split(',')[1]);
        } catch {
          // Canvas tainted by cross-origin image without CORS headers
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Handle save contact - generates vCard with photo
  const handleSaveContact = async () => {
    if (!effectiveContactData) return;

    if (pageId && sectionId) {
      trackEvent({
        pageId,
        eventType: 'save_contact',
        eventData: {
          section_id: sectionId,
          contact_name: effectiveContactData.contactName,
          contact_role: effectiveContactData.contactRole,
          section_type: 'linksWithContact',
        },
      }).catch(() => {});
    }

    // Build vCard with photo if available
    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      effectiveContactData.contactName ? `FN:${effectiveContactData.contactName}` : '',
      effectiveContactData.contactRole ? `TITLE:${effectiveContactData.contactRole}` : '',
      effectiveContactData.phone ? `TEL;TYPE=WORK,VOICE:${effectiveContactData.phone}` : '',
      effectiveContactData.personalPhone ? `TEL;TYPE=CELL:${effectiveContactData.personalPhone}` : '',
      effectiveContactData.email ? `EMAIL:${effectiveContactData.email}` : '',
      effectiveContactData.fax ? `TEL;TYPE=FAX:${effectiveContactData.fax}` : '',
      effectiveContactData.link ? `URL:${effectiveContactData.link.startsWith('http') ? effectiveContactData.link : `https://${effectiveContactData.link}`}` : '',
      effectiveContactData.address ? `ADR:;;${effectiveContactData.address.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()};;;` : '',
    ];

    // Compress and embed photo: scales to max 500px longest side, exports as JPEG ~0.8 quality
    // Falls back to no photo if CORS blocks canvas export or image fails to load
    if (effectiveContactData.contactImageUrl) {
      const fullImageUrl = getImageUrl(effectiveContactData.contactImageUrl);
      if (fullImageUrl) {
        try {
          const base64Photo = await getBase64FromUrl(fullImageUrl);
          if (base64Photo) {
            vCardLines.push(`PHOTO;ENCODING=BASE64;TYPE=JPEG:${base64Photo}`);
          }
        } catch (error) {
          console.error('Failed to add photo to vCard:', error);
        }
      }
    }

    vCardLines.push('END:VCARD');

    const vCard = vCardLines.filter(Boolean).join('\n');

    // Create and download the vCard
    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = effectiveContactData.contactName 
      ? `${effectiveContactData.contactName.replace(/\s+/g, '_')}.vcf`
      : 'contact.vcf';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Update save state to show "Saved"
    setIsContactSaved(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setIsContactSaved(false);
    }, 3000);
  };

  const handleLinkClick = (link: LinkItem, e: React.MouseEvent) => {
    // If the link has a media stack, open the stack viewer regardless of url
    if (link.mediaItems && link.mediaItems.length > 0) {
      e.preventDefault();
      if (pageId) {
        trackEvent({
          pageId,
          eventType: 'media_click',
          eventData: { section_type: 'linksWithContact', section_id: sectionId, link_title: link.title },
        }).catch(() => {});
      }
      setCurrentDocument({ url: '', title: link.title, mediaItems: link.mediaItems });
      setDocumentViewerOpen(true);
      return;
    }

    if (!link.url) return;

    // If it's a Supabase file, open in modal viewer
    if (isSupabaseFile(link.url)) {
      e.preventDefault();
      const thumbUrl = link.thumbnail ? getFullFileUrl(link.thumbnail) : undefined;
      setCurrentDocument({ url: getFullFileUrl(link.url), title: link.title, thumbnail: thumbUrl });
      setDocumentViewerOpen(true);
    }
    // Otherwise, let the TrackableButton handle it (opens in new tab)
  };

  // Filter out empty links
  const validLinks = (links || []).filter(
    (link) => link.title && link.title.trim() !== ''
  );

  // Check if we have any content to display (links OR contact button)
  const hasLinks = validLinks.length > 0;
  const hasContact = showContactButton;

  // If neither links nor contact button, don't render anything
  if (!hasLinks && !hasContact) {
    return null;
  }

  return (
    <>
      <section
        className="py-4 md:py-8 lg:py-10"
        style={{ backgroundColor: styles?.background || 'transparent' }}
      >
        <div className="page-shell-panel overflow-hidden rounded-[32px] px-7 py-7 md:px-10 md:py-9">
          {/* Pages Section (Formerly Links), uses LinkswithContact which is legacy spaghetti code*/}
          {hasLinks && (
            <div>
              {/* Header */}
              <div className="mb-5 md:mb-7">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black">
                  {displayTitle}
                </h2>
              </div>

              <div className="bg-transparent">
                {validLinks.map((link, index) => {
              const isLast = index === validLinks.length - 1;
              const fullImageUrl = getImageUrl(link.image);
              const IconComponent = getIconComponent(link.icon);

              const linkContent = (
                <div
                  className={`flex items-center justify-between px-1 py-4 md:px-2 md:py-5 ${
                    !isLast ? 'border-b border-slate-200/85' : ''
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <div className="mr-4 flex h-[58px] w-[58px] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200/80">
                      {fullImageUrl ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={fullImageUrl}
                            alt={link.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <IconComponent className="h-6 w-6 text-slate-600" />
                      )}
                    </div>

                    {/* Title */}
                    <span className="text-[1.05rem] font-bold text-slate-950">
                      {link.title}
                    </span>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
                </div>
              );

              // Build the clickable row
              // Media-stack links and file links open the viewer modal; external links open in new tab
              const hasMediaStack = (link.mediaItems || []).length > 0;
              const isClickable = link.url?.trim() || hasMediaStack;

              let linkRow: React.ReactNode;
              if (isClickable) {
                if (!hasMediaStack && link.url && !isSupabaseFile(link.url) && pageId && sectionId) {
                  // External URL — use TrackableButton so analytics fires
                  linkRow = (
                    <TrackableButton
                      href={link.url}
                      pageId={pageId}
                      sectionId={sectionId}
                      eventType="link_click"
                      eventData={{ link_title: link.title, link_url: link.url, section_type: 'links_with_contact' }}
                      className="block cursor-pointer"
                      target="_blank"
                      onClick={(e) => handleLinkClick(link, e)}
                    >
                      {linkContent}
                    </TrackableButton>
                  );
                } else {
                  // File / media-stack: modal opens via onClick
                  linkRow = (
                    <button
                      type="button"
                      className="block w-full text-left cursor-pointer"
                      onClick={(e) => handleLinkClick(link, e)}
                    >
                      {linkContent}
                    </button>
                  );
                }
              } else {
                linkRow = <div>{linkContent}</div>;
              }

              return (
                <React.Fragment key={link.id}>
                  {linkRow}
                </React.Fragment>
              );
              })}
              </div>
            </div>
          )}

          {/* Contact Button */}
          {showContactButton && (
            <div className="mt-6 mb-[20px] md:mb-2">
              {referralSafeHref ? (
                <Link
                  href={referralSafeHref}
                  className="block w-full rounded-full px-6 py-4 text-center text-lg font-semibold text-white shadow-[0_22px_44px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_48px_rgba(15,23,42,0.16)]"
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
                  }}
                >
                  Contact
                </Link>
              ) : (
                <button
                  onClick={handleContactClick}
                  className="w-full rounded-full px-6 py-4 text-lg font-semibold text-white shadow-[0_22px_44px_rgba(15,23,42,0.14)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_48px_rgba(15,23,42,0.16)]"
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
                  }}
                >
                  Contact
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Local Modal for section-specific contact data - ALWAYS RENDERED for smooth animations */}
      {!referralSafeHref && (useDirectFields || useOldApproach) && effectiveContactData ? (
        <>
        {console.log('🔍 RENDERING LOCAL MODAL with data:', effectiveContactData, 'visible:', localModalVisible, 'animating:', isAnimatingIn)}
        <div
          className={`fixed inset-0 flex items-end justify-center z-[999999] transition-all duration-300 ease-out ${
            localModalVisible && isAnimatingIn ? 'bg-black/50 pointer-events-auto' : 'bg-black/0 pointer-events-none'
          }`}
          onClick={handleCloseModal}
        >
          <div
            className={`bg-white w-full max-w-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto overscroll-contain transition-all duration-300 ease-out ${
              localModalVisible && isAnimatingIn ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-20">
              <h3 className="text-xl font-bold text-black">Contact Information</h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contact Image - Sticky below header */}
            {effectiveContactData.contactImageUrl && (
              <div className="sticky top-[73px] bg-white pt-4 pb-2 px-6 flex justify-center z-10 border-b border-gray-100">
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                  <Image
                    src={getImageUrl(effectiveContactData.contactImageUrl) || ''}
                    alt={effectiveContactData.contactName || 'Contact'}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Modal Content */}
            <div className="p-6">

              {/* Contact Name & Role */}
              {effectiveContactData.contactName && (
                <div className="text-center mb-6">
                  <h4 className="text-2xl font-bold text-black mb-1">
                    {effectiveContactData.contactName}
                  </h4>
                  {effectiveContactData.contactRole && (
                    <p className="text-lg text-gray-600">
                      {effectiveContactData.contactRole}
                    </p>
                  )}
                </div>
              )}

              {/* Community Name */}
              {effectiveContactData.communityName && (
                <div className="mb-6">
                  <p className="text-center text-gray-700 font-medium">
                    {effectiveContactData.communityName}
                  </p>
                </div>
              )}

              {/* Contact Details - Matching Figma design */}
              <div className="space-y-3">
                {effectiveContactData.phone && pageId && sectionId && (
                  <TrackableButton
                    href={`tel:${effectiveContactData.phone}`}
                    pageId={pageId}
                    sectionId={sectionId}
                    eventType="phone_click"
                    eventData={{
                      phone_number: effectiveContactData.phone,
                      phone_type: 'main_office',
                      section_type: 'links_with_contact',
                      source: 'contact_modal'
                    }}
                    className="block"
                  >
                    <div className="flex items-center justify-between py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Main Office</p>
                          <span className="text-base text-[#1a5490] hover:underline font-semibold">
                            {effectiveContactData.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TrackableButton>
                )}

                {effectiveContactData.personalPhone && pageId && sectionId && (
                  <TrackableButton
                    href={`tel:${effectiveContactData.personalPhone}`}
                    pageId={pageId}
                    sectionId={sectionId}
                    eventType="phone_click"
                    eventData={{
                      phone_number: effectiveContactData.personalPhone,
                      phone_type: 'personal',
                      section_type: 'links_with_contact',
                      source: 'contact_modal'
                    }}
                    className="block"
                  >
                    <div className="flex items-center justify-between py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Personal</p>
                          <span className="text-base text-[#1a5490] hover:underline font-semibold">
                            {effectiveContactData.personalPhone}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TrackableButton>
                )}

                {effectiveContactData.email && pageId && sectionId && (
                  <TrackableButton
                    href={`mailto:${effectiveContactData.email}`}
                    pageId={pageId}
                    sectionId={sectionId}
                    eventType="email_click"
                    eventData={{
                      email: effectiveContactData.email,
                      section_type: 'links_with_contact',
                      source: 'contact_modal'
                    }}
                    className="block"
                  >
                    <div className="flex items-center justify-between py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Email</p>
                          <span className="text-base text-[#1a5490] hover:underline font-semibold break-all">
                            {effectiveContactData.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TrackableButton>
                )}

                {effectiveContactData.fax && (
                  <div className="flex items-center justify-between py-3 px-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Fax</p>
                        <p className="text-base text-[#1a5490] font-semibold">{effectiveContactData.fax}</p>
                      </div>
                    </div>
                  </div>
                )}

                {effectiveContactData.link && pageId && sectionId && (
                  <TrackableButton
                    href={(effectiveContactData.link.trim().startsWith('http://') || effectiveContactData.link.trim().startsWith('https://')) ? effectiveContactData.link.trim() : `https://${effectiveContactData.link.trim()}`}
                    pageId={pageId}
                    sectionId={sectionId}
                    eventType="link_click"
                    eventData={{
                      website_url: effectiveContactData.link,
                      section_type: 'links_with_contact',
                      source: 'contact_modal'
                    }}
                    className="block"
                    target="_blank"
                  >
                    <div className="flex items-center justify-between py-3 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium">Website</p>
                          <span className="text-base text-[#1a5490] hover:underline font-semibold break-all">
                            {effectiveContactData.link}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TrackableButton>
                )}

                {effectiveContactData.address && (
                  <div className="py-3 px-4 bg-white border border-gray-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium mb-1">Address</p>
                        <p className="text-base text-[#1a5490] font-semibold">{effectiveContactData.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Contact Button */}
              <div className="mt-6">
                <button
                  onClick={handleSaveContact}
                  className={`w-full flex items-center justify-center gap-2 border rounded-lg px-4 py-3 transition-all ${
                    isContactSaved
                      ? 'bg-black border-black'
                      : 'border-[#0f4fb3] text-[#1b2431] hover:-translate-y-0.5'
                  }`}
                  style={{
                    borderWidth: isContactSaved ? '1.5px' : '2px',
                    background: isContactSaved
                      ? undefined
                      : 'linear-gradient(180deg, #ffffff 0%, #edf4ff 100%)',
                  }}
                >
                  {isContactSaved ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span className="font-semibold text-base text-white">
                        Saved to Contacts
                      </span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 text-[#0f4fb3]" />
                      <span className="font-semibold text-base text-[#1b2431]">
                        Save Contact
                      </span>
                    </>
                  )}
                </button>
                {pageId && (
                  <button
                    onClick={() => setConnectModalOpen(true)}
                    className="mt-3 w-full flex items-center justify-center gap-2 border rounded-lg px-4 py-3 transition-all border-[#0f4fb3] text-[#1b2431]"
                    style={{
                      borderWidth: '2px',
                      background: 'linear-gradient(180deg, #ffffff 0%, #edf4ff 100%)',
                    }}
                  >
                    <Handshake className="w-5 h-5 text-[#0f4fb3]" />
                    <span className="font-semibold text-base text-[#1b2431]">
                      Connect
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      ) : null}

      {pageId && !referralSafeHref && (
        <ConnectRequestModal
          isOpen={connectModalOpen}
          onClose={() => setConnectModalOpen(false)}
          pageId={pageId}
          pageTitle={pageTitle || business?.name || 'this page'}
        />
      )}

      {/* Document Viewer Modal */}
      {currentDocument && (
        <DocumentViewerModal
          isOpen={documentViewerOpen}
          onClose={() => {
            setDocumentViewerOpen(false);
            setCurrentDocument(null);
          }}
          fileUrl={currentDocument.url}
          fileName={currentDocument.title}
          thumbnail={currentDocument.thumbnail}
          mediaItems={currentDocument.mediaItems}
        />
      )}
    </>
  );
}
