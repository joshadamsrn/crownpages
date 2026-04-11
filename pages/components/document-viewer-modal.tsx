'use client';

import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { MuxVideoPlayer } from './MuxVideoPlayer';
import { resolveVideoUrl } from '@/lib/resolve-video-url';

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

// Set up PDF.js worker on client side only
let pdfjs: any;
if (typeof window !== 'undefined') {
  import('react-pdf').then((mod) => {
    pdfjs = mod.pdfjs;
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

interface MediaStackItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail?: string | null;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
  fileType?: 'pdf' | 'image' | 'video' | 'unknown';
  /** Thumbnail/poster URL for video files */
  thumbnail?: string;
  /** Pass instead of fileUrl to render a vertically-scrollable media stack */
  mediaItems?: MediaStackItem[];
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType = 'unknown',
  thumbnail,
  mediaItems,
}: DocumentViewerModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);

  // Set initial scale when modal opens, based on screen size
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const initialScale = window.innerWidth < 768 ? 0.85 : 1;
      setScale(initialScale);
    }
  }, [isOpen]);

  // Lock body scroll while modal is open so the page behind cannot be scrolled
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // When mediaItems is passed, render the stack viewer instead of a single file
  const isMediaStack = mediaItems && mediaItems.length > 0;

  // Detect file type from URL if not provided
  const detectedFileType = fileType === 'unknown' ? detectFileType(fileUrl) : fileType;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            {fileName && (
              <h3 className="text-white font-medium truncate">{fileName}</h3>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            aria-label="Download"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content Area — overscroll-contain prevents scroll from chaining to the page behind */}
        <div className={`flex-1 overflow-auto overscroll-contain flex justify-center p-4 ${isMediaStack && mediaItems!.length === 1 ? 'items-center' : 'items-start'}`}>
          {/* ---- Media Stack mode ---- */}
          {isMediaStack && (
            <div className={`flex flex-col items-center w-full mx-auto gap-4 pb-8 ${mediaItems!.length === 1 ? 'max-w-4xl' : 'max-w-3xl'}`}>
              {mediaItems!.map((item, idx) => {
                const resolved = item.type === 'video'
                  ? resolveVideoUrl(item.url)
                  : null;
                const mediaUrl = item.url.startsWith('http') ? item.url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${item.url}`;
                if (item.type === 'video') {
                  if (resolved?.type === 'mux') {
                    return (
                      <div key={item.id} className="w-full rounded-xl overflow-hidden bg-black shadow-2xl">
                        <MuxVideoPlayer
                          playbackId={resolved.playbackId}
                          poster={item.thumbnail ?? resolved.thumbnail}
                        />
                      </div>
                    );
                  }
                  const videoSrc = resolved?.type === 'direct' ? resolved.src : resolved?.src ?? mediaUrl;
                  const posterSrc = item.thumbnail
                    ? (item.thumbnail.startsWith('http') ? item.thumbnail : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${item.thumbnail}`)
                    : undefined;
                  return (
                    <div key={item.id} className="w-full rounded-xl overflow-hidden bg-black shadow-2xl">
                      <video
                        src={videoSrc}
                        poster={posterSrc}
                        controls
                        playsInline
                        className="w-full"
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={item.id}
                    className="w-full rounded-xl overflow-hidden shadow-2xl bg-black/10"
                    style={{ transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
                  >
                    <img
                      src={mediaUrl}
                      alt={`Item ${idx + 1}`}
                      className="w-full object-contain block"
                      draggable={false}
                    />
                  </div>
                );
              })}
              {/* Zoom controls for photo stack */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 flex items-center gap-4 z-10">
                <button
                  onClick={() => setScale((s) => Math.max(s - 0.05, 0.3))}
                  className="px-3 py-1 hover:bg-white/10 rounded transition-colors text-white"
                >
                  −
                </button>
                <span className="text-white font-medium min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(s + 0.05, 3))}
                  className="px-3 py-1 hover:bg-white/10 rounded transition-colors text-white"
                >
                  +
                </button>
                <div className="h-6 w-px bg-white/20 mx-2"></div>
                <span className="text-white font-medium">
                  {mediaItems!.length} {mediaItems!.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          )}

          {/* ---- Single-file modes (only when not media stack) ---- */}
          {!isMediaStack && detectedFileType === 'pdf' && (
            <div className="flex flex-col items-center w-full">
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Loading PDF...</p>
                  </div>
                }
                error={
                  <div className="text-white text-center">
                    <p>Failed to load PDF</p>
                    <button
                      onClick={handleDownload}
                      className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      Download Instead
                    </button>
                  </div>
                }
                className="flex flex-col items-center gap-4 pb-24"
              >
                {/* Render ALL pages for continuous scrolling */}
                {Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    scale={scale}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-2xl"
                    loading={
                      <div className="flex items-center justify-center p-8 bg-white/10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50"></div>
                      </div>
                    }
                  />
                ))}
              </Document>

              {/* PDF Controls - Fixed at bottom */}
              {numPages > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 flex items-center gap-4 z-10">
                  <button
                    onClick={() => setScale((s) => Math.max(s - 0.05, 0.5))}
                    className="px-3 py-1 hover:bg-white/10 rounded transition-colors text-white"
                  >
                    −
                  </button>
                  <span className="text-white font-medium min-w-[60px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale((s) => Math.min(s + 0.05, 3))}
                    className="px-3 py-1 hover:bg-white/10 rounded transition-colors text-white"
                  >
                    +
                  </button>
                  <div className="h-6 w-px bg-white/20 mx-2"></div>
                  <span className="text-white font-medium">
                    {numPages} {numPages === 1 ? 'page' : 'pages'}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isMediaStack && detectedFileType === 'image' && (
            <div className="flex flex-col items-center w-full">
              <div
                style={{ transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}
                className="w-full"
              >
                <img
                  src={fileUrl}
                  alt={fileName || 'Image'}
                  className="max-w-full object-contain mx-auto block shadow-2xl"
                  draggable={false}
                />
              </div>

              {/* Same zoom controls as PDF */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-6 py-3 flex items-center gap-4 z-10">
                <button
                  onClick={() => setScale((s) => Math.max(s - 0.05, 0.5))}
                  className="px-3 py-1 hover:bg-white/10 rounded transition-colors text-white"
                >
                  −
                </button>
                <span className="text-white font-medium min-w-[60px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(s + 0.05, 3))}
                  className="px-3 py-1 hover:bg-white/10 rounded transition-colors text-white"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {!isMediaStack && detectedFileType === 'video' && (() => {
            const resolved = resolveVideoUrl(fileUrl);
            if (resolved?.type === 'mux') {
              return (
                <div className="w-full max-w-4xl mx-auto">
                  <MuxVideoPlayer
                    playbackId={resolved.playbackId}
                    poster={thumbnail ?? resolved.thumbnail}
                  />
                </div>
              );
            }
            return (
                <video
                src={resolved?.type === 'direct' ? resolved.src : (resolved?.src ?? fileUrl)}
                poster={thumbnail || undefined}
                controls
                className="max-w-full max-h-full"
              >
                Your browser does not support the video tag.
              </video>
            );
          })()}

          {!isMediaStack && detectedFileType === 'unknown' && (
            <div className="text-white text-center">
              <p className="mb-4">Preview not available for this file type</p>
              <button
                onClick={handleDownload}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors font-medium"
              >
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function detectFileType(url: string): 'pdf' | 'image' | 'video' | 'unknown' {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const pdfExtensions = ['pdf'];

  if (pdfExtensions.includes(extension)) return 'pdf';
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  
  return 'unknown';
}

