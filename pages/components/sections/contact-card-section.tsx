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
}

export const ContactCardSection: React.FC<ContactCardSectionProps> = ({
  data,
  styles,
  pageId,
  sectionId,
  companyHeaderAddress,
}) => {
  // Support both naming conventions (mobile app uses contactName, renderer uses name)
  const name = data?.name || data?.contactName;
  const role = data?.role || data?.contactRole;
  const imageUrl = data?.imageUrl || data?.logo;
  const phone = data?.phone;
  const email = data?.email;
  const address = data?.address;
  
  const [isContactSaved, setIsContactSaved] = useState(false);

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
      className="py-0 my-2.5"
      style={{
        backgroundColor: styles?.background || '#fff',
      }}
    >
      <div className="max-w-5xl mx-auto px-4">
        {/* Horizontal layout: image | name/role | Save Contact button */}
        <div className="flex items-center justify-between">
          {/* Contact Image - Rounded rectangle */}
          {fullImageUrl ? (
            <div className="relative w-[80px] h-[80px] md:w-[100px] md:h-[100px] mr-3 md:mr-4 flex-shrink-0">
              <Image
                src={fullImageUrl}
                alt={name}
                fill
                className="object-cover rounded-xl"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] mr-3 md:mr-4 flex-shrink-0 bg-gray-100 rounded-xl flex items-center justify-center">
              <UserIcon className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
            </div>
          )}

          {/* Contact Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-black">
              {name}
            </h3>
            {role && (
              <p className="text-base md:text-lg text-gray-600">
                {role}
              </p>
            )}
          </div>

          {/* Save Contact Button */}
          <button
            onClick={handleSaveContact}
            className={`flex items-center border rounded-lg px-3 md:px-4 py-2 md:py-2.5 transition-all ${
              isContactSaved
                ? 'bg-black border-black'
                : 'bg-white border-[#c5c3c3]'
            }`}
            style={{
              borderWidth: '1.5px',
            }}
          >
            {isContactSaved ? (
              <Check className="w-5 h-5 md:w-6 md:h-6 text-white" />
            ) : (
              <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-black" />
            )}
            <span className={`ml-1.5 md:ml-2 font-semibold text-sm md:text-base ${
              isContactSaved ? 'text-white' : 'text-black'
            }`}>
              {isContactSaved ? 'Saved' : 'Save Contact'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
