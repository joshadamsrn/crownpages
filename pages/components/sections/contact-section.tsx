import React from 'react';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles } from '@/types';

interface ContactData {
  title: string;
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
}

interface ContactSectionProps {
  data: ContactData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
}

export function ContactSection({ data, business, pageId, sectionId, styles }: ContactSectionProps) {
  const { title, email, phone, address, hours } = data;
  const theme = useTheme();
  
  // Use business data as fallback if not provided in section data
  const contactEmail = email || business.email;
  const contactPhone = phone || business.phone;
  const contactAddress = address || (business.street_address && business.city && business.state 
    ? `${business.street_address}, ${business.city}, ${business.state} ${business.zip_code || ''}`.trim()
    : '');

    if(!contactEmail && !contactPhone && !contactAddress && !hours){
      return null
    }

  return (
    <section className="py-8 md:py-12 lg:py-16 px-4" style={{ backgroundColor: styles?.background || theme.surface }}>
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-12 text-center"
          style={{ color: styles?.text?.primary || theme.text.primary }}
        >
          {title}
        </h2>
        
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                     {contactEmail && (
             <div className="text-center">
               <div
                 className="p-6 md:p-8 rounded-lg shadow-md w-64 md:w-72 lg:w-80 hover:shadow-xl transition-shadow"
                 style={{ backgroundColor: styles?.background || theme.background }}
               >
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${theme.primary}20` }}
                >
                  <svg className="w-6 h-6 md:w-7 md:h-7" style={{ color: theme.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3
                  className="font-semibold mb-2 text-base md:text-lg"
                  style={{ color: styles?.text?.primary || theme.text.primary }}
                >
                  Email
                </h3>
                <TrackableButton
                  href={`mailto:${contactEmail}`}
                  pageId={pageId}
                  sectionId={sectionId}
                  eventType="email_click"
                  eventData={{ email: contactEmail }}
                  className="transition-colors text-sm md:text-base hover:underline"
                  style={{ color: theme.primary }}
                >
                  {contactEmail}
                </TrackableButton>
              </div>
            </div>
          )}

                     {contactPhone && (
             <div className="text-center">
               <div
                 className="p-6 md:p-8 rounded-lg shadow-md w-64 md:w-72 lg:w-80 hover:shadow-xl transition-shadow"
                 style={{ backgroundColor: styles?.background || theme.background }}
               >
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${theme.accent}20` }}
                >
                  <svg className="w-6 h-6 md:w-7 md:h-7" style={{ color: theme.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3
                  className="font-semibold mb-2 text-base md:text-lg"
                  style={{ color: styles?.text?.primary || theme.text.primary }}
                >
                  Phone
                </h3>
                <TrackableButton
                  href={`tel:${contactPhone}`}
                  pageId={pageId}
                  sectionId={sectionId}
                  eventType="phone_click"
                  eventData={{ phone: contactPhone }}
                  className="transition-colors text-sm md:text-base hover:underline"
                  style={{ color: theme.accent }}
                >
                  {contactPhone}
                </TrackableButton>
              </div>
            </div>
          )}

                     {contactAddress && (
             <div className="text-center">
               <div
                 className="p-6 md:p-8 rounded-lg shadow-md w-64 md:w-72 lg:w-80 hover:shadow-xl transition-shadow"
                 style={{ backgroundColor: styles?.background || theme.background }}
               >
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${theme.secondary}20` }}
                >
                  <svg className="w-6 h-6 md:w-7 md:h-7" style={{ color: theme.secondary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3
                  className="font-semibold mb-2 text-base md:text-lg"
                  style={{ color: styles?.text?.primary || theme.text.primary }}
                >
                  Address
                </h3>
                <TrackableButton
                  href={`https://maps.google.com/?q=${encodeURIComponent(contactAddress)}`}
                  pageId={pageId}
                  sectionId={sectionId}
                  eventType="address_click"
                  eventData={{ address: contactAddress }}
                  className="transition-colors text-sm md:text-base hover:underline"
                  style={{ color: theme.secondary }}
                  target="_blank"
                >
                  {contactAddress}
                </TrackableButton>
              </div>
            </div>
          )}

                     {hours && (
             <div className="text-center">
               <div
                 className="p-6 md:p-8 rounded-lg shadow-md w-64 md:w-72 lg:w-80 hover:shadow-xl transition-shadow"
                 style={{ backgroundColor: styles?.background || theme.background }}
               >
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${theme.accent}20` }}
                >
                  <svg className="w-6 h-6 md:w-7 md:h-7" style={{ color: theme.accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3
                  className="font-semibold mb-2 text-base md:text-lg"
                  style={{ color: styles?.text?.primary || theme.text.primary }}
                >
                  Hours
                </h3>
                <p className="text-sm md:text-base" style={{ color: styles?.text?.secondary || theme.text.secondary }}>{hours}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 