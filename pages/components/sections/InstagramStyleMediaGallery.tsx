'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '@/lib/analytics';
import Lightbox from 'yet-another-react-lightbox';
import { Slide, SlideImage, SlideVideo } from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation } from 'swiper/modules';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import { MuxVideoPlayer } from '../MuxVideoPlayer';
import { isMuxUrl } from '@/lib/resolve-video-url';

type MediaItem = {
    type: 'image' | 'video';
    url: string;
    name: string;
    caption?: string;
};

interface InstagramStyleMediaGalleryProps {
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

const getVideoType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'mp4': return 'video/mp4';
        case 'webm': return 'video/webm';
        case 'ogg': return 'video/ogg';
        case 'mov': return 'video/quicktime';
        default: return 'video/mp4';
    }
};

export default function InstagramStyleMediaGallery({ 
    images, 
    videos, 
    title, 
    wrapperMode = false,
    pageId,
    sectionId,
}: InstagramStyleMediaGalleryProps) {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    const [mediaCounts, setMediaCounts] = useState({ videos: 0, images: 0, total: 0 });

    const openMedia = useCallback((index: number, isVideo: boolean) => {
        setLightboxIndex(index);
        if (pageId) {
            trackEvent({
                pageId,
                eventType: isVideo ? 'video_click' : 'photo_click',
                eventData: { section_type: 'gallery', section_id: sectionId, media_index: index },
            }).catch(() => {});
        }
    }, [pageId, sectionId]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        
        const handleResize = () => checkMobile();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const processMediaData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const allMedia: MediaItem[] = [];

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
                setIsLoading(false);
                return;
            }

            setMediaCounts({
                videos: videos?.length || 0,
                images: images?.length || 0,
                total: allMedia.length
            });

            const sortedMedia = [...allMedia].sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'video' ? -1 : 1;
                }
                return a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            const lightboxSlides = sortedMedia.map(item => {
                if (item.type === 'image') {
                    return {
                        src: item.url,
                        alt: item.name,
                        caption: item.caption || item.name,
                        width: 1280,
                        height: 720,
                        mediaType: 'image',
                    } as SlideImage & { mediaType: string };
                } else {
                    const isMux = isMuxUrl(item.url);
                    const playbackId = isMux ? item.url.slice(4) : null;
                    const hlsSrc = isMux ? `https://stream.mux.com/${playbackId}.m3u8` : item.url;
                    const thumbSrc = isMux
                      ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
                      : undefined;
                    return {
                        type: 'video',
                        width: 1280,
                        height: 720,
                        sources: [{ src: hlsSrc, type: isMux ? 'application/x-mpegURL' : getVideoType(item.url) }],
                        poster: thumbSrc,
                        caption: item.name,
                        mediaType: 'video',
                        videoUrl: item.url,
                        muxPlaybackId: playbackId,
                        thumbnailUrl: thumbSrc,
                    } as SlideVideo & { mediaType: string; videoUrl: string; muxPlaybackId: string | null; thumbnailUrl: string | undefined };
                }
            });

            setSlides(lightboxSlides);
            setIsLoading(false);
        } catch (error) {
            console.error('Error processing media:', error);
            setLoadError(error instanceof Error ? error.message : 'Failed to load media');
            setIsLoading(false);
        }
    }, [images, videos]);

    useEffect(() => {
        processMediaData();
    }, [processMediaData]);

    if (isLoading) {
        return (
            <div className={wrapperMode ? "" : "mt-8 border-t border-gray-200 pt-6"}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{title || 'Photos & Videos'}</h2>
                <div className="flex gap-3 overflow-hidden">
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-32 h-32 md:w-48 md:h-48 bg-gray-200 animate-pulse rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className={wrapperMode ? "" : "mt-8 border-t border-gray-200 pt-6"}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{title || 'Photos & Videos'}</h2>
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-red-800">Error loading media: {loadError}</p>
                </div>
            </div>
        );
    }

    if (slides.length === 0) return null;

    return (
        <div className={wrapperMode ? "" : "mt-8 border-t border-gray-200 pt-6"}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title || 'Photos & Videos'}</h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {mediaCounts.images > 0 && (
                            <div className="inline-flex items-center gap-1">
                                <span className="text-sm font-medium text-gray-700">{mediaCounts.images}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                        {mediaCounts.videos > 0 && (
                            <div className="inline-flex items-center gap-1">
                                <span className="text-sm font-medium text-gray-700">{mediaCounts.videos}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {slides.length > 0 && (
                        <button
                            onClick={() => openMedia(0, (slides[0] as any)?.mediaType === 'video')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium text-sm hover:bg-gray-50 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            View All
                        </button>
                    )}
                </div>
            </div>

            <div className={`${isMobile === false ? 'hidden' : 'block md:hidden'}`}>
                <Swiper
                    modules={[FreeMode]}
                    spaceBetween={12}
                    slidesPerView={2.2}
                    freeMode={true}
                    className="!pb-2"
                >
                    {slides.map((slide: any, index) => {
                        const mediaType = slide.mediaType || (slide.type === 'video' ? 'video' : 'image');
                        const isVideo = mediaType === 'video';
                        
                        return (
                            <SwiperSlide key={index}>
                                <div
                                    className="relative aspect-square cursor-pointer group"
                                    onClick={() => openMedia(index, isVideo)}
                                >
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-100 shadow-md">
                                        {isVideo ? (
                                            (slide as any).muxPlaybackId ? (
                                                <img
                                                    src={(slide as any).thumbnailUrl}
                                                    alt="Video thumbnail"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video
                                                    src={(slide as any).videoUrl}
                                                    className="w-full h-full object-cover"
                                                    preload="metadata"
                                                    muted
                                                    playsInline
                                                    poster=""
                                                />
                                            )
                                        ) : (
                                            <img
                                                src={(slide as any).src}
                                                alt={(slide as any).alt || 'Media'}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        
                                        {isVideo && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <div className="w-14 h-14 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="absolute inset-0 bg-black opacity-0 group-active:opacity-10 transition-opacity duration-150" />
                                    </div>
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
            </div>

            <div className={`relative ${isMobile === true ? 'hidden' : 'hidden md:block'}`}>
                <Swiper
                    modules={[Navigation]}
                    spaceBetween={16}
                    slidesPerView={3}
                    navigation={{
                        nextEl: '.swiper-button-next-custom',
                        prevEl: '.swiper-button-prev-custom',
                    }}
                    breakpoints={{
                        768: { slidesPerView: 3 },
                        1024: { slidesPerView: 4 },
                    }}
                    className="!pb-2"
                >
                    {slides.map((slide: any, index) => {
                        const mediaType = slide.mediaType || (slide.type === 'video' ? 'video' : 'image');
                        const isVideo = mediaType === 'video';
                        
                        return (
                            <SwiperSlide key={index}>
                                <div
                                    className="relative aspect-square cursor-pointer group overflow-hidden rounded-xl bg-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                    onClick={() => openMedia(index, isVideo)}
                                >
                                    {isVideo ? (
                                        slide.muxPlaybackId ? (
                                            <img
                                                src={slide.thumbnailUrl}
                                                alt="Video thumbnail"
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <video
                                                src={slide.videoUrl}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                preload="metadata"
                                                muted
                                                playsInline
                                                poster=""
                                            />
                                        )
                                    ) : (
                                        <img
                                            src={slide.src}
                                            alt={slide.alt || 'Media'}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                    )}
                                    
                                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                                    
                                    {isVideo && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SwiperSlide>
                        );
                    })}
                </Swiper>
                
                {slides.length > 3 && (
                    <>
                        <button 
                            className="swiper-button-prev-custom absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110 disabled:opacity-0"
                            aria-label="Previous"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button 
                            className="swiper-button-next-custom absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110 disabled:opacity-0"
                            aria-label="Next"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            <Lightbox
                open={lightboxIndex >= 0}
                index={lightboxIndex}
                close={() => setLightboxIndex(-1)}
                slides={slides}
                plugins={[Zoom, Counter]}
                carousel={{
                    finite: false,
                    preload: 2,
                    spacing: 0,
                    imageFit: 'contain',
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
                    container: { backgroundColor: 'rgba(0, 0, 0, .95)' },
                }}
                controller={{
                    closeOnBackdropClick: true,
                }}
                render={{
                    // We own all video rendering — no Video plugin to conflict with.
                    // Mux → MuxVideoPlayer (hls.js handles HLS in Chrome/Firefox).
                    // Legacy Supabase MP4 → plain <video> (backward compatible).
                    // Non-video slides return undefined so YARL renders images normally.
                    slide: ({ slide }) => {
                        const s = slide as any;
                        if (s.type !== 'video') return undefined;

                        if (s.muxPlaybackId) {
                            return (
                                <div className="flex items-center justify-center w-full h-full p-4">
                                    <div style={{ width: '100%', maxWidth: 720 }}>
                                        <MuxVideoPlayer playbackId={s.muxPlaybackId} />
                                    </div>
                                </div>
                            );
                        }

                        // Legacy non-Mux video — MP4/MOV stored in Supabase, plays natively
                        const videoSrc = s.sources?.[0]?.src || s.videoUrl;
                        if (videoSrc) {
                            return (
                                <div className="flex items-center justify-center w-full h-full">
                                    <video
                                        src={videoSrc}
                                        controls
                                        playsInline
                                        poster={s.poster}
                                        style={{ maxWidth: '100%', maxHeight: '80vh' }}
                                    />
                                </div>
                            );
                        }

                        return undefined;
                    },
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
                }}
            />
        </div>
    );
}
