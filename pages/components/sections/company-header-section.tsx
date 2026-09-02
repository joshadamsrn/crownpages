'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { SectionStyles } from '@crown-pages/types';
import { TrackableButton } from '../trackable-button';

interface CompanyHeaderData {
  companyName: string;
  address?: string;
  mapUrl?: string;
  ctaText?: string;
  ctaLink?: string;
}

interface CompanyHeaderSectionProps {
  data: CompanyHeaderData;
  styles?: SectionStyles;
  pageId?: string;
  sectionId?: string;
  forceMobileLayout?: boolean;
}

export const CompanyHeaderSection: React.FC<CompanyHeaderSectionProps> = ({
  data,
  pageId,
  sectionId,
  forceMobileLayout = false,
}) => {
  const { companyName, address, mapUrl } = data;
  const [addressLineOne, addressLineTwo] = (() => {
    if (!address) return ["", ""];
    const [lineOne, ...rest] = address.split(",");
    return [lineOne?.trim() || "", rest.join(",").trim()];
  })();

  return (
    <section className={forceMobileLayout ? "pt-4 pb-4" : "pt-8 pb-5 md:pt-10 md:pb-8"}>
      <div
        className={`page-shell-panel relative overflow-hidden rounded-[32px] ${
          forceMobileLayout ? "px-7 py-7" : "px-7 py-8 md:px-10 md:py-10"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/75 to-transparent" />

        <div className="relative">
          <h1
            className={`mb-2 font-bold text-black ${
              forceMobileLayout ? "text-[1.06rem] leading-tight tracking-[-0.03em]" : "text-2xl md:text-3xl lg:text-4xl"
            }`}
          >
            {companyName || "Unnamed Business"}
          </h1>

          {data.ctaText && data.ctaLink && pageId && sectionId && (
            <TrackableButton
              href={data.ctaLink}
              pageId={pageId}
              sectionId={sectionId}
              eventType="button_click"
              eventData={{
                button_text: data.ctaText,
                button_position: 'company_header_cta',
                section_type: 'company_header'
              }}
              className={`mb-2 block text-gray-600 transition-colors hover:text-gray-800 ${
                forceMobileLayout ? "text-[0.88rem]" : "text-base md:text-lg"
              }`}
              target="_blank"
            >
              {data.ctaText}
            </TrackableButton>
          )}

          {address && mapUrl && pageId && sectionId ? (
            <TrackableButton
              href={mapUrl}
              pageId={pageId}
              sectionId={sectionId}
              eventType="address_click"
              eventData={{
                address: address,
                section_type: 'company_header'
              }}
              className={`flex items-start text-left text-gray-600 transition-colors hover:text-gray-800 ${
                forceMobileLayout ? "text-[0.88rem]" : "text-base md:text-lg"
              }`}
              target="_blank"
            >
              <div className={forceMobileLayout ? "leading-snug" : "leading-relaxed"}>
                <p>{addressLineOne}</p>
                {addressLineTwo ? <p>{addressLineTwo}</p> : null}
              </div>
            </TrackableButton>
          ) : address ? (
            <div
              className={`text-gray-600 ${
                forceMobileLayout ? "text-[0.88rem] leading-snug" : "text-base leading-relaxed md:text-lg"
              }`}
            >
              <p>{addressLineOne}</p>
              {addressLineTwo ? <p>{addressLineTwo}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
