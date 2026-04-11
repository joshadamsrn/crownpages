"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Mail,
    Phone,
    MapPin,
    Globe,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Youtube,
    ExternalLink
} from "lucide-react";
import type { Database } from "@/database.types";
import {
    trackBusinessPagePhoneClick,
    trackBusinessPageEmailClick,
    trackBusinessPageAddressClick,
    trackBusinessPageSocialClick,
    trackBusinessPageWebsiteClick,
    trackBusinessPageLinkClick,
} from "@/lib/analytics";

type BusinessPageData = Database["public"]["Tables"]["business_pages"]["Row"] & {
    business: Database["public"]["Tables"]["businesses"]["Row"] | null;
};

interface BusinessPageRendererProps {
    businessPageData: BusinessPageData;
    business: Database["public"]["Tables"]["businesses"]["Row"];
}

interface PageLink {
    id: string;
    page_id: string;
    page_title: string;
    page_slug: string;
    custom_title?: string;
    is_enabled: boolean;
    sort_order: number;
}

interface SocialLink {
    id: string;
    platform: string;
    url: string;
    is_enabled: boolean;
    sort_order: number;
}

interface ContactInfo {
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
}

interface Styles {
    primary?: string;
    backgroundColor?: string;
    textColor?: string;
}

const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
        case "facebook":
            return Facebook;
        case "twitter":
            return Twitter;
        case "instagram":
            return Instagram;
        case "linkedin":
            return Linkedin;
        case "youtube":
            return Youtube;
        case "website":
            return Globe;
        default:
            return ExternalLink;
    }
};

const getSocialColor = (platform: string) => {
    switch (platform.toLowerCase()) {
        case "facebook":
            return "hover:bg-blue-600";
        case "twitter":
            return "hover:bg-sky-500";
        case "instagram":
            return "hover:bg-pink-600";
        case "linkedin":
            return "hover:bg-blue-700";
        case "youtube":
            return "hover:bg-red-600";
        default:
            return "hover:bg-gray-600";
    }
};

