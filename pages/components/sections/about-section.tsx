'use client';

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { BusinessData } from '@crown-pages/types';
import { useTheme } from "../page-renderer";
import { SectionStyles } from "@/types";
import { generatePublicUrl } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AboutData {
  title?: string;
  content: string;
  image?: string;
}

interface AboutSectionProps {
  data: AboutData;
  business?: BusinessData;
  pageId?: string;
  sectionId?: string;
  styles?: SectionStyles;
}

export function AboutSection({ data, styles, pageId, sectionId }: AboutSectionProps) {
  const { title = 'About', content, image } = data;

  const theme = useTheme();
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

  // Strip HTML tags for character count (client-side safe)
  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') {
      // Server-side: use simple regex fallback
      return html.replace(/<[^>]*>/g, '');
    }
    // Client-side: use DOM
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const plainTextContent = stripHtml(content || '');
  const truncatedContent = plainTextContent.length > 150
    ? plainTextContent.slice(0, 150) + '...'
    : plainTextContent;

  useEffect(() => {
    let isMounted = true;
    if (image) {
      generatePublicUrl(image).then((url) => {
        if (isMounted) setBgUrl(url || null);
      });
    } else {
      setBgUrl(null);
    }

    return () => { isMounted = false; };
  }, [image]);

  return (
    <section className="py-4 md:py-8 lg:py-10 px-4" style={{ backgroundColor: styles?.background || '#fff' }}>
      <div className="max-w-5xl mx-auto">
        <div
          className={`${
            image ? "grid md:grid-cols-2 gap-6 md:gap-8 lg:gap-12" : ""
          }`}
        >
          {bgUrl && (
            <div className="order-2 md:order-1">
              <Image
                src={bgUrl}
                alt={title}
                width={600}
                height={400}
                className="w-full h-[200px] md:h-[300px] lg:h-[400px] object-cover rounded-xl shadow-md"
                unoptimized
              />
            </div>
          )}

          <div className={`${image ? "order-1 md:order-2" : ""}`}>
            <h2
              className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6"
              style={{
                color: styles?.text?.primary || theme.text.primary,
              }}
            >
              {title}
            </h2>
            <p
              className="text-base md:text-lg leading-6 md:leading-7 lg:leading-8"
              style={{
                color: styles?.text?.secondary || theme.text.secondary,
              }}
            >
              {showFullContent ? plainTextContent : truncatedContent}
            </p>

            {plainTextContent.length > 150 && (
                <button
                onClick={() => {
                  setShowFullContent(!showFullContent);
                  if (!showFullContent && pageId) {
                    trackEvent({ pageId, eventType: 'button_click', eventData: { action: 'read_more', section_type: 'about', section_id: sectionId } });
                  }
                }}
                className="flex items-center gap-1 md:gap-2 mt-4 md:mt-6 ml-auto hover:opacity-70 transition-opacity"
              >
                <span className="text-base md:text-lg font-bold text-black">
                  {showFullContent ? 'Read Less' : 'Read More'}
                </span>
                {showFullContent ? (
                  <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-black" />
                ) : (
                  <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-black" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
