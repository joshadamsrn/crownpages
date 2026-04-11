'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles } from '@/types';
import { generatePublicUrl } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import {
    Phone,
    Mail,
    Globe,
    MapPin,
    User,
    Linkedin,
    Instagram,
    Twitter,
    Facebook,
    Youtube,
    MessageCircle,
    Calendar,
    CreditCard,
    ExternalLink,
    Download,
    Share2,
    Heart,
    QrCode,
    Copy,
    Check
} from 'lucide-react';

interface CustomLink {
    id: string;
    type: string;
    label: string;
    url: string;
}

interface PersonalContactData {
    name: string;
    title?: string;
    phone?: string;
    email?: string;
    photo?: string;
    website?: string;
    bio?: string;
    customLinks?: CustomLink[];
}

interface PersonalContactSectionProps {
    data: PersonalContactData;
    business: BusinessData;
    pageId: string;
    sectionId: string;
    styles?: SectionStyles;
}

// Icon mapping for different link types
const getLinkIcon = (type: string) => {
    switch (type) {
        case 'linkedin': return <Linkedin className="w-5 h-5" />;
        case 'instagram': return <Instagram className="w-5 h-5" />;
        case 'twitter': return <Twitter className="w-5 h-5" />;
        case 'facebook': return <Facebook className="w-5 h-5" />;
        case 'tiktok': return <MessageCircle className="w-5 h-5" />;
        case 'youtube': return <Youtube className="w-5 h-5" />;
        case 'portfolio': return <User className="w-5 h-5" />;
        case 'resume': return <Download className="w-5 h-5" />;
        case 'blog': return <Globe className="w-5 h-5" />;
        case 'whatsapp': return <MessageCircle className="w-5 h-5" />;
        case 'telegram': return <MessageCircle className="w-5 h-5" />;
        case 'discord': return <MessageCircle className="w-5 h-5" />;
        case 'calendly': return <Calendar className="w-5 h-5" />;
        case 'venmo': return <CreditCard className="w-5 h-5" />;
        case 'paypal': return <CreditCard className="w-5 h-5" />;
        case 'custom': return <ExternalLink className="w-5 h-5" />;
        default: return <ExternalLink className="w-5 h-5" />;
    }
};

