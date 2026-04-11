import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../enhanced-page-renderer';
import { SectionStyles } from '@crown-pages/types';
import { generatePublicUrl } from '@/lib/supabase/client';
import MediaGalleryWrapper from './MediaGalleryWrapper';
import { TrackableButton } from '../trackable-button';

// Medical Provider Data Interface
interface MedicalProviderData {
  facilityName: string;
  heroImage?: string;
  logo?: string;
  streetAddress?: string;
  unit?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  serviceDescription?: string;
  priceLow?: string;
  priceHigh?: string;
  services?: Array<{
    id: string;
    name: string;
    icon?: string;
    available: string;
  }>;
  acceptedInsurance?: Array<{
    id: string;
    name: string;
  }>;
  admissionCoordinator?: string;
  admissionCoordinatorPhone?: string;
  admissionCoordinatorEmail?: string;
  certifications?: Array<{
    id: string;
    name: string;
    icon?: string;
  }>;
  galleryTitle?: string;
  galleryImages?: Array<{
    id: string;
    url: string;
    caption?: string;
  }>;
  hasEmergencyResponse?: string;
  hasPetFriendly?: string;
  operatingHours?: string;
  documentsTitle?: string;
  documents?: Array<{
    id: string;
    name: string;
    url: string;
    size?: string;
    type?: string;
  }>;
}

interface MedicalProviderSectionProps {
  data: MedicalProviderData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
}

// Helper function to format phone number as (XXX) XXX-XXXX
const formatPhoneNumber = (phoneNumber: string | null | undefined) => {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // If not 10 digits, return original
  return phoneNumber;
};

