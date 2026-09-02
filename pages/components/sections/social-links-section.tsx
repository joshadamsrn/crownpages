'use client';

import React from 'react';
import { SectionStyles } from '@crown-pages/types';
import { TrackableButton } from '../trackable-button';
import { SocialBrandIcon } from '../social-brand-icons';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  label?: string;
}

interface SocialLinksData {
  title?: string;
  links?: SocialLink[];
}

interface SocialLinksSectionProps {
  data: SocialLinksData;
  styles?: SectionStyles;
  pageId?: string;
  sectionId?: string;
}

export const SocialLinksSection: React.FC<SocialLinksSectionProps> = ({
  data,
  pageId,
  sectionId,
  styles,
}) => {
  const { title, links = [] } = data;
  const visibleLinks = links.filter((l) => l.url?.trim());

  if (visibleLinks.length === 0) return null;

  return (
    <section
      className="py-3 md:py-5"
      style={{ backgroundColor: styles?.background || 'transparent' }}
    >
      <div className="page-shell-panel overflow-hidden rounded-[32px] px-7 py-7 md:px-10 md:py-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          {title || 'Social Media'}
        </h2>

        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {visibleLinks.map((link) => {
            const href = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            const displayLabel = link.label || link.platform;

            return (
              <TrackableButton
                key={link.id}
                href={href}
                pageId={pageId || ''}
                sectionId={sectionId || ''}
                eventType="social_click"
                eventData={{
                  button_text: displayLabel,
                  platform: link.platform,
                  section_type: 'socialLinks',
                }}
                target="_blank"
                className="flex-shrink-0 transition-transform duration-150 hover:scale-105 active:scale-95"
              >
                <SocialBrandIcon platform={link.platform} size={72} />
              </TrackableButton>
            );
          })}
        </div>
      </div>
    </section>
  );
};
