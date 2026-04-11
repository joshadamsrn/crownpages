import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { SectionStyles } from '@/types';
import { generatePublicUrl } from '@/lib/supabase/client';
import { resolveVideoUrl, isMuxUrl } from '@/lib/resolve-video-url';
import { MuxVideoPlayer } from '../MuxVideoPlayer';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Testimonial } from '@crown-pages/types';

// Move TestimonialMedia type to module scope
type TestimonialMedia = {
  id: string;
  avatarUrl?: string;
  testimonialImageUrl?: string;
  videoUrl?: string;
};

interface TestimonialsData {
  title?: string;
  testimonials: Testimonial[];
}

interface TestimonialsSectionProps {
  data: TestimonialsData;
  business: BusinessData;
  pageId: string;
  sectionId: string;
  styles?: SectionStyles;
}

const StarRating = ({
  rating,
  theme,
}: {
  rating: number;
  theme: { accent: string; text: { muted: string } };
}) => {
  return (
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="w-4 h-4"
          style={{ color: star <= rating ? '#FFD700' : theme.text.muted }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

export function TestimonialsSection({
  data,
  styles,
}: TestimonialsSectionProps) {
  const { title, testimonials } = data;
  const theme = useTheme();

  const [mediaUrlsData, setMediaUrlsData] = useState<TestimonialMedia[]>([]);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const paginationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadMediaData = async () => {
      const mediaPromises = testimonials.map(async (testimonial) => {
        const media: TestimonialMedia = { id: testimonial.id };

        // Load avatar (profile picture)
        if (testimonial.avatar) {
          try {
            const avatarUrl = await generatePublicUrl(testimonial.avatar);
            if (avatarUrl) {
              media.avatarUrl = avatarUrl;
            }
          } catch (error) {
            console.error(
              `Failed to load avatar for ${testimonial.id}:`,
              error
            );
          }
        }

        // Load testimonial content based on asset_type
        if (testimonial.asset_type === 'video' && testimonial.video_uri) {
          try {
            // Mux videos are already full URLs — pass through directly
            if (isMuxUrl(testimonial.video_uri)) {
              media.videoUrl = testimonial.video_uri;
            } else {
              const videoUrl = await generatePublicUrl(testimonial.video_uri);
              if (videoUrl) {
                media.videoUrl = videoUrl;
              }
            }
          } catch (error) {
            console.error(`Failed to load video for ${testimonial.id}:`, error);
          }
        } else if (
          testimonial.asset_type === 'image' &&
          testimonial.testimonial_image
        ) {
          try {
            const testimonialImageUrl = await generatePublicUrl(
              testimonial.testimonial_image
            );
            if (testimonialImageUrl) {
              media.testimonialImageUrl = testimonialImageUrl;
            }
          } catch (error) {
            console.error(
              `Failed to load testimonial image for ${testimonial.id}:`,
              error
            );
          }
        }

        return media;
      });

      const mediaData = await Promise.all(mediaPromises);
      setMediaUrlsData(mediaData);
    };

    if (testimonials.length > 0) {
      loadMediaData();
    }
  }, [testimonials]);

  const getMediaForTestimonial = (id: string) => {
    return mediaUrlsData.find((media) => media.id === id);
  };

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  return (
    <section
      className="py-20 px-4"
      style={{ backgroundColor: styles?.surface || theme.surface }}
    >
      <div className="max-w-7xl mx-auto">
        {title && (
          <div className="text-center mb-16">
            <h2
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: styles?.text?.primary || theme.text.primary }}
            >
              {title}
            </h2>
            <div
              className="w-24 h-1 mx-auto rounded-full"
              style={{ backgroundColor: styles?.primary || theme.primary }}
            />
          </div>
        )}

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              media={getMediaForTestimonial(testimonial.id)}
              styles={styles}
              theme={theme}
            />
          ))}
        </div>

        {/* Mobile: Swiper carousel */}
        <div className="md:hidden">
          <Swiper
            modules={[Navigation, Pagination]}
            onSwiper={setSwiperInstance}
            pagination={{
              el: paginationRef.current,
              clickable: true,
              bulletClass: 'swiper-pagination-bullet',
              bulletActiveClass: 'swiper-pagination-bullet-active',
            }}
            navigation={{
              nextEl: '.testimonials-next',
              prevEl: '.testimonials-prev',
            }}
            spaceBetween={24}
            slidesPerView={1}
            className="w-full pb-12"
          >
            {testimonials.map((testimonial) => (
              <SwiperSlide key={testimonial.id}>
                <TestimonialCard
                  testimonial={testimonial}
                  media={getMediaForTestimonial(testimonial.id)}
                  styles={styles}
                  theme={theme}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              className="testimonials-prev w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
              style={{
                borderColor: styles?.primary || theme.primary,
                color: styles?.primary || theme.primary,
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div
              ref={paginationRef}
              className="testimonials-pagination flex gap-2"
            />

            <button
              className="testimonials-next w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
              style={{
                borderColor: styles?.primary || theme.primary,
                color: styles?.primary || theme.primary,
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .testimonials-pagination .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          background: ${styles?.text?.muted || theme.text.muted};
          opacity: 0.3;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        .testimonials-pagination .swiper-pagination-bullet-active {
          background: ${styles?.primary || theme.primary};
          opacity: 1;
          transform: scale(1.2);
        }
      `}</style>
    </section>
  );
}

interface TestimonialCardProps {
  testimonial: Testimonial;
  media?: TestimonialMedia;
  styles?: SectionStyles;
  theme: any;
}

function TestimonialCard({
  testimonial,
  media,
  styles,
  theme,
}: TestimonialCardProps) {
  return (
    <div
      className="relative p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col"
      style={{
        backgroundColor: styles?.background || theme.background,
        border: `1px solid ${styles?.text?.muted || theme.text.muted}20`,
      }}
    >
      {/* Quote Icon */}
      <div className="absolute top-6 right-6 opacity-10">
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
        </svg>
      </div>

      {/* Rating */}
      {testimonial.rating && (
        <div className="mb-6">
          <StarRating rating={testimonial.rating} theme={theme} />
        </div>
      )}

      {/* Testimonial Text */}
      {testimonial.text && (
        <blockquote
          className="text-lg leading-relaxed mb-8 flex-grow italic"
          style={{
            color: styles?.text?.secondary || theme.text.secondary,
          }}
        >
          &ldquo;{testimonial.text}&rdquo;
        </blockquote>
      )}

      {/* Media Content */}
      <div className="mb-6">
        {/* Testimonial Image */}
        {media?.testimonialImageUrl && testimonial.asset_type === 'image' && (
          <div className="testimonial-image mb-6">
            <Image
              src={media.testimonialImageUrl}
              alt={`Testimonial image from ${testimonial.name}`}
              width={400}
              height={250}
              className="w-full h-48 object-cover rounded-xl"
              unoptimized
            />
          </div>
        )}

        {/* Video Testimonial */}
        {media?.videoUrl && testimonial.asset_type === 'video' && (
          <div className="mb-6">
            {isMuxUrl(media.videoUrl) ? (
              <MuxVideoPlayer
                playbackId={media.videoUrl.slice(4)}
                className="rounded-xl overflow-hidden"
              />
            ) : (
              <CustomTestimonialVideoPlayer src={media.videoUrl} />
            )}
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div
        className="flex items-center pt-6 border-t border-opacity-10"
        style={{ borderColor: styles?.text?.muted || theme.text.muted }}
      >
        {media?.avatarUrl ? (
          <Image
            src={media.avatarUrl}
            alt={testimonial.name}
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover"
            style={{
              boxShadow: `0 0 0 4px ${(styles?.primary || theme.primary)}20`
            }}
            unoptimized
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl"
            style={{
              backgroundColor: styles?.primary || theme.primary,
              boxShadow: `0 0 0 4px ${(styles?.primary || theme.primary)}20`,
            }}
          >
            {testimonial.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="ml-4">
          <div
            className="font-semibold text-lg"
            style={{
              color: styles?.text?.primary || theme.text.primary,
            }}
          >
            {testimonial.name}
          </div>
          {(testimonial.position || testimonial.company) && (
            <div
              className="text-sm font-medium"
              style={{
                color: styles?.text?.muted || theme.text.muted,
              }}
            >
              {testimonial.position}
              {testimonial.position && testimonial.company && ' • '}
              {testimonial.company}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomTestimonialVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      setShowOverlay(false);
    };

    const onPause = () => {
      setIsPlaying(false);
      setShowOverlay(true);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-lg">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-48 object-cover bg-black"
        controls={isPlaying}
        playsInline
        onClick={handlePlayPause}
        poster=""
      />
      {showOverlay && (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center focus:outline-none transition-all hover:bg-black hover:bg-opacity-20"
        >
          <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-full p-4 shadow-lg transform transition-all hover:scale-110">
            {isPlaying ? (
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5,3 19,12 5,21 5,3" />
              </svg>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
