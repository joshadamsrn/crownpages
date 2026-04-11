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
      style={{ backgroundColor: styles?.background || '#fff' }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          {title || 'Social Media'}
        </h2>

        {/* Scrollable horizontal row of brand icon tiles */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {visibleLinks.map((link) => {
            const href = link.url.startsWith('http') ? link.url : `https://${link.url}`;
            const displayLabel = link.label || link.platform;

            return (
              // TrackableButton renders <a>; SocialBrandIcon renders a div+svg — no nested anchor.
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
                className="transition-transform duration-150 hover:scale-105 active:scale-95 flex-shrink-0"
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
