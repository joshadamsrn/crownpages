'use client';

import React, { useState, useEffect } from 'react';
import { SectionStyles } from '@crown-pages/types';
import { trackEvent } from "@/lib/analytics";
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
  icon?: string;
}

interface AmenitiesData {
  title?: string;
  amenities: Amenity[];
  itemsPerColumn?: number;
}

interface AmenitiesSectionProps {
  data: AmenitiesData;
  styles?: SectionStyles;
  pageId?: string;
  sectionId?: string;
  forceMobileLayout?: boolean;
}

export const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({
  data,
  styles,
  pageId,
  sectionId,
  forceMobileLayout = false,
}) => {
  const { title = 'Amenities', amenities, itemsPerColumn = 4 } = data;
  const validAmenities = (amenities || []).filter((item) => item?.name?.trim());
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(forceMobileLayout || window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [forceMobileLayout]);

  if (validAmenities.length === 0) {
    return null;
  }

  // Desktop: 4 columns × 4 rows = 16 items
  // Mobile: 2 columns × 4 rows = 8 items
  const displayLimit = isMobile ? 8 : 16;
  const displayedAmenities = showAll ? validAmenities : validAmenities.slice(0, displayLimit);

  // Split amenities into columns based on screen size
  const splitIntoColumns = (items: Amenity[]) => {
    const column1: Amenity[] = [];
    const column2: Amenity[] = [];
    const column3: Amenity[] = [];
    const column4: Amenity[] = [];

    if (isMobile) {
      // Mobile: 2 columns - distribute items alternating between columns
      items.forEach((item, index) => {
        if (index % 2 === 0) {
          column1.push(item);
        } else {
          column2.push(item);
        }
      });
    } else {
      // Desktop: 4 columns - distribute items across all 4 columns
      items.forEach((item, index) => {
        const columnIndex = index % 4;
        if (columnIndex === 0) {
          column1.push(item);
        } else if (columnIndex === 1) {
          column2.push(item);
        } else if (columnIndex === 2) {
          column3.push(item);
        } else {
          column4.push(item);
        }
      });
    }

    return [column1, column2, column3, column4];
  };

  const [column1, column2, column3, column4] = splitIntoColumns(displayedAmenities);

  return (
    <section
      className="py-4 md:py-8 lg:py-10"
      style={{
        backgroundColor: styles?.background || 'transparent',
      }}
    >
      <div
        className={`page-shell-panel overflow-hidden rounded-[32px] ${
          forceMobileLayout ? "px-7 py-7" : "px-7 py-7 md:px-10 md:py-10"
        }`}
      >
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h2 className={`font-bold text-black ${forceMobileLayout ? "text-2xl" : "text-2xl md:text-3xl lg:text-4xl"}`}>
            {title}
          </h2>
        </div>

        {/* Amenities List in 4 Columns */}
        <div className={`mb-2 grid gap-x-4 ${forceMobileLayout ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4 md:gap-x-6"}`}>
          {/* Column 1 */}
          <div>
            {column1.map((item) => (
              <div key={item.id} className={`flex items-start ${forceMobileLayout ? "mb-2" : "mb-2 md:mb-3"}`}>
                <span className={`mt-0 mr-2 font-bold text-black ${forceMobileLayout ? "text-lg" : "text-lg md:mr-3 md:text-xl"}`}>•</span>
                <span className={`flex-1 text-gray-800 ${forceMobileLayout ? "text-[15px] leading-[22px]" : "text-[15px] leading-[22px] md:text-base md:leading-7 lg:text-lg"}`}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* Column 2 */}
          <div>
            {column2.map((item) => (
              <div key={item.id} className={`flex items-start ${forceMobileLayout ? "mb-2" : "mb-2 md:mb-3"}`}>
                <span className={`mt-0 mr-2 font-bold text-black ${forceMobileLayout ? "text-lg" : "text-lg md:mr-3 md:text-xl"}`}>•</span>
                <span className={`flex-1 text-gray-800 ${forceMobileLayout ? "text-[15px] leading-[22px]" : "text-[15px] leading-[22px] md:text-base md:leading-7 lg:text-lg"}`}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* Column 3 */}
          <div>
            {column3.map((item) => (
              <div key={item.id} className={`flex items-start ${forceMobileLayout ? "mb-2" : "mb-2 md:mb-3"}`}>
                <span className={`mt-0 mr-2 font-bold text-black ${forceMobileLayout ? "text-lg" : "text-lg md:mr-3 md:text-xl"}`}>•</span>
                <span className={`flex-1 text-gray-800 ${forceMobileLayout ? "text-[15px] leading-[22px]" : "text-[15px] leading-[22px] md:text-base md:leading-7 lg:text-lg"}`}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* Column 4 */}
          <div>
            {column4.map((item) => (
              <div key={item.id} className={`flex items-start ${forceMobileLayout ? "mb-2" : "mb-2 md:mb-3"}`}>
                <span className={`mt-0 mr-2 font-bold text-black ${forceMobileLayout ? "text-lg" : "text-lg md:mr-3 md:text-xl"}`}>•</span>
                <span className={`flex-1 text-gray-800 ${forceMobileLayout ? "text-[15px] leading-[22px]" : "text-[15px] leading-[22px] md:text-base md:leading-7 lg:text-lg"}`}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Show More/Less Button */}
        {validAmenities.length > displayLimit && (
          <button
            onClick={() => {
              setShowAll(!showAll);
              if (!showAll && pageId) {
                trackEvent({ pageId, eventType: 'button_click', eventData: { action: 'show_more', section_type: 'amenities', section_id: sectionId } });
              }
            }}
            className={`ml-auto flex items-center gap-1 hover:opacity-70 transition-opacity ${
              forceMobileLayout ? "mt-4" : "mt-4 md:mt-6 md:gap-2"
            }`}
          >
            <span className={`font-bold text-black ${forceMobileLayout ? "text-base" : "text-base md:text-lg"}`}>
              {showAll ? 'Read Less' : 'Read More'}
            </span>
            {showAll ? (
              <ChevronUp className={forceMobileLayout ? "h-4 w-4 text-black" : "h-4 w-4 text-black md:h-5 md:w-5"} />
            ) : (
              <ChevronDown className={forceMobileLayout ? "h-4 w-4 text-black" : "h-4 w-4 text-black md:h-5 md:w-5"} />
            )}
          </button>
        )}
      </div>
    </section>
  );
};