export function PersonalContactSection({
    data,
    pageId,
    sectionId,
    styles
}: PersonalContactSectionProps) {
    const { name, title, phone, email, photo, website, bio, customLinks = [] } = data;
    const theme = useTheme();
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadPhoto = async () => {
            setIsLoading(true);
            // Check if photo exists and is not empty string, null, or undefined
            if (photo && photo.trim() !== '') {
                try {
                    const url = await generatePublicUrl(photo);
                    setPhotoUrl(url || null);
                } catch (error) {
                    console.error('Error loading photo:', error);
                    setPhotoUrl(null);
                }
            } else {
                setPhotoUrl(null);
            }
            setIsLoading(false);
        };

        loadPhoto();
    }, [photo]);

    const handleCopyContact = async () => {
        const contactText = `${name}${title ? `\n${title}` : ''}${phone ? `\nPhone: ${phone}` : ''}${email ? `\nEmail: ${email}` : ''}${website ? `\nWebsite: ${website}` : ''}`;

        try {
            await navigator.clipboard.writeText(contactText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy contact info:', error);
        }
    };

    const generateVCard = () => {
        if (pageId) {
            trackEvent({
                pageId,
                eventType: 'save_contact',
                eventData: { section_type: 'personalContact', section_id: sectionId, contact_name: name },
            }).catch(() => {});
        }

        const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${name}`,
            title ? `TITLE:${title}` : '',
            phone ? `TEL:${phone}` : '',
            email ? `EMAIL:${email}` : '',
            website ? `URL:${website}` : '',
            bio ? `NOTE:${bio}` : '',
            'END:VCARD'
        ].filter(Boolean).join('\n');

        const blob = new Blob([vcard], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '_')}.vcf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const primaryColor = styles?.primary || theme.primary;
    const backgroundColor = styles?.background || theme.background;
    const surfaceColor = styles?.surface || theme.surface;
    const textPrimary = styles?.text?.primary || theme.text.primary;
    const textSecondary = styles?.text?.secondary || theme.text.secondary;

    return (
        <section
            className="py-8 md:py-16 px-4"
            style={{ backgroundColor: backgroundColor }}
        >
            <div className="max-w-2xl mx-auto">
                {/* Main Contact Card */}
                <div
                    className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative"
                    style={{ backgroundColor: surfaceColor }}
                >
                    {/* Action buttons - desktop only */}
                    <div className="hidden md:flex absolute top-4 right-4 gap-2 z-10">
                        <button
                            onClick={handleCopyContact}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all border border-gray-200"
                            title="Copy contact info"
                            style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}
                        >
                            {copied ? <Check className="w-4 h-4" style={{ color: primaryColor }} /> : <Copy className="w-4 h-4" style={{ color: primaryColor }} />}
                        </button>
                        <button
                            onClick={generateVCard}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all border border-gray-200"
                            title="Download vCard"
                            style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}
                        >
                            <Download className="w-4 h-4" style={{ color: primaryColor }} />
                        </button>
                        <button
                            onClick={() => {
                                if (navigator.share && window.location.href) {
                                    navigator.share({
                                        title: `Contact: ${name}`,
                                        text: `${name}${title ? ` - ${title}` : ''}`,
                                        url: window.location.href
                                    });
                                }
                            }}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all border border-gray-200"
                            title="Share contact"
                            style={{ backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }}
                        >
                            <Share2 className="w-4 h-4" style={{ color: primaryColor }} />
                        </button>
                    </div>

                    {/* Profile section */}
                    <div className="px-6 md:px-8 py-6 md:py-8">
                        {/* Profile photo - only show if there's actually a photo */}
                        {photoUrl && (
                            <div className="flex justify-center mb-4">
                                <div className="relative">
                                    <Image
                                        src={photoUrl}
                                        alt={name}
                                        width={128}
                                        height={128}
                                        className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                        unoptimized
                                    />
                                </div>
                            </div>
                        )}

                        {/* Name and title */}
                        <div className="text-center mb-6">
                            <h1
                                className="text-2xl md:text-3xl font-bold mb-2"
                                style={{ color: textPrimary }}
                            >
                                {name}
                            </h1>
                            {title && (
                                <p
                                    className="text-lg md:text-xl font-medium"
                                    style={{ color: primaryColor }}
                                >
                                    {title}
                                </p>
                            )}
                        </div>

                        {/* Bio */}
                        {bio && (
                            <div className="text-center mb-6">
                                <p
                                    className="text-sm md:text-base leading-relaxed max-w-md mx-auto"
                                    style={{ color: textSecondary }}
                                >
                                    {bio}
                                </p>
                            </div>
                        )}

                        {/* Quick action buttons */}
                        <div className="flex flex-wrap justify-center gap-3 mb-6">
                            {phone && (
                                <TrackableButton
                                    href={`tel:${phone}`}
                                    pageId={pageId}
                                    sectionId={sectionId}
                                    eventType="phone_click"
                                    eventData={{ contact_name: name, phone_number: phone }}
                                    className="flex flex-col items-center p-4 rounded-xl transition-all hover:scale-105 border border-gray-200 w-24 md:w-28"
                                    style={{ backgroundColor: backgroundColor }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                                        style={{ backgroundColor: `${primaryColor}15` }}
                                    >
                                        <Phone className="w-5 h-5" style={{ color: primaryColor }} />
                                    </div>
                                    <span className="text-xs font-medium" style={{ color: textPrimary }}>Call</span>
                                </TrackableButton>
                            )}

                            {email && (
                                <TrackableButton
                                    href={`mailto:${email}`}
                                    pageId={pageId}
                                    sectionId={sectionId}
                                    eventType="email_click"
                                    eventData={{ contact_name: name, email_address: email }}
                                    className="flex flex-col items-center p-4 rounded-xl transition-all hover:scale-105 border border-gray-200 w-24 md:w-28"
                                    style={{ backgroundColor: backgroundColor }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                                        style={{ backgroundColor: `${primaryColor}15` }}
                                    >
                                        <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                                    </div>
                                    <span className="text-xs font-medium" style={{ color: textPrimary }}>Email</span>
                                </TrackableButton>
                            )}

                            {website && (
                                <TrackableButton
                                    href={website}
                                    pageId={pageId}
                                    sectionId={sectionId}
                                    eventType="link_click"
                                    eventData={{ contact_name: name, website: website }}
                                    className="flex flex-col items-center p-4 rounded-xl transition-all hover:scale-105 border border-gray-200 w-24 md:w-28"
                                    style={{ backgroundColor: backgroundColor }}
                                    target="_blank"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                                        style={{ backgroundColor: `${primaryColor}15` }}
                                    >
                                        <Globe className="w-5 h-5" style={{ color: primaryColor }} />
                                    </div>
                                    <span className="text-xs font-medium" style={{ color: textPrimary }}>Website</span>
                                </TrackableButton>
                            )}

                            {/* Add to contacts button - mobile optimized */}
                            <button
                                onClick={generateVCard}
                                className="flex flex-col items-center p-4 rounded-xl transition-all hover:scale-105 border border-gray-200 w-24 md:w-28 md:hidden"
                                style={{ backgroundColor: backgroundColor }}
                            >
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                                    style={{ backgroundColor: `${primaryColor}15` }}
                                >
                                    <Download className="w-5 h-5" style={{ color: primaryColor }} />
                                </div>
                                <span className="text-xs font-medium" style={{ color: textPrimary }}>Save</span>
                            </button>
                        </div>

                        {/* Custom Links */}
                        {customLinks && customLinks.length > 0 && (
                            <div className="space-y-3">
                                <h3
                                    className="text-lg font-semibold mb-4 text-center"
                                    style={{ color: textPrimary }}
                                >
                                    Connect with me
                                </h3>
                                <div className="grid gap-3">
                                    {customLinks.map((link) => (
                                        <TrackableButton
                                            key={link.id}
                                            href={link.url}
                                            pageId={pageId}
                                            sectionId={sectionId}
                                            eventType="link_click"
                                            eventData={{
                                                contact_name: name,
                                                link_type: link.type,
                                                link_label: link.label,
                                                link_url: link.url
                                            }}
                                            className="flex items-center p-4 rounded-xl transition-all hover:scale-[1.02] border border-gray-200 group"
                                            style={{ backgroundColor: backgroundColor }}
                                            target="_blank"
                                        >
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform"
                                                style={{ backgroundColor: `${primaryColor}15` }}
                                            >
                                                <div style={{ color: primaryColor }}>
                                                    {getLinkIcon(link.type)}
                                                </div>
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p
                                                    className="font-medium text-sm md:text-base"
                                                    style={{ color: textPrimary }}
                                                >
                                                    {link.label}
                                                </p>
                                                <p
                                                    className="text-xs opacity-75"
                                                    style={{ color: textSecondary }}
                                                >
                                                    {link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                                                </p>
                                            </div>
                                            <ExternalLink
                                                className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity"
                                                style={{ color: textSecondary }}
                                            />
                                        </TrackableButton>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mobile action buttons */}
                        <div className="flex md:hidden justify-center gap-4 mt-6 pt-6 border-t border-gray-200">
                            <button
                                onClick={handleCopyContact}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                                style={{
                                    backgroundColor: `${primaryColor}15`,
                                    color: primaryColor
                                }}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                <span className="text-sm font-medium">
                                    {copied ? 'Copied!' : 'Copy Info'}
                                </span>
                            </button>

                            <button
                                onClick={() => {
                                    if (navigator.share && window.location.href) {
                                        navigator.share({
                                            title: `Contact: ${name}`,
                                            text: `${name}${title ? ` - ${title}` : ''}`,
                                            url: window.location.href
                                        });
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                                style={{
                                    backgroundColor: `${primaryColor}15`,
                                    color: primaryColor
                                }}
                            >
                                <Share2 className="w-4 h-4" />
                                <span className="text-sm font-medium">Share</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
} 