import { Slide } from 'yet-another-react-lightbox';
import Lightbox from 'yet-another-react-lightbox';
import Inline from 'yet-another-react-lightbox/plugins/inline';
import Video from 'yet-another-react-lightbox/plugins/video';

interface MediaGalleryMobileProps {
    slides: Slide[];
    inlineIndex: number;
    setInlineIndex: (index: number) => void;
    setFullscreenIndex: (index: number) => void;
}

export default function MediaGalleryMobile({
    slides,
    inlineIndex,
    setInlineIndex,
    setFullscreenIndex
}: MediaGalleryMobileProps) {
    return (
        <div className="block sm:hidden">
            <Lightbox
                index={inlineIndex}
                slides={slides}
                plugins={[Inline, Video]}
                inline={{
                    style: {
                        width: '100%',
                        aspectRatio: '16 / 9',
                        margin: '0 auto',
                        position: 'relative',
                    }
                }}
                carousel={{
                    spacing: 0,
                    padding: 0,
                    preload: 3,
                    imageFit: 'contain',
                    finite: false,
                }}
                video={{
                    autoPlay: false,
                    playsInline: true,
                    controls: false,
                }}
                on={{
                    view: ({ index }) => setInlineIndex(index),
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
                    slideContainer: ({ slide, children }) => {
                        // Custom container for both images and videos
                        return (
                            <div
                                className="relative w-full h-full cursor-pointer flex items-center justify-center"
                                onClick={() => setFullscreenIndex(inlineIndex)}
                            >
                                {/* Base container for all content */}
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {children}

                                    {/* Show play button for videos */}
                                    {slide.type === 'video' && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}

                                    {/* Static fullscreen icon for images */}
                                    {slide.type === 'image' && (
                                        <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm rounded-full p-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    },
                }}
                styles={{
                    button: {
                        color: '#374151',
                        background: 'transparent',
                    },
                    icon: {
                        color: '#374151',
                        filter: 'none',
                        width: '40px',
                        height: '40px',
                        strokeWidth: 2,
                    }
                }}
            />

            {/* Mobile Progress Indicator - Show only first 10 dots if there are many */}
            <div className="flex justify-center items-center gap-1.5 mt-3 flex-wrap max-w-full px-4">
                {slides.slice(0, Math.min(slides.length, 10)).map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-200 ${idx === Math.min(inlineIndex, 9)
                            ? 'w-4 bg-gray-600'
                            : 'w-1.5 bg-gray-300'
                            }`}
                    />
                ))}
                {slides.length > 10 && (
                    <span className="text-xs text-gray-400 ml-1">...</span>
                )}
            </div>

            {/* Mobile Counter */}
            <div className="text-center text-sm text-gray-500 mt-2">
                {inlineIndex + 1} of {slides.length}
            </div>
        </div>
    );
} 