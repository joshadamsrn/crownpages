'use client';

import React, { useEffect, useState } from 'react';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { SectionStyles } from '@/types';
import { generatePublicUrl } from '@/lib/supabase/client';
import { isMuxUrl } from '@/lib/resolve-video-url';
import InstagramStyleMediaGalleryWrapper from './InstagramStyleMediaGalleryWrapper';

interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  thumbnail?: string;
}

interface GalleryVideo {
  id: string;
  url: string;
  thumbnail?: string;
}

interface GalleryData {
  title?: string;
  images: GalleryImage[];
  videos: GalleryVideo[];
}

interface GallerySectionProps {
  data: GalleryData;
  business?: BusinessData;
  pageId?: string;
  sectionId?: string;
  styles?: SectionStyles;
}

export function GallerySection({ data, styles, pageId, sectionId }: GallerySectionProps) {
  const { title = 'Photos & Videos', images, videos } = data;
  const theme = useTheme();
  const [processedImages, setProcessedImages] = useState<Array<{
    id: string;
    url: string;
    alt?: string;
    caption?: string;
  }>>([]);
  const [processedVideos, setProcessedVideos] = useState<Array<{
    id: string;
    url: string;
    thumbnail?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPublicUrls = async () => {
      setIsLoading(true);

      if (
        (!images || images.length === 0) &&
        (!videos || videos.length === 0)
      ) {
        setIsLoading(false);
        return;
      }

      // Process images
      if (images && images.length > 0) {
        const imagesWithUrls = (
          await Promise.all(
            images.map(async (image: GalleryImage) => {
              try {
                const url = await generatePublicUrl(image.url);
                if (!url) {
                  console.error('Failed to generate URL for image:', image.url);
                  return null;
                }
                return {
                  id: image.id,
                  url: url as string,
                  alt: image.alt,
                  caption: image.caption,
                };
              } catch (error) {
                console.error('Error loading image:', error);
                return null;
              }
            })
          )
        ).filter(Boolean) as Array<{
          id: string;
          url: string;
          alt?: string;
          caption?: string;
        }>;
        setProcessedImages(imagesWithUrls);
      }

      // Process videos
      if (videos && videos.length > 0) {
        const videosWithUrls = (
          await Promise.all(
            videos.map(async (video: GalleryVideo) => {
              try {
                // Mux URLs don't go through Supabase — pass them through directly
                if (isMuxUrl(video.url)) {
                  return { id: video.id, url: video.url, thumbnail: video.thumbnail };
                }
                const url = await generatePublicUrl(video.url);
                if (!url) {
                  console.error('Failed to generate URL for video:', video.url);
                  return null;
                }
                return {
                  id: video.id,
                  url: url as string,
                  thumbnail: video.thumbnail,
                };
              } catch (error) {
                console.error('Error loading video:', error);
                return null;
              }
            })
          )
        ).filter(Boolean) as Array<{
          id: string;
          url: string;
          thumbnail?: string;
        }>;
        setProcessedVideos(videosWithUrls);
      }

      setIsLoading(false);
    };

    loadPublicUrls();
  }, [images, videos]);

  if ((!images || images.length === 0) && (!videos || videos.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <section
        className="py-4 md:py-8"
        style={{ backgroundColor: styles?.background || '#FFFFFF' }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-black mb-6">
            {title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="py-4 md:py-8"
      style={{ backgroundColor: styles?.background || '#FFFFFF' }}
    >
      <div className="max-w-5xl mx-auto px-4">
        <InstagramStyleMediaGalleryWrapper
          images={processedImages}
          videos={processedVideos}
          title={title}
          wrapperMode={true}
          pageId={pageId}
          sectionId={sectionId}
        />
      </div>
    </section>
  );
}
