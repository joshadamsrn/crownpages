'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles } from '@/types';
import { generatePublicUrl } from '@/lib/supabase/client';
import {
    Phone,
    Mail,
    MapPin,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    Download,
    Building,
    User
} from 'lucide-react';

interface BusinessInfo {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
}

interface ContactPerson {
    id: string;
    name: string;
    title?: string;
    photo?: string;
    phone?: string;
    email?: string;
    extension?: string;
}

interface MultiContactData {
    title: string;
    businessInfo: BusinessInfo[];
    contactPersons?: ContactPerson[];
}

interface MultiContactSectionProps {
    data: MultiContactData;
    business: BusinessData;
    pageId: string;
    sectionId: string;
    styles?: SectionStyles;
}

export function MultiContactSection({
    data,
    pageId,
    sectionId,
    styles
}: MultiContactSectionProps) {
    const { title, businessInfo = [], contactPersons = [] } = data;
    const theme = useTheme();
    const [expandedDrawer, setExpandedDrawer] = useState(false);
    const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});
    const [copied, setCopied] = useState<string | null>(null);

    // Load contact photos
    useEffect(() => {
        const loadPhotos = async () => {
            const photoPromises = contactPersons.map(async (person): Promise<{ contactId: string; url: string | null }> => {
                if (person.photo && person.photo.trim() !== '') {
                    try {
                        const url = await generatePublicUrl(person.photo);
                        return { contactId: person.id, url: url ?? null };
                    } catch (error) {
                        console.error('Error loading photo for contact:', person.id, error);
                        return { contactId: person.id, url: null };
                    }
                }
                return { contactId: person.id, url: null };
            });

            const results = await Promise.all(photoPromises);
            const urlMap = results.reduce((acc, { contactId, url }) => {
                acc[contactId] = url || null;
                return acc;
            }, {} as Record<string, string | null>);

            setPhotoUrls(urlMap);
        };

        loadPhotos();
    }, [contactPersons]);

    const business = businessInfo?.[0];
    if (!business || !business.name) return null;

    const primaryColor = styles?.primary || theme.primary;
    const backgroundColor = styles?.background || theme.background;
    const surfaceColor = styles?.surface || theme.surface;
    const textPrimary = styles?.text?.primary || theme.text.primary;
    const textSecondary = styles?.text?.secondary || theme.text.secondary;

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(text);
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };




    return (
        <section className="w-full py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Section Title with improved spacing and typography */}
                {title && (
                    <div className="text-center mb-16">
                        <h2 
                            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
                            style={{ color: textPrimary }}
                        >
                            {title}
                        </h2>
                    </div>
                )}

                {/* Main Business Information Card - Enhanced Design */}
                <div 
                    className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all duration-300"
                    style={{ backgroundColor: surfaceColor }}
                >
                <div className="p-8 md:p-12">
                    {/* Business Name - Enhanced Typography */}
                    <div className="mb-8">
                        <h1 
                            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2 leading-tight"
                            style={{ color: textPrimary }}
                        >
                            {business.name}
                        </h1>
                    </div>

                    {/* Address - Enhanced Layout */}
                    {business.address && (
                        <div className="flex items-start gap-4 mb-8 p-4 rounded-2xl border border-gray-100">
                            <div 
                                className="p-3 rounded-xl flex-shrink-0"
                                style={{ backgroundColor: `${primaryColor}15` }}
                            >
                                <MapPin className="w-6 h-6" style={{ color: primaryColor }} />
                            </div>
                            <div className="flex-1">
                                <h3 
                                    className="text-sm font-semibold mb-1 uppercase tracking-wide"
                                    style={{ color: textSecondary }}
                                >
                                    Address
                                </h3>
                                <p 
                                    className="text-lg md:text-xl leading-relaxed font-medium"
                                    style={{ color: textPrimary }}
                                >
                                    {business.address}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Phone and Fax - Enhanced Contact Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        {business.phone && (
                            <div className="group">
                                <h3 
                                    className="text-sm font-semibold mb-3 uppercase tracking-wide"
                                    style={{ color: textSecondary }}
                                >
                                    Phone Number
                                </h3>
                                <div className="flex items-center gap-3">
                                    <TrackableButton
                                        href={`tel:${business.phone}`}
                                        pageId={pageId}
                                        sectionId={sectionId}
                                        eventType="phone_click"
                                        eventData={{ phone_number: business.phone }}
                                        className="flex items-center gap-3 px-6 py-4 rounded-2xl transition-all hover:scale-105 hover:shadow-lg group-hover:shadow-lg border border-transparent"
                                        style={{ 
                                            backgroundColor: primaryColor,
                                            color: 'white'
                                        }}
                                    >
                                        <Phone className="w-5 h-5" />
                                        <span className="font-semibold text-lg">{business.phone}</span>
                                    </TrackableButton>
                                    <button
                                        onClick={() => handleCopy(business.phone!)}
                                        className="p-3 rounded-xl transition-all hover:bg-gray-100 hover:scale-105"
                                        title="Copy phone number"
                                    >
                                        {copied === business.phone ? (
                                            <Check className="w-5 h-5" style={{ color: primaryColor }} />
                                        ) : (
                                            <Copy className="w-5 h-5" style={{ color: textSecondary }} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {business.fax && (
                            <div className="group">
                                <h3 
                                    className="text-sm font-semibold mb-3 uppercase tracking-wide"
                                    style={{ color: textSecondary }}
                                >
                                    Fax Number
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="flex items-center gap-3 px-6 py-4 rounded-2xl border-2 border-gray-200"
                                        style={{ borderColor: `${primaryColor}30` }}
                                    >
                                        <Building className="w-5 h-5" style={{ color: primaryColor }} />
                                        <span 
                                            className="font-semibold text-lg"
                                            style={{ color: textPrimary }}
                                        >
                                            {business.fax}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(business.fax!)}
                                        className="p-3 rounded-xl transition-all hover:bg-gray-100 hover:scale-105"
                                        title="Copy fax number"
                                    >
                                        {copied === business.fax ? (
                                            <Check className="w-5 h-5" style={{ color: primaryColor }} />
                                        ) : (
                                            <Copy className="w-5 h-5" style={{ color: textSecondary }} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons - Enhanced Grid Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {business.email && (
                            <TrackableButton
                                href={`mailto:${business.email}`}
                                pageId={pageId}
                                sectionId={sectionId}
                                eventType="email_click"
                                eventData={{ email_address: business.email }}
                                className="group flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all hover:scale-105 hover:shadow-lg text-center justify-center"
                                style={{ 
                                    borderColor: primaryColor,
                                    color: primaryColor
                                }}
                            >
                                <Mail className="w-5 h-5 group-hover:animate-pulse" />
                                <span className="font-semibold">Send Email</span>
                            </TrackableButton>
                        )}

                        {business.website && (
                            <TrackableButton
                                href={business.website}
                                pageId={pageId}
                                sectionId={sectionId}
                                eventType="link_click"
                                eventData={{ website_url: business.website }}
                                className="group flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all hover:scale-105 hover:shadow-lg text-center justify-center"
                                style={{ 
                                    borderColor: primaryColor,
                                    color: primaryColor
                                }}
                            >
                                <ExternalLink className="w-5 h-5 group-hover:animate-pulse" />
                                <span className="font-semibold">Visit Website</span>
                            </TrackableButton>
                        )}

                        {business.address && (
                            <TrackableButton
                                href={`https://maps.google.com/?q=${encodeURIComponent(business.address)}`}
                                pageId={pageId}
                                sectionId={sectionId}
                                eventType="address_click"
                                eventData={{ address: business.address }}
                                className="group flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all hover:scale-105 hover:shadow-lg text-center justify-center"
                                style={{ 
                                    borderColor: primaryColor,
                                    color: primaryColor
                                }}
                            >
                                <MapPin className="w-5 h-5 group-hover:animate-pulse" />
                                <span className="font-semibold">Get Directions</span>
                            </TrackableButton>
                        )}
                    </div>

                    {/* Contact Persons Drawer - Enhanced Design */}
                    {contactPersons.length > 0 && (
                        <>
                            {/* Drawer Header - Enhanced */}
                            <div className="border-t-2 border-gray-100 mt-8">
                                <button
                                    onClick={() => setExpandedDrawer(!expandedDrawer)}
                                    className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-all rounded-t-2xl group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div 
                                            className="p-3 rounded-xl transition-all group-hover:scale-110"
                                            style={{ backgroundColor: `${primaryColor}15` }}
                                        >
                                            <User className="w-6 h-6" style={{ color: primaryColor }} />
                                        </div>
                                        <div>
                                            <span 
                                                className="text-lg font-semibold block"
                                                style={{ color: textPrimary }}
                                            >
                                                Additional Contacts
                                            </span>
                                        </div>
                                        <span 
                                            className="px-3 py-1.5 rounded-full text-sm font-semibold ml-auto mr-4"
                                            style={{ 
                                                backgroundColor: primaryColor,
                                                color: 'white'
                                            }}
                                        >
                                            {contactPersons.length}
                                        </span>
                                    </div>
                                    <div className="transition-transform duration-200" style={{ transform: expandedDrawer ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        <ChevronDown className="w-6 h-6" style={{ color: primaryColor }} />
                                    </div>
                                </button>

                                {/* Drawer Content - Enhanced Contact Cards */}
                                {expandedDrawer && (
                                    <div className="overflow-hidden">
                                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                                            <div className="grid gap-6">
                                                {contactPersons.map((person, index) => (
                                                    <div 
                                                        key={person.id}
                                                        className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200"
                                                    >
                                                        <div className="flex items-start gap-5">
                                                            {/* Photo with enhanced styling */}
                                                            <div className="flex-shrink-0">
                                                                {photoUrls[person.id] ? (
                                                                    <Image
                                                                        src={photoUrls[person.id]!}
                                                                        alt={person.name}
                                                                        width={64}
                                                                        height={64}
                                                                        className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-lg"
                                                                        unoptimized
                                                                    />
                                                                ) : (
                                                                    <div 
                                                                        className="w-16 h-16 rounded-2xl flex items-center justify-center ring-4 ring-white shadow-lg"
                                                                        style={{ backgroundColor: `${primaryColor}20` }}
                                                                    >
                                                                        <User className="w-8 h-8" style={{ color: primaryColor }} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Contact Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="mb-4">
                                                                    <h4 
                                                                        className="text-xl font-bold mb-1"
                                                                        style={{ color: textPrimary }}
                                                                    >
                                                                        {person.name}
                                                                    </h4>
                                                                    {person.title && (
                                                                        <p 
                                                                            className="text-sm font-semibold px-3 py-1 rounded-full inline-block"
                                                                            style={{ 
                                                                                backgroundColor: `${primaryColor}15`,
                                                                                color: primaryColor 
                                                                            }}
                                                                        >
                                                                            {person.title}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                {/* Contact Actions - Enhanced */}
                                                                <div className="flex flex-wrap gap-3">
                                                                    {person.phone && (
                                                                        <TrackableButton
                                                                            href={`tel:${person.phone}${person.extension ? `,${person.extension}` : ''}`}
                                                                            pageId={pageId}
                                                                            sectionId={sectionId}
                                                                            eventType="phone_click"
                                                                            eventData={{ 
                                                                                contact_name: person.name,
                                                                                phone_number: person.phone,
                                                                                extension: person.extension
                                                                            }}
                                                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105 hover:shadow-lg border-2 bg-white"
                                                                            style={{ 
                                                                                borderColor: primaryColor,
                                                                                color: primaryColor 
                                                                            }}
                                                                        >
                                                                            <Phone className="w-4 h-4" />
                                                                            <span className="text-sm font-semibold">
                                                                                {person.phone}
                                                                                {person.extension && ` ext. ${person.extension}`}
                                                                            </span>
                                                                        </TrackableButton>
                                                                    )}

                                                                    {person.email && (
                                                                        <div className="flex items-center gap-2">
                                                                            <TrackableButton
                                                                                href={`mailto:${person.email}`}
                                                                                pageId={pageId}
                                                                                sectionId={sectionId}
                                                                                eventType="email_click"
                                                                                eventData={{ 
                                                                                    contact_name: person.name,
                                                                                    email_address: person.email
                                                                                }}
                                                                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105 hover:shadow-lg border-2 bg-white"
                                                                                style={{ 
                                                                                    borderColor: primaryColor,
                                                                                    color: primaryColor 
                                                                                }}
                                                                            >
                                                                                <Mail className="w-4 h-4" />
                                                                                <span className="text-sm font-semibold">
                                                                                    {person.email}
                                                                                </span>
                                                                            </TrackableButton>
                                                                            <button
                                                                                onClick={() => handleCopy(person.email!)}
                                                                                className="p-2.5 rounded-xl transition-all hover:bg-gray-100 hover:scale-105"
                                                                                title="Copy email"
                                                                            >
                                                                                {copied === person.email ? (
                                                                                    <Check className="w-4 h-4" style={{ color: primaryColor }} />
                                                                                ) : (
                                                                                    <Copy className="w-4 h-4" style={{ color: textSecondary }} />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            </div>
        </section>
    );
}
