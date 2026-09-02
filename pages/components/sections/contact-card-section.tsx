'use client';

import React, { useState } from 'react';
import { UserPlus, Check, User as UserIcon } from 'lucide-react';
import { SectionStyles } from '@crown-pages/types';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';

interface ContactCardData {
  // Support both naming conventions (mobile app uses contactName, renderer uses name)
  name?: string;
  contactName?: string;
  role?: string;
  contactRole?: string;
  imageUrl?: string;
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  communityName?: string;
}

interface ContactCardSectionProps {
  data: ContactCardData;
  styles?: SectionStyles;
  pageId?: string;
  sectionId?: string;
  companyHeaderAddress?: string;
  forceMobileLayout?: boolean;
}

export const ContactCardSection: React.FC<ContactCardSectionProps> = ({
  data,
  styles,
  pageId,
  sectionId,
  companyHeaderAddress,
  forceMobileLayout = false,
}) => {
  // Support both naming conventions (mobile app uses contactName, renderer uses name)
  const name = data?.name || data?.contactName;
  const role = data?.role || data?.contactRole;
  const imageUrl = data?.imageUrl || data?.logo;
  const phone = data?.phone;
  const email = data?.email;
  const address = data?.address;
  
  const [isContactSaved, setIsContactSaved] = useState(false);
  const saveContactButtonStyle = isContactSaved
    ? undefined
    : {
        borderColor: '#0f4fb3',
        background: 'linear-gradient(180deg, #ffffff 0%, #edf4ff 100%)',
      };

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    // Convert storage path to full URL
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${url}`;
  };

  const fullImageUrl = getImageUrl(imageUrl);

  // Loads the image onto a canvas, scales it down so the longest side is ≤500px,
  // then exports as compressed JPEG. Returns null on any failure (CORS, unsupported
  // format like HEIC, load error, etc.)
  const getCompressedBase64FromUrl = async (url: string): Promise<string | null> => {
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

  const handleSaveContact = async () => {
    if (pageId && sectionId) {
      trackEvent({
        pageId,
        eventType: 'save_contact',
        eventData: {
          section_id: sectionId,
          contact_name: name,
          contact_role: role,
          section_type: 'contactCard',
        },
      }).catch((error) => {
        console.error('Failed to track save contact event:', error);
      });
    }

    // Use companyHeaderAddress as the primary address, fall back to contact's address
    // Collapse newlines/extra whitespace — raw newlines inside a vCard field break parsing
    const rawAddress = companyHeaderAddress || address;
    const finalAddress = rawAddress?.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${name}`,
      `N:${name};;;;`,
      role ? `TITLE:${role}` : '',
      phone ? `TEL;TYPE=WORK,VOICE:${phone}` : '',
      email ? `EMAIL:${email}` : '',
      finalAddress ? `ADR:;;${finalAddress};;;` : '',
    ];

    // Compress and embed photo: scales to max 500px longest side, exports as JPEG ~0.8 quality
    // Falls back to no photo if CORS blocks canvas export or image fails to load
    if (fullImageUrl) {
      try {
        const base64Photo = await getCompressedBase64FromUrl(fullImageUrl);
        if (base64Photo) {
          vCardLines.push(`PHOTO;ENCODING=BASE64;TYPE=JPEG:${base64Photo}`);
        }
      } catch (error) {
        console.error('Failed to add photo to vCard:', error);
      }
    }

    vCardLines.push('END:VCARD');

    const vCard = vCardLines.filter(Boolean).join('\n');

    // Create and download the vCard
    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(name || 'contact').replace(/\s+/g, '_')}.vcf`;
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

  // Don't render if no name is provided
  if (!name) {
    console.warn('ContactCardSection: No name provided in data');
    return null;
  }

  return (
    <section
      className={forceMobileLayout ? "py-1 my-2" : "py-1 my-3"}
      style={{
        backgroundColor: styles?.background || 'transparent',
      }}
    >
      <div
        className={`page-shell-panel overflow-hidden rounded-[30px] ${
          forceMobileLayout ? "px-5 py-5" : "px-5 py-5 md:px-7 md:py-6"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Contact Image - Rounded rectangle */}
          {fullImageUrl ? (
            <div
              className={`relative flex-shrink-0 overflow-hidden rounded-[24px] ring-1 ring-slate-200/70 ${
                forceMobileLayout ? "mr-1.5 h-[86px] w-[86px]" : "mr-1.5 h-[86px] w-[86px] md:mr-3 md:h-[106px] md:w-[106px]"
              }`}
            >
              <Image
                src={fullImageUrl}
                alt={name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div
              className={`mr-1.5 flex flex-shrink-0 items-center justify-center rounded-[24px] bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200/70 ${
                forceMobileLayout ? "h-[86px] w-[86px]" : "h-[86px] w-[86px] md:mr-3 md:h-[106px] md:w-[106px]"
              }`}
            >
              <UserIcon className={forceMobileLayout ? "h-8 w-8 text-slate-400" : "h-8 w-8 text-slate-400 md:h-10 md:w-10"} />
            </div>
          )}

          {/* Contact Info */}
          <div className={`min-w-0 flex-1 ${forceMobileLayout ? "pr-2" : "pr-2 md:pr-3"}`}>
            <h3
              className={`font-semibold leading-tight tracking-[-0.03em] text-slate-950 ${
                forceMobileLayout ? "text-[1.06rem]" : "text-[1.06rem] md:text-[1.4rem]"
              }`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {name}
            </h3>
            {role && (
              <p
                className={`mt-1 leading-snug text-slate-500 ${
                  forceMobileLayout ? "text-[0.88rem]" : "text-[0.88rem] md:text-[0.98rem]"
                }`}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {role}
              </p>
            )}
          </div>

          {/* Save Contact Button */}
          <button
            onClick={handleSaveContact}
            style={saveContactButtonStyle}
            className={`ml-2 flex shrink-0 items-center justify-center rounded-full border-2 px-3 shadow-sm transition-all ${
              forceMobileLayout ? "h-[50px] w-[122px]" : "h-[50px] w-[122px] md:h-[56px] md:w-[148px] md:px-4"
            } ${
              isContactSaved
                ? 'border-slate-900 bg-slate-900'
                : 'text-[#1b2431] hover:-translate-y-0.5'
            }`}
          >
            {isContactSaved ? (
              <Check size={18} className="shrink-0 text-white" />
            ) : (
              <UserPlus size={17} className="shrink-0 text-[#0f4fb3]" />
            )}
            <span className={`ml-1.5 whitespace-nowrap font-semibold ${
              forceMobileLayout ? "text-[0.8rem]" : "text-[0.8rem] md:ml-2 md:text-[0.9rem]"
            } ${
              isContactSaved ? 'text-white' : 'text-[#1b2431]'
            }`}>
              {isContactSaved ? 'Saved' : 'Save Contact'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
