'use client';

import dynamic from 'next/dynamic';

// Loading component
const LoadingGallery = () => (
    <div className="py-8">
        <div className="flex gap-2 overflow-hidden">
            {Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-32 h-32 md:w-48 md:h-48 bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
        </div>
    </div>
);

// Dynamically import the InstagramStyleMediaGallery component with no SSR
const InstagramStyleMediaGallery = dynamic(() => import('./InstagramStyleMediaGallery'), {
    ssr: false,
    loading: LoadingGallery,
});

interface InstagramStyleMediaGalleryWrapperProps {
    images: Array<{
        id: string;
        url: string;
        alt?: string;
        caption?: string;
    }>;
    videos: Array<{
        id: string;
        url: string;
    }>;
    title?: string;
    wrapperMode?: boolean;
    pageId?: string;
    sectionId?: string;
}

export default function InstagramStyleMediaGalleryWrapper({ 
    images, 
    videos, 
    title, 
    wrapperMode,
    pageId,
    sectionId,
}: InstagramStyleMediaGalleryWrapperProps) {
    return (
        <InstagramStyleMediaGallery 
            images={images} 
            videos={videos} 
            title={title} 
            wrapperMode={wrapperMode}
            pageId={pageId}
            sectionId={sectionId}
        />
    );
}

