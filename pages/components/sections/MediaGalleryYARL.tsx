'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Lightbox from 'yet-another-react-lightbox';
import { Slide, SlideImage, SlideVideo } from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Image from 'next/image';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import MediaGalleryDesktop from './MediaGalleryDesktop';
import MediaGalleryMobile from './MediaGalleryMobile';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'yet-another-react-lightbox/plugins/captions.css';

type MediaItem = {
    type: 'image' | 'video';
    url: string;
    name: string;
    thumbnailUrl?: string;
    generatedThumbnail?: string;
    caption?: string;
};

interface MediaGalleryProps {
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
    wrapperMode?: boolean; // When true, parent handles section styling (no border/spacing)
}

// Helper function to get video type from URL
const getVideoType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'ogg':
            return 'video/ogg';
        case 'mov':
            return 'video/quicktime';
        default:
            return 'video/mp4'; // Default fallback
    }
};

// Debounce helper
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export default function MediaGalleryYARL({ images, videos, title, wrapperMode = false }: MediaGalleryProps) {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mediaCounts, setMediaCounts] = useState({ videos: 0, images: 0, total: 0 });
    const [index, setIndex] = useState(-1);
    const [inlineIndex, setInlineIndex] = useState(0);
    const [videoRefs] = useState<{ [key: string]: HTMLVideoElement }>({});
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    const [thumbnailsGenerated, setThumbnailsGenerated] = useState<Set<string>>(new Set());

    // Screen size detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640); // sm breakpoint in Tailwind
        };

        // Check initially
        checkMobile();

        // Add debounced resize listener
        const debouncedCheck = debounce(checkMobile, 250);
        window.addEventListener('resize', debouncedCheck);

        return () => {
            window.removeEventListener('resize', debouncedCheck);
        };
    }, []);

    const processMediaData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const allMedia: MediaItem[] = [];

            // Process images
            if (images && images.length > 0) {
                images.forEach(image => {
                    allMedia.push({
                        type: 'image',
                        url: image.url,
                        name: image.alt || `Image ${image.id}`,
                        caption: image.caption
                    });
                });
            }

            // Process videos
            if (videos && videos.length > 0) {
                videos.forEach(video => {
                    allMedia.push({
                        type: 'video',
                        url: video.url,
                        name: `Video ${video.id}`
                    });
                });
            }

            if (allMedia.length === 0) {
                console.log('No media found');
                setIsLoading(false);
                return;
            }

            console.log(`Loaded media: ${allMedia.length} total items`);

            setMediaCounts({
                videos: videos?.length || 0,
                images: images?.length || 0,
                total: allMedia.length
            });

            // Sort media - videos first, then alphabetically by name
            const sortedMedia = [...allMedia].sort((a, b) => {
                // First sort by type (videos first)
                if (a.type !== b.type) {
                    return a.type === 'video' ? -1 : 1;
                }

                // Then sort by natural order (numeric first, then alphabetical)
                return a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            // Convert MediaItems to Lightbox slides
            const lightboxSlides = sortedMedia.map(item => {
                if (item.type === 'image') {
                    return {
                        src: item.url,
                        alt: item.name,
                        caption: item.caption || item.name,
                        loading: 'lazy',
                        width: 1280,
                        height: 720,
                    } as SlideImage;
                } else {
                    // Video type
                    return {
                        type: 'video',
                        width: 1280,
                        height: 720,
                        sources: [
                            {
                                src: item.url,
                                type: getVideoType(item.url)
                            }
                        ],
                        caption: item.name
                    } as SlideVideo;
                }
            });

            setSlides(lightboxSlides);
        } catch (error) {
            console.error('Error processing media:', error);
            setLoadError(error instanceof Error ? error.message : 'Failed to load media');
        } finally {
            setIsLoading(false);
        }
    }, [images, videos]);

    useEffect(() => {
        processMediaData();
    }, [processMediaData]);

    // Function to generate a thumbnail from a video at the 3-second mark
    const generateThumbnailFromVideo = (videoElement: HTMLVideoElement): Promise<string> => {
        return new Promise((resolve, reject) => {
            // Set to 3 seconds
            videoElement.currentTime = 3;

            // Once the video has seeked to that position
            const handleSeeked = () => {
                try {
                    // Create a canvas to capture the frame
                    const canvas = document.createElement('canvas');
                    canvas.width = videoElement.videoWidth;
                    canvas.height = videoElement.videoHeight;

                    // Draw the video frame to the canvas
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                    // Convert to a data URL
                    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(thumbnailUrl);
                } catch (error) {
                    reject(error);
                }

                // Remove the event listener to prevent memory leaks
                videoElement.removeEventListener('seeked', handleSeeked);
            };

            // Add error handling
            const handleError = (e: ErrorEvent) => {
                reject(new Error(`Video loading error: ${e.message}`));
                videoElement.removeEventListener('error', handleError as EventListener);
            };

            videoElement.addEventListener('seeked', handleSeeked);
            videoElement.addEventListener('error', handleError as EventListener);
        });
    };

    // Generate thumbnails for videos after media is loaded
    useEffect(() => {
        const generateVideoThumbnails = async () => {
            // Only process videos without thumbnails
            const videosNeedingThumbnails = slides.filter(slide =>
                slide.type === 'video' && !slide.poster
            );

            if (videosNeedingThumbnails.length === 0) return;

            const updatedSlides = [...slides];
            let hasUpdates = false;

            for (const slide of videosNeedingThumbnails) {
                if (slide.type !== 'video' || !slide.sources?.[0]?.src) continue;

                const videoUrl = slide.sources[0].src;
                const index = updatedSlides.findIndex(s => s === slide);
                if (index === -1) continue;

                try {
                    // Create a video element if it doesn't exist
                    if (!videoRefs[videoUrl]) {
                        const videoEl = document.createElement('video');
                        videoEl.crossOrigin = 'anonymous';
                        videoEl.src = videoUrl;
                        videoEl.muted = true;
                        videoEl.playsInline = true;
                        videoRefs[videoUrl] = videoEl;
                        
                        // Wait for video to load metadata
                        await new Promise((resolve, reject) => {
                            const timeout = setTimeout(() => reject(new Error('Video load timeout')), 10000);
                            videoEl.addEventListener('loadedmetadata', () => {
                                clearTimeout(timeout);
                                resolve(true);
                            }, { once: true });
                            videoEl.addEventListener('error', (e) => {
                                clearTimeout(timeout);
                                reject(e);
                            }, { once: true });
                            videoEl.load();
                        });
                    }

                    const thumbnail = await generateThumbnailFromVideo(videoRefs[videoUrl]);
                    const videoSlide = updatedSlides[index] as SlideVideo;
                    updatedSlides[index] = {
                        ...videoSlide,
                        poster: thumbnail,
                        thumbnail: thumbnail
                    } as SlideVideo;
                    hasUpdates = true;
                } catch (error) {
                    console.error(`Error generating thumbnail for video:`, error);
                    // Create a fallback gray thumbnail
                    const canvas = document.createElement('canvas');
                    canvas.width = 1280;
                    canvas.height = 720;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#1F2937'; // Gray background instead of pure black
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        const fallbackThumbnail = canvas.toDataURL('image/jpeg', 0.8);
                        const videoSlide = updatedSlides[index] as SlideVideo;
                        updatedSlides[index] = {
                            ...videoSlide,
                            poster: fallbackThumbnail,
                            thumbnail: fallbackThumbnail
                        } as SlideVideo;
                        hasUpdates = true;
                    }
                }
            }

            if (hasUpdates) {
                setSlides(updatedSlides);
            }
        };

        if (slides.length > 0) {
            generateVideoThumbnails();
        }
    }, [slides.length]);

    // If we're loading, show a skeleton
    if (isLoading) {
        return (
            <div className={wrapperMode ? "" : "mt-8 border-t border-gray-200 pt-6"}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{title || 'Photos & Videos'}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    // If there was an error, show an error message
    if (loadError) {
        return (
            <div className={wrapperMode ? "" : "mt-8 border-t border-gray-200 pt-6"}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{title || 'Photos & Videos'}</h2>
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-800">Error loading media: {loadError}</p>
                    <Button
                        onClick={processMediaData}
                        variant="outline"
                        className="mt-2"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // If there's no media, don't show this section
    if (slides.length === 0) {
        return null;
    }

    // Don't render anything until we know the screen size
    if (isMobile === null) {
        return null;
    }

    return (
        <div className={wrapperMode ? "" : "mt-8 border-t border-gray-200 pt-6"}>
            <style jsx global>{`
        /* Override buttons and icons in gallery view */
        .yarl__thumbnails_toggle {
          color: #374151 !important;
          filter: none !important;
          transform: scale(1.2) !important;
          opacity: 1 !important;
          box-shadow: none !important;
        }
        
        .yarl__thumbnails_toggle svg {
          stroke-width: 2px !important;
          filter: none !important;
          box-shadow: none !important;
        }

        /* Target all buttons and icons */
        .yarl__button {
          box-shadow: none !important;
          filter: none !important;
          background: transparent !important;
        }

        .yarl__icon {
          filter: none !important;
          box-shadow: none !important;
          color: #374151 !important;
          stroke-width: 2px !important;
        }

        /* Navigation arrows */
        .yarl__navigation_prev, 
        .yarl__navigation_next {
          background: transparent !important;
          filter: none !important;
          box-shadow: none !important;
        }

        /* Ensure SVG elements don't have shadows */
        .yarl__navigation_prev svg,
        .yarl__navigation_next svg,
        .yarl__button svg {
          filter: none !important;
          box-shadow: none !important;
        }
      `}</style>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{title || 'Photos & Videos'}</h2>
                <div className="flex space-x-2">
                    {mediaCounts.images > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {mediaCounts.images}
                        </span>
                    )}
                    {mediaCounts.videos > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            {mediaCounts.videos}
                        </span>
                    )}
                </div>
            </div>

            {/* Conditionally render either Desktop or Mobile gallery */}
            {isMobile ? (
                <MediaGalleryMobile
                    slides={slides}
                    inlineIndex={inlineIndex}
                    setInlineIndex={setInlineIndex}
                    setFullscreenIndex={setIndex}
                />
            ) : (
                <MediaGalleryDesktop
                    slides={slides}
                    inlineIndex={inlineIndex}
                    setInlineIndex={setInlineIndex}
                    setFullscreenIndex={setIndex}
                />
            )}

            {/* Full Lightbox Modal */}
            <Lightbox
                open={index >= 0}
                index={index}
                close={() => setIndex(-1)}
                slides={slides}
                plugins={[Video, Zoom, Thumbnails, Counter, Captions]}
                carousel={{
                    finite: false,
                    preload: 3,
                    spacing: 30,
                    imageFit: 'contain',
                }}
                thumbnails={{
                    position: 'bottom',
                    width: 120,
                    height: 80,
                    imageFit: 'cover',
                    gap: 16,
                    showToggle: true,
                    hidden: false
                }}
                video={{
                    autoPlay: false,
                    playsInline: true,
                    controls: true,
                }}
                zoom={{
                    maxZoomPixelRatio: 3,
                    scrollToZoom: true,
                }}
                animation={{
                    fade: 300,
                    swipe: 500,
                }}
                styles={{
                    container: { backgroundColor: 'rgba(0, 0, 0, .9)' },
                    button: {
                        color: '#9CA3AF',
                        background: 'transparent',
                    },
                    icon: {
                        color: '#9CA3AF',
                        filter: 'none',
                        width: '48px',
                        height: '48px',
                        strokeWidth: 2,
                    },
                    thumbnailsContainer: {
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    },
                }}
                controller={{
                    touchAction: 'pan-y',
                    closeOnBackdropClick: true,
                }}
                render={{
                    // Custom image loading behavior
                    slide: ({ slide, rect }) => {
                        // Only customize image slides
                        if (slide.type === 'image' && 'src' in slide) {
                            // Calculate appropriate dimensions
                            const width = slide.width && slide.height
                                ? Math.round(Math.min(rect.width, (rect.height / slide.height) * slide.width))
                                : rect.width;

                            const height = slide.width && slide.height
                                ? Math.round(Math.min(rect.height, (rect.width / slide.width) * slide.height))
                                : rect.height;

                            return (
                                <Image
                                    src={slide.src}
                                    alt={slide.alt || ""}
                                    width={width}
                                    height={height}
                                    loading={index >= 0 ? "eager" : "lazy"}
                                    decoding="async"
                                    draggable={false}
                                    style={{
                                        minWidth: 0,
                                        minHeight: 0,
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        objectFit: "contain",
                                    }}
                                />
                            );
                        }

                        // Return undefined to use default rendering for videos and other content
                        return undefined;
                    },
                    // Add custom navigation icons
                    iconPrev: () => (
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    ),
                    iconNext: () => (
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    ),
                    iconClose: () => (
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    ),
                    // Custom thumbnail rendering for videos
                    thumbnail: ({ slide, rect }) => {
                        // Only customize video thumbnails
                        if (slide.type !== 'video') return undefined;

                        const poster = (slide as SlideVideo).poster;
                        if (!poster) return undefined;

                        return (
                            <div className="relative" style={{ width: rect.width, height: rect.height }}>
                                <Image
                                    src={poster}
                                    alt=""
                                    width={rect.width}
                                    height={rect.height}
                                    loading="lazy"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '4px',
                                        border: '0.5px solid rgba(255, 255, 255, 0.3)',
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        );
                    },
                }}
            />
        </div>
    );
} 