import React from 'react';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles } from '@/types';

interface CTAData {
  title: string;
  description?: string;
  button: {
    text: string;
    link: string;
  };
}

interface CTASectionProps {
  data: CTAData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
}

export function CTASection({ data, pageId, sectionId, styles }: CTASectionProps) {
  const { title, description, button } = data;
  const theme = useTheme();

  return (
    <section 
      className="py-16 px-4"
      style={{ backgroundColor: styles?.surface || theme.surface }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 
          className="text-3xl md:text-4xl font-bold mb-6"
          style={{ color: styles?.text?.primary || theme.text.primary }}
        >
          {title}
        </h2>
        
        {description && (
          <p 
            className="text-lg md:text-xl mb-8 max-w-2xl mx-auto"
            style={{ color: styles?.text?.secondary || theme.text.secondary }}
          >
            {description}
          </p>
        )}
        
        {button && (
          <TrackableButton
            href={button.link}
            pageId={pageId}
            sectionId={sectionId}
            eventType="button_click"
            eventData={{ button_text: button.text, button_position: 'cta_main' }}
            className="btn-primary inline-block px-8 py-4 text-lg font-semibold rounded-lg transition-colors hover:shadow-lg"
          >
            {button.text}
          </TrackableButton>
        )}
      </div>
    </section>
  );
} 