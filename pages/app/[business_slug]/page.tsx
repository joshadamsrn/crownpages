import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BusinessPageRenderer } from "@/components/business-page-renderer";
import { BusinessPageAnalytics } from "@/components/analytics";

import type { Database } from "@/database.types";

type BusinessPageData = Database["public"]["Tables"]["business_pages"]["Row"] & {
    business: Database["public"]["Tables"]["businesses"]["Row"] | null;
};

interface PageProps {
    params: Promise<{ business_slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getBusinessPageData(businessSlug: string): Promise<BusinessPageData | null> {
    const supabase = await createClient();

    // First get the business
    const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", businessSlug)
        .single();

    if (businessError || !business) {
        console.error("Error fetching business:", businessError);
        return null;
    }

    // Then get the business page for this business
    const { data: businessPage, error: pageError } = await supabase
        .from("business_pages")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .eq("is_published", true)
        .maybeSingle();

    if (pageError || !businessPage) {
        console.error("Error fetching business page:", pageError);
        return null;
    }

    // Combine the data
    const businessPageData: BusinessPageData = {
        ...businessPage,
        business: business
    };

    return businessPageData;
}

export async function generateMetadata({
    params,
}: PageProps): Promise<Metadata> {
    const { business_slug } = await params;
    const businessPageData = await getBusinessPageData(business_slug);

    if (!businessPageData) {
        return {
            title: "Business Not Found | CrownPages",
            description: "The business page you are looking for does not exist.",
        };
    }

    const businessName = businessPageData.business?.name || "Business";
    const title = businessPageData.title || `Welcome to ${businessName}`;
    const description = businessPageData.description || `${businessName} - Connect with us`;

    return {
        title: `${title} | CrownPages`,
        description,
        openGraph: {
            title,
            description,
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
}

export default async function BusinessPage({ params }: PageProps) {
    const { business_slug } = await params;
    const businessPageData = await getBusinessPageData(business_slug);

    if (!businessPageData) {
        notFound();
    }

    // Create a default business object if none exists
    const business = businessPageData.business || {
        id: "",
        name: "Unknown Business",
        slug: "",
        owner_id: "",
        logo_url: null,
        primary_color: "#000000",
        secondary_color: "#ffffff",
        font_family: "Inter",
        email: null,
        phone: null,
        website: null,
        street_address: null,
        city: null,
        state: null,
        zip_code: null,
        country: null,
        description: null,
        is_active: true,
        created_at: null,
        updated_at: null,
    };

    const currentPath = `/${business_slug}`;

    return (
        <>
            <BusinessPageAnalytics
                businessPageId={businessPageData.id}
                businessId={business.id}
            />



            <div className="min-h-screen">
                <Suspense
                    fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}
                >
                    <BusinessPageRenderer
                        businessPageData={businessPageData}
                        business={business}
                    />
                </Suspense>
            </div>


        </>
    );
} 