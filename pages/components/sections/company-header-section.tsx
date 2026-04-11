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
}

export const CompanyHeaderSection: React.FC<CompanyHeaderSectionProps> = ({
  data,
  pageId,
  sectionId,
}) => {
  const { companyName, address, mapUrl } = data;

  return (
    <section className="py-4 md:py-6 bg-white">
      <div className="max-w-5xl mx-auto px-4">
      {/* Company Name */}
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black mb-2">
        {companyName || "Unnamed Business"}
      </h1>

      {/* CTA Button (if provided) */}
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
          className="text-base md:text-lg text-gray-600 mb-2 hover:text-gray-800 transition-colors block"
          target="_blank"
        >
          {data.ctaText}
        </TrackableButton>
      )}

      {/* Address */}
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
          className="flex items-start text-left text-base md:text-lg text-gray-600 hover:text-gray-800 transition-colors"
          target="_blank"
        >
          <p className="leading-relaxed">
            {address}
          </p>
        </TrackableButton>
      ) : address ? (
        <p className="text-base md:text-lg text-gray-600 leading-relaxed">
          {address}
        </p>
      ) : null}
      </div>
    </section>
  );
};
