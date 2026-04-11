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
}

export const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({
  data,
  styles,
  pageId,
  sectionId,
}) => {
  const { title = 'Amenities', amenities, itemsPerColumn = 4 } = data;
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop: 4 columns × 4 rows = 16 items
  // Mobile: 2 columns × 4 rows = 8 items
  const displayLimit = isMobile ? 8 : 16;
  const displayedAmenities = showAll ? amenities : amenities.slice(0, displayLimit);

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
      className="pt-3 md:pt-5 px-4"
      style={{
        backgroundColor: styles?.background || '#fff',
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black">
            {title}
          </h2>
        </div>

        {/* Amenities List in 4 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-6 mb-2">
          {/* Column 1 */}
          <div>
            {column1.map((item) => (
              <div key={item.id} className="flex items-start mb-2 md:mb-3">
                <span className="text-lg md:text-xl font-bold text-black mr-2 md:mr-3 mt-0">•</span>
                <span className="text-[15px] md:text-base lg:text-lg text-gray-800 leading-[22px] md:leading-7 flex-1">
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* Column 2 */}
          <div>
            {column2.map((item) => (
              <div key={item.id} className="flex items-start mb-2 md:mb-3">
                <span className="text-lg md:text-xl font-bold text-black mr-2 md:mr-3 mt-0">•</span>
                <span className="text-[15px] md:text-base lg:text-lg text-gray-800 leading-[22px] md:leading-7 flex-1">
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* Column 3 */}
          <div>
            {column3.map((item) => (
              <div key={item.id} className="flex items-start mb-2 md:mb-3">
                <span className="text-lg md:text-xl font-bold text-black mr-2 md:mr-3 mt-0">•</span>
                <span className="text-[15px] md:text-base lg:text-lg text-gray-800 leading-[22px] md:leading-7 flex-1">
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {/* Column 4 */}
          <div>
            {column4.map((item) => (
              <div key={item.id} className="flex items-start mb-2 md:mb-3">
                <span className="text-lg md:text-xl font-bold text-black mr-2 md:mr-3 mt-0">•</span>
                <span className="text-[15px] md:text-base lg:text-lg text-gray-800 leading-[22px] md:leading-7 flex-1">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Show More/Less Button */}
        {amenities.length > displayLimit && (
          <button
            onClick={() => {
              setShowAll(!showAll);
              if (!showAll && pageId) {
                trackEvent({ pageId, eventType: 'button_click', eventData: { action: 'show_more', section_type: 'amenities', section_id: sectionId } });
              }
            }}
            className="flex items-center gap-1 md:gap-2 ml-auto hover:opacity-70 transition-opacity"
          >
            <span className="text-base md:text-lg font-semibold text-black">
              {showAll ? 'Show Less' : 'Show More'}
            </span>
            {showAll ? (
              <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-black" />
            ) : (
              <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-black" />
            )}
          </button>
        )}
      </div>
    </section>
  );
};
