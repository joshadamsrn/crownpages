'use client';

import React from 'react';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles } from '@/types';
import Image from 'next/image';
import { ChevronRight, ExternalLink } from 'lucide-react';

interface LinkItem {
  id: string;
  title: string;
  url?: string;
  icon?: string;
  image?: string;
}

interface LinksData {
  title?: string;
  description?: string;
  links: LinkItem[];
  render_type?: 'vertical' | 'horizontal' | 'masonry';
}

interface LinksSectionProps {
  data: LinksData;
  business?: BusinessData;
  pageId?: string;
  sectionId?: string;
  styles?: SectionStyles;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
};

export function LinksSection({ data, business, pageId, sectionId, styles }: LinksSectionProps) {
  const { title, links } = data;
  const displayTitle = title && title.trim() !== '' ? title : 'Links';
  const theme = useTheme();

  if (!links || links.length === 0) {
    return null;
  }

  // Filter out empty links
  const validLinks = links.filter(
    (link) => link.title && link.title.trim() !== ''
  );

  if (validLinks.length === 0) {
    return null;
  }

  return (
    <section
      className="py-8 md:py-12 px-4 border-t border-gray-200"
      style={{ backgroundColor: styles?.background || '#fff' }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-black">
            {displayTitle}
          </h2>
        </div>

        {/* Links Container with border */}
        <div className="border border-[#E5E5E5] rounded-[3px] bg-white">
          {validLinks.map((link, index) => {
          const fullImageUrl = getImageUrl(link.image);
          const isLast = index === validLinks.length - 1;

          const linkContent = (
            <div
              className={`flex items-center justify-between py-4 px-3 ${
                !isLast ? 'border-b border-[#E5E5E5]' : ''
              }`}
            >
              <div className="flex items-center flex-1">
                {/* Icon/Image Container (60x50px) */}
                <div className="w-[60px] h-[50px] rounded-[3px] bg-gray-100 flex items-center justify-center mr-3 overflow-hidden flex-shrink-0">
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
                    <ExternalLink className="w-6 h-6 text-gray-600" />
                  )}
                </div>

                {/* Title */}
                <span className="text-base font-semibold text-black">
                  {link.title}
                </span>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          );

          // Wrap with TrackableButton if URL is provided
          if (link.url && link.url.trim() !== '' && pageId && sectionId) {
            return (
              <TrackableButton
                key={link.id}
                href={link.url}
                pageId={pageId}
                sectionId={sectionId}
                eventType="link_click"
                eventData={{
                  link_title: link.title,
                  link_url: link.url,
                  section_type: 'links'
                }}
                className="block"
                target="_blank"
              >
                {linkContent}
              </TrackableButton>
            );
          }

          return (
            <div key={link.id}>
              {linkContent}
            </div>
          );
        })}
        </div>
      </div>
    </section>
  );
}
