'use client';

import dynamic from 'next/dynamic';

// Loading component
const LoadingGallery = () => (
    <div className="py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
        </div>
    </div>
);

// Dynamically import the MediaGallery component with no SSR
const MediaGallery = dynamic(() => import('./MediaGalleryYARL'), {
    ssr: false,
    loading: LoadingGallery,
});

interface MediaGalleryWrapperProps {
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
    wrapperMode?: boolean; // When true, parent handles section styling
}

export default function MediaGalleryWrapper({ images, videos, title, wrapperMode }: MediaGalleryWrapperProps) {
    return <MediaGallery images={images} videos={videos} title={title} wrapperMode={wrapperMode} />;
} 