import { Slide, SlideImage, SlideVideo } from 'yet-another-react-lightbox';
import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Video from 'yet-another-react-lightbox/plugins/video';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
// Make sure these stylesheets are imported
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface MediaGalleryDesktopProps {
    slides: Slide[];
    inlineIndex: number;
    setInlineIndex: (index: number) => void;
    setFullscreenIndex: (index: number) => void;
}

export default function MediaGalleryDesktop({
    slides,
    inlineIndex,
    setInlineIndex,
    setFullscreenIndex
}: MediaGalleryDesktopProps) {
    // Preload videos first, then preload images around current index
    const videoIndices = useMemo(() => {
        return slides
            .map((slide, index) => ({ slide, index }))
            .filter(item => item.slide.type === 'video')
            .map(item => item.index);
    }, [slides]);

    // Update preload state when current index changes
    useEffect(() => {
        // This is just to make sure videos are preloaded early
        // The actual preloading is handled by the carousel config
    }, [inlineIndex, videoIndices]);

    // Handler for clicks on slide content to open fullscreen
    const handleSlideClick = useCallback(() => {
        setFullscreenIndex(inlineIndex);
    }, [inlineIndex, setFullscreenIndex]);

    return (
        <>
            <div className="hidden sm:block mb-4">
                <style jsx global>{`
          /* Override buttons and icons in inline gallery view */
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

          /* Target all buttons and icons in the inline view */
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
                <Lightbox
                    index={inlineIndex}
                    slides={slides}
                    plugins={[Inline, Thumbnails, Video, Captions]}
                    inline={{
                        style: {
                            width: '100%',
                            maxWidth: '1200px',
                            aspectRatio: '16 / 9',
                            margin: '0 auto',
                            backgroundColor: 'white',
                        }
                    }}
                    thumbnails={{
                        position: 'bottom',
                        width: 120,
                        height: 80,
                        border: 0, // Remove border
                        borderRadius: 4,
                        padding: 4,
                        gap: 16,
                        imageFit: 'cover',
                        vignette: false,
                        showToggle: true,
                    }}
                    carousel={{
                        spacing: 0,
                        padding: 0,
                        preload: 3, // Increased from 2 to 3 for more aggressive preloading
                        imageFit: 'contain',
                        finite: slides.length <= 5,
                    }}
                    video={{
                        autoPlay: false,
                        playsInline: true,
                        controls: true,
                    }}
                    on={{
                        view: ({ index }) => setInlineIndex(index),
                        click: ({ index }) => {
                            // Only open fullscreen when clicking on non-video slides
                            const slide = slides[index];
                            if (slide && slide.type !== 'video') {
                                handleSlideClick();
                            }
                        },
                    }}
                    styles={{
                        container: { backgroundColor: 'white' },
                        button: {
                            color: '#374151',
                            background: 'transparent',
                        },
                        icon: {
                            color: '#374151',
                            filter: 'none',
                            width: '48px',
                            height: '48px',
                            strokeWidth: 2,
                        },
                        thumbnailsContainer: {
                            backgroundColor: 'white',
                            padding: '8px 0',
                        },
                        thumbnail: {
                            border: 'none',
                            backgroundColor: 'white',
                        }
                    }}
                    render={{
                        buttonPrev: slides.length <= 1 ? () => null : undefined,
                        buttonNext: slides.length <= 1 ? () => null : undefined,
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
                        thumbnail: ({ slide, rect }) => {
                            // Only customize video thumbnails, let default handling work for images
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
                                            border: '0.5px solid black',
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

            {/* View All Button - Desktop Only */}
            {slides.length > 1 && (
                <div className="hidden sm:block mt-4 text-center">
                    <Button
                        variant="outline"
                        onClick={() => setFullscreenIndex(0)}
                        className="w-full sm:w-auto bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 px-6 py-2 rounded-md font-medium text-sm transition-colors"
                    >
                        View all {slides.length} photos &amp; videos
                    </Button>
                </div>
            )}
        </>
    );
} 