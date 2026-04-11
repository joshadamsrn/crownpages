'use client';

import React, { useEffect, useState } from 'react';
import { BusinessData } from '@crown-pages/types';
import { SectionStyles } from '@/types';
import Image from 'next/image';
import { ShareButton } from '@/components/share-button';

interface HeroData {
  title?: string;
  subtitle?: string;
  ctaButton?: {
    text: string;
    link: string;
  };
  backgroundImage?: string;
  heroImage?: string; // Support both field names
  logoUrl?: string;
  logo?: string; // Support both field names
}

interface HeroSectionProps {
  data: HeroData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
  pageUrl?: string;
  pageTitle?: string;
  isPreview?: boolean;
}

// Helper to get full Supabase URL
const getImageUrl = (path: string | undefined) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/uploads/${path}`;
};

export function HeroSection({ data, pageUrl, pageTitle, business, pageId, isPreview = false }: HeroSectionProps) {
  const { backgroundImage, heroImage, logoUrl, logo, title, subtitle } = data;
  const [heroKey, setHeroKey] = useState(Date.now());
  const [logoKey, setLogoKey] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  const heroImagePath = backgroundImage || heroImage || '';
  const logoImagePath = logoUrl || logo || '';

  // Force refresh when URLs change
  useEffect(() => {
    setHeroKey(Date.now());
    setIsLoading(true);
  }, [heroImagePath]);

  useEffect(() => {
    setLogoKey(Date.now());
  }, [logoImagePath]);

  const fullHeroUrl = getImageUrl(heroImagePath);
  const fullLogoUrl = getImageUrl(logoImagePath);

  return (
    <section className="relative w-full">
      {/* Mobile: Full-width, Desktop: Contained with max-width */}
      <div className="relative w-full md:max-w-5xl md:mx-auto md:py-4 md:px-4">
        {/* Wrapper with overflow visible to allow logo to extend outside */}
        <div className="relative w-full overflow-visible">
          {/* Hero Image Container */}
          <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] md:rounded-xl overflow-hidden">
            {fullHeroUrl ? (
              <div className="relative w-full h-full">
                <Image
                  key={heroKey}
                  src={fullHeroUrl}
                  alt="Hero"
                  fill
                  className="object-cover"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setIsLoading(false)}
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                <svg className="w-16 h-16 md:w-24 md:h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-3 text-gray-500 text-sm md:text-base">No Hero Image</p>
              </div>
            )}

            {isLoading && fullHeroUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-blue-500" />
              </div>
            )}

            {/* Share Button Overlay - inside hero container */}
            {fullHeroUrl && (
              <div className={`absolute ${isPreview ? 'top-16' : 'top-4'} right-4 z-20`}>
                <ShareButton 
                  url={pageUrl}
                  title={pageTitle || business?.name || 'Check this out!'}
                  text={`Check out ${pageTitle || business?.name || 'this page'}!`}
                  pageId={pageId}
                />
              </div>
            )}
          </div>

          {/* Logo positioned OUTSIDE hero image container but inside wrapper - this ensures it appears on top */}
          {fullLogoUrl && (
            <div className="absolute left-4 md:left-8 bottom-0 z-50 pointer-events-none"
                 style={{
                   transform: 'translateY(50%)'
                 }}>
              <div className="relative w-[90px] h-[90px] md:w-[120px] md:h-[120px] rounded-xl bg-white shadow-xl p-3 md:p-4 border-2 border-white pointer-events-auto overflow-hidden">
                <Image
                  key={logoKey}
                  src={fullLogoUrl}
                  alt="Logo"
                  fill
                  className="object-contain p-1 rounded-lg"
                  unoptimized
                />
              </div>
            </div>
          )}
        </div>

        {/* Add padding below hero to account for logo */}
        {fullLogoUrl && <div className="h-[30px] md:h-[40px]" />}
      </div>
    </section>
  );
}