export function BusinessPageRenderer({
    businessPageData,
    business
}: BusinessPageRendererProps) {
    const styles: Styles = (businessPageData.styles as unknown as Styles) || {};
    const pageLinks: PageLink[] = (businessPageData.page_links as unknown as PageLink[]) || [];
    const socialLinks: SocialLink[] = (businessPageData.social_links as unknown as SocialLink[]) || [];
    const contactInfo: ContactInfo = (businessPageData.contact_info as unknown as ContactInfo) || {};

    // Filter and sort enabled page links
    const enabledPageLinks = pageLinks
        .filter(link => link.is_enabled)
        .sort((a, b) => a.sort_order - b.sort_order);

    // Filter and sort enabled social links
    const enabledSocialLinks = socialLinks
        .filter(link => link.is_enabled)
        .sort((a, b) => a.sort_order - b.sort_order);

    const primaryColor = styles.primary || business.primary_color || "#FFFFFF";
    const backgroundColor = styles.backgroundColor || "#000000";
    const textColor = styles.textColor || "#FFFFFF";

    // Analytics tracking functions
    const handlePhoneClick = (phoneNumber: string) => {
        trackBusinessPagePhoneClick(businessPageData.id, business.id, phoneNumber);
    };

    const handleEmailClick = (email: string) => {
        trackBusinessPageEmailClick(businessPageData.id, business.id, email);
    };

    const handleAddressClick = (address: string) => {
        trackBusinessPageAddressClick(businessPageData.id, business.id, address);
    };

    const handleSocialClick = (platform: string, url: string) => {
        trackBusinessPageSocialClick(businessPageData.id, business.id, platform, url);
    };

    const handleWebsiteClick = (websiteUrl: string) => {
        trackBusinessPageWebsiteClick(businessPageData.id, business.id, websiteUrl);
    };

    const handlePageLinkClick = (linkTitle: string, linkSlug: string) => {
        trackBusinessPageLinkClick(businessPageData.id, business.id, linkTitle, linkSlug);
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4"
            style={{
                backgroundColor,
                color: textColor
            }}
        >
            <div className="w-full max-w-md mx-auto text-center space-y-6">
                {/* Logo */}
                {(businessPageData.logo_url || business.logo_url) && (
                    <div className="mb-6">
                        <Image
                            src={businessPageData.logo_url || business.logo_url || ""}
                            alt={`${business.name} logo`}
                            width={180}
                            height={180}
                            className="mx-auto object-contain max-h-[180px] w-auto h-auto"
                            priority
                        />
                    </div>
                )}

                {/* Business Title */}
                <h1
                    className="text-2xl font-bold mb-2"
                    style={{ color: textColor }}
                >
                    {businessPageData.title || `Welcome to ${business.name}`}
                </h1>

                {/* Business Description */}
                {businessPageData.description && (
                    <p
                        className="text-lg mb-8 opacity-80"
                        style={{ color: textColor }}
                    >
                        {businessPageData.description}
                    </p>
                )}

                {/* Page Links */}
                {enabledPageLinks.length > 0 && (
                    <div className="space-y-3 mb-8">
                        {enabledPageLinks.map((link) => (
                            <Link
                                key={link.id}
                                href={`/${business.slug}/${link.page_slug}`}
                                className="block w-full p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105"
                                style={{
                                    borderColor: primaryColor,
                                    backgroundColor: primaryColor,
                                    color: backgroundColor,
                                }}
                                onClick={() => handlePageLinkClick(link.custom_title || link.page_title, link.page_slug)}
                            >
                                <span
                                    className="font-medium text-lg"
                                    style={{ color: backgroundColor }}
                                >
                                    {link.custom_title || link.page_title}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Social Links */}
                {enabledSocialLinks.length > 0 && (
                    <div className="flex justify-center space-x-4 mb-8">
                        {enabledSocialLinks.map((link) => {
                            const IconComponent = getSocialIcon(link.platform);
                            const socialColor = getSocialColor(link.platform);

                            return (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-3 rounded-full transition-all duration-200 hover:scale-110 ${socialColor}`}
                                    style={{
                                        backgroundColor: primaryColor,
                                        color: backgroundColor,
                                    }}
                                    onClick={() => handleSocialClick(link.platform, link.url)}
                                >
                                    <IconComponent size={24} />
                                </a>
                            );
                        })}
                    </div>
                )}

                {/* Contact Information */}
                {(contactInfo.email || contactInfo.phone || contactInfo.address || contactInfo.website) && (
                    <div className="space-y-3 pt-6 border-t border-gray-600">
                        {contactInfo.email && (
                            <a
                                href={`mailto:${contactInfo.email}`}
                                className="flex items-center justify-center space-x-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
                                style={{ color: textColor }}
                                onClick={() => handleEmailClick(contactInfo.email!)}
                            >
                                <Mail size={16} />
                                <span>{contactInfo.email}</span>
                            </a>
                        )}

                        {contactInfo.phone && (
                            <a
                                href={`tel:${contactInfo.phone}`}
                                className="flex items-center justify-center space-x-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
                                style={{ color: textColor }}
                                onClick={() => handlePhoneClick(contactInfo.phone!)}
                            >
                                <Phone size={16} />
                                <span>{contactInfo.phone}</span>
                            </a>
                        )}

                        {contactInfo.address && (
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(contactInfo.address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center space-x-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
                                style={{ color: textColor }}
                                onClick={() => handleAddressClick(contactInfo.address!)}
                            >
                                <MapPin size={16} />
                                <span>{contactInfo.address}</span>
                            </a>
                        )}

                        {contactInfo.website && (
                            <a
                                href={contactInfo.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center space-x-2 text-sm opacity-80 hover:opacity-100 transition-opacity"
                                style={{ color: textColor }}
                                onClick={() => handleWebsiteClick(contactInfo.website!)}
                            >
                                <Globe size={16} />
                                <span>{contactInfo.website.replace(/^https?:\/\//, '')}</span>
                            </a>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="pt-8 text-xs opacity-60" style={{ color: textColor }}>
                    <Link href="/" className="hover:opacity-100 transition-opacity">
                        Powered by CrownPages
                    </Link>
                </div>
            </div>
        </div>
    );
} 