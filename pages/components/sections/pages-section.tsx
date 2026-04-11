'use client';

import React, { useState, useEffect } from 'react';
import { BusinessData } from '@crown-pages/types';
import { useTheme } from '../page-renderer';
import { TrackableButton } from '../trackable-button';
import { SectionStyles } from '@/types';
import Image from 'next/image';
import { ChevronRight, ExternalLink, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { MuxVideoPlayer } from '../MuxVideoPlayer';
import { isMuxUrl } from '@/lib/resolve-video-url';

interface PageItem {
  id: string;
  title: string;
  image?: string;
  type: 'file' | 'external_link';
  fileUrl?: string;
  fileType?: 'pdf' | 'image' | 'video' | 'other';
  fileName?: string;
  url?: string;
}

interface PagesData {
  title?: string;
  description?: string;
  pages: PageItem[];
  render_type?: 'vertical' | 'horizontal' | 'masonry';
}

interface PagesSectionProps {
  data: PagesData;
  business?: BusinessData;
  pageId?: string;
  sectionId?: string;
  styles?: SectionStyles;
}

const getImageUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
};

const getFileUrl = (path?: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
};

export function PagesSection({ data, business, pageId, sectionId, styles }: PagesSectionProps) {
  const { title, pages } = data;
  const displayTitle = title && title.trim() !== '' ? title : 'Pages';
  const theme = useTheme();
  const [selectedFile, setSelectedFile] = useState<PageItem | null>(null);
  const [showFileModal, setShowFileModal] = useState(false);

  if (!pages || pages.length === 0) {
    return null;
  }

  // Filter out empty pages
  const validPages = pages.filter(
    (page) => page.title && page.title.trim() !== ''
  );

  if (validPages.length === 0) {
    return null;
  }

  const handlePageClick = (page: PageItem) => {
    if (page.type === 'file' && page.fileUrl) {
      // Open file in modal
      setSelectedFile(page);
      setShowFileModal(true);
    } else if (page.type === 'external_link' && page.url) {
      // Open external link in new tab
      window.open(page.url, '_blank', 'noopener,noreferrer');
    }
  };

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-gray-600" />;
      case 'image':
        return <ImageIcon className="w-6 h-6 text-gray-600" />;
      case 'video':
        return <Video className="w-6 h-6 text-gray-600" />;
      default:
        return <FileText className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <>
      <section
        className="py-8 md:py-12 px-4"
        style={{ backgroundColor: styles?.background || '#fff' }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-black">
              {displayTitle}
            </h2>
          </div>

          {/* Pages Container with border */}
          <div className="border border-[#E5E5E5] rounded-[3px] bg-white">
            {validPages.map((page, index) => {
              const fullImageUrl = getImageUrl(page.image);
              const isLast = index === validPages.length - 1;

              const pageContent = (
                <div
                  className={`flex items-center justify-between py-4 px-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isLast ? 'border-b border-[#E5E5E5]' : ''
                  }`}
                  onClick={() => handlePageClick(page)}
                >
                  <div className="flex items-center flex-1">
                    {/* Icon/Image Container (60x50px) */}
                    <div className="w-[60px] h-[50px] rounded-[3px] bg-gray-100 flex items-center justify-center mr-3 overflow-hidden flex-shrink-0">
                      {fullImageUrl ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={fullImageUrl}
                            alt={page.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : page.type === 'file' ? (
                        getFileIcon(page.fileType)
                      ) : (
                        <ExternalLink className="w-6 h-6 text-gray-600" />
                      )}
                    </div>

                    {/* Title */}
                    <span className="text-base font-semibold text-black">
                      {page.title}
                    </span>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              );

              // Wrap with TrackableButton for analytics
              if (pageId && sectionId) {
                return (
                  <div key={page.id}>
                    <TrackableButton
                      href="#"
                      pageId={pageId}
                      sectionId={sectionId}
                      eventType="link_click"
                      eventData={{
                        page_title: page.title,
                        page_type: page.type,
                        file_type: page.fileType,
                        section_type: 'pages'
                      }}
                      className="block"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageClick(page);
                      }}
                    >
                      {pageContent}
                    </TrackableButton>
                  </div>
                );
              }

              return (
                <div key={page.id}>
                  {pageContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* File Viewer Modal */}
      {showFileModal && selectedFile && (
        <FileViewerModal
          file={selectedFile}
          onClose={() => {
            setShowFileModal(false);
            setSelectedFile(null);
          }}
        />
      )}
    </>
  );
}

// File Viewer Modal Component
function FileViewerModal({ file, onClose }: { file: PageItem; onClose: () => void }) {
  const fileUrl = getFileUrl(file.fileUrl);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!fileUrl) return null;

  const renderFileContent = () => {
    switch (file.fileType) {
      case 'pdf':
        return (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.title}
          />
        );
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img
              src={fileUrl}
              alt={file.title}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );
      case 'video':
        if (isMuxUrl(fileUrl)) {
          return (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <div className="w-full max-w-4xl">
                <MuxVideoPlayer playbackId={fileUrl.slice(4)} />
              </div>
            </div>
          );
        }
        return (
          <video
            src={fileUrl}
            controls
            className="w-full h-full"
            style={{ maxHeight: '100%' }}
          >
            Your browser does not support the video tag.
          </video>
        );
      default:
        return (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.title}
          />
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-black truncate flex-1 mr-4">
            {file.title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="w-full h-[calc(100%-60px)]">
          {renderFileContent()}
        </div>
      </div>
    </div>
  );
}