// Helper function to create Google Maps URL
const getGoogleMapsUrl = (data: MedicalProviderData) => {
  if (!data) return '';
  
  const address = [
    data.streetAddress,
    data.unit,
    data.city,
    data.state,
    data.zipCode
  ].filter(Boolean).join(', ');
  
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

// Badge component for certifications
const Badge = ({ children, className, variant = "secondary" }: { 
  children: React.ReactNode; 
  className?: string; 
  variant?: "secondary" | "outline";
}) => {
  const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
  const variantClasses = variant === "outline" 
    ? "bg-blue-50 text-blue-800 border border-blue-300" 
    : "bg-gray-100 text-gray-800";
  
  return (
    <span className={`${baseClasses} ${variantClasses} ${className || ''}`}>
      {children}
    </span>
  );
};

// Copy button component
const CopyButton = ({ 
  value, 
  type, 
  facilityId,
  className = "",
  size = "sm",
  variant = "ghost"
}: {
  value: string;
  type: 'phone' | 'email' | 'fax';
  facilityId: string;
  className?: string;
  size?: "sm" | "icon";
  variant?: "ghost";
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1 hover:bg-gray-100 rounded ${className}`}
      title={`Copy ${type}`}
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
};

// Trackable contact links
const TrackablePhoneLink = ({ 
  facilityId, 
  phoneNumber, 
  children, 
  className = "" 
}: {
  facilityId: string;
  phoneNumber: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <TrackableButton
    href={`tel:${phoneNumber}`}
    pageId={facilityId}
    sectionId="medical-provider"
    eventType="phone_click"
    eventData={{ phone: phoneNumber }}
    className={className}
  >
    {children}
  </TrackableButton>
);

const TrackableEmailLink = ({ 
  facilityId, 
  email, 
  children, 
  className = "" 
}: {
  facilityId: string;
  email: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <TrackableButton
    href={`mailto:${email}`}
    pageId={facilityId}
    sectionId="medical-provider"
    eventType="email_click"
    eventData={{ email }}
    className={className}
  >
    {children}
  </TrackableButton>
);

const TrackableFaxLink = ({ 
  facilityId, 
  faxNumber, 
  children, 
  className = "" 
}: {
  facilityId: string;
  faxNumber: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <span className={className}>{children}</span>
);

export function MedicalProviderSection({ data, business, pageId, sectionId, styles }: MedicalProviderSectionProps) {
  const theme = useTheme();
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{id: string; url: string; caption?: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load images
  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);

      // Load hero image
      if (data.heroImage) {
        try {
          const heroUrl = await generatePublicUrl(data.heroImage);
          setHeroImageUrl(heroUrl ?? null);
        } catch (error) {
          console.error('Error loading hero image:', error);
        }
      }

      // Load logo
      if (data.logo) {
        try {
          const logoImageUrl = await generatePublicUrl(data.logo);
          setLogoUrl(logoImageUrl ?? null);
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }

      // Load gallery images
      if (data.galleryImages && data.galleryImages.length > 0) {
        try {
          const imagesWithUrls = await Promise.all(
            data.galleryImages.map(async (image) => {
              const url = await generatePublicUrl(image.url);
              return (url || null) ? { ...image, url: url || '' } : null;
            })
          );
          setGalleryImages(imagesWithUrls.filter(Boolean) as typeof galleryImages);
        } catch (error) {
          console.error('Error loading gallery images:', error);
        }
      }

      setIsLoading(false);
    };

    loadImages();
  }, [data.heroImage, data.logo, data.galleryImages]);

  // Format contact information
  const formattedPhone = formatPhoneNumber(data.phone);
  const formattedAdmissionPhone = formatPhoneNumber(data.admissionCoordinatorPhone);
  const googleMapsUrl = getGoogleMapsUrl(data);

  // Filter available services
  const availableServices = data.services?.filter(service => service.available === 'true') || [];
  
  // Filter available certifications
  const availableCertifications = data.certifications || [];

  return (
    <div className="bg-gray-50 min-h-screen" style={{ backgroundColor: styles?.background || theme.surface }}>
      {/* Hero Section with Image */}
      <div className="relative w-full h-[400px]">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={`${data.facilityName} hero image`}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-900 flex items-center justify-center">
            <h1 className="text-white text-3xl font-semibold">{data.facilityName}</h1>
          </div>
        )}
      </div>
      
      {/* Main Content Container */}
      <div className="container mx-auto px-4 relative -mt-8">
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8" style={{ backgroundColor: styles?.surface || theme.background }}>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            {logoUrl && (
              <div className="md:absolute md:-top-16 md:left-8 w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border-4 border-white bg-white shadow-md flex-shrink-0 mx-auto md:mx-0">
                <Image
                  src={logoUrl}
                  alt={`${data.facilityName} logo`}
                  width={128}
                  height={128}
                  className="object-contain h-full w-full"
                />
              </div>
            )}
            
            {/* Facility Info */}
            <div className={`${logoUrl ? 'md:ml-36' : ''}`}>
              <h1 
                className="text-2xl md:text-3xl font-bold mt-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                {data.facilityName}
              </h1>
              
              {/* Address */}
              {(data.streetAddress || data.city || data.state) && (
                <TrackableButton
                  href={googleMapsUrl}
                  pageId={pageId}
                  sectionId={sectionId}
                  eventType="address_click"
                  eventData={{ address: googleMapsUrl }}
                  target="_blank"
                  className="mt-2 hover:text-blue-600 hover:underline inline-block"
                  style={{ color: styles?.text?.secondary || theme.text.secondary }}
                >
                  {[
                    data.streetAddress,
                    data.unit,
                    data.city,
                    data.state,
                    data.zipCode
                  ].filter(Boolean).join(', ')}
                </TrackableButton>
              )}
              
              {/* Phone */}
              {data.phone && (
                <div className="mt-2 flex items-center" style={{ color: styles?.text?.secondary || theme.text.secondary }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <TrackablePhoneLink 
                    facilityId={pageId} 
                    phoneNumber={data.phone} 
                    className="hover:text-blue-600 hover:underline"
                  >
                    {formattedPhone}
                  </TrackablePhoneLink>
                  <CopyButton 
                    facilityId={pageId}
                    value={data.phone}
                    type="phone"
                    className="ml-2"
                  />
                </div>
              )}
              
              {/* Fax */}
              {data.fax && (
                <div className="mt-2 flex items-center" style={{ color: styles?.text?.secondary || theme.text.secondary }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <TrackableFaxLink 
                    facilityId={pageId} 
                    faxNumber={data.fax} 
                    className="hover:text-blue-600 hover:underline"
                  >
                    Fax: {formatPhoneNumber(data.fax)}
                  </TrackableFaxLink>
                  <CopyButton 
                    facilityId={pageId}
                    value={data.fax}
                    type="fax"
                    className="ml-2"
                  />
                </div>
              )}
              
              {/* Certifications */}
              {availableCertifications.length > 0 && (
                <div className="mt-4">
                  {availableCertifications.map((cert) => (
                    <Badge key={cert.id} variant="outline" className="mr-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {cert.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* About Section */}
          {data.serviceDescription && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                About
              </h2>
              <p 
                className="leading-relaxed"
                style={{ color: styles?.text?.secondary || theme.text.secondary }}
              >
                {data.serviceDescription}
              </p>
            </div>
          )}
          
          {/* Media Gallery Section */}
          {galleryImages.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <MediaGalleryWrapper
                images={galleryImages}
                videos={[]}
                title={data.galleryTitle || 'Photos & Videos'}
                wrapperMode={true}
              />
            </div>
          )}

          {/* Pricing Section */}
          {(data.priceLow || data.priceHigh) && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                Pricing
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 inline-flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span 
                  className="font-medium text-lg"
                  style={{ color: styles?.text?.primary || theme.text.primary }}
                >
                  {data.priceLow && data.priceHigh
                    ? `$${parseInt(data.priceLow).toLocaleString()} - $${parseInt(data.priceHigh).toLocaleString()} / month`
                    : data.priceLow
                    ? `Starting at $${parseInt(data.priceLow).toLocaleString()} / month`
                    : `All inclusive $${parseInt(data.priceHigh || '0').toLocaleString()} / month`}
                </span>
              </div>
            </div>
          )}
          
          {/* Services Section */}
          {availableServices.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableServices.map((service) => (
                  <div 
                    key={service.id}
                    className="flex items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span style={{ color: styles?.text?.primary || theme.text.primary }}>
                      {service.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Insurance Section */}
          {data.acceptedInsurance && data.acceptedInsurance.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                Accepted Insurance
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.acceptedInsurance.map((insurance) => (
                  <Badge key={insurance.id} variant="secondary">
                    {insurance.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Admission Coordinator Section */}
          {data.admissionCoordinator && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                Admission Coordinator
              </h2>
              <div className="bg-slate-50 rounded-lg p-5">
                <h3 
                  className="font-medium text-lg"
                  style={{ color: styles?.text?.primary || theme.text.primary }}
                >
                  {data.admissionCoordinator}
                </h3>
                
                <div className="flex flex-col space-y-3 mt-4">
                  {data.admissionCoordinatorPhone && (
                    <div className="flex items-center">
                      <TrackablePhoneLink 
                        facilityId={pageId} 
                        phoneNumber={data.admissionCoordinatorPhone} 
                        className="flex items-center text-blue-600 hover:underline"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {formattedAdmissionPhone}
                      </TrackablePhoneLink>
                      <CopyButton 
                        facilityId={pageId}
                        value={data.admissionCoordinatorPhone}
                        type="phone"
                        className="ml-2"
                      />
                    </div>
                  )}
                  
                  {data.admissionCoordinatorEmail && (
                    <div className="flex items-center">
                      <TrackableEmailLink 
                        facilityId={pageId} 
                        email={data.admissionCoordinatorEmail} 
                        className="flex items-center text-blue-600 hover:underline"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {data.admissionCoordinatorEmail}
                      </TrackableEmailLink>
                      <CopyButton 
                        facilityId={pageId}
                        value={data.admissionCoordinatorEmail}
                        type="email"
                        className="ml-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Documents Section */}
          {data.documents && data.documents.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                {data.documentsTitle || 'Resources & Downloads'}
              </h2>
              <div className="grid gap-3">
                {data.documents.map((doc) => (
                  <TrackableButton
                    key={doc.id}
                    href={doc.url}
                    pageId={pageId}
                    sectionId={sectionId}
                    eventType="download"
                    eventData={{ 
                      document_name: doc.name, 
                      document_type: doc.type || 'unknown',
                      document_size: doc.size || 'unknown'
                    }}
                    target="_blank"
                    className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-6 w-6 text-blue-600" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm font-medium group-hover:text-blue-600 transition-colors"
                        style={{ color: styles?.text?.primary || theme.text.primary }}
                      >
                        {doc.name}
                      </p>
                      {doc.size && (
                        <p 
                          className="text-sm mt-1"
                          style={{ color: styles?.text?.secondary || theme.text.secondary }}
                        >
                          {doc.size}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                        />
                      </svg>
                    </div>
                  </TrackableButton>
                ))}
              </div>
            </div>
          )}

          {/* Operating Hours */}
          {data.operatingHours && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: styles?.text?.primary || theme.text.primary }}
              >
                Operating Hours
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre 
                  className="whitespace-pre-wrap font-sans"
                  style={{ color: styles?.text?.secondary || theme.text.secondary }}
                >
                  {data.operatingHours}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
