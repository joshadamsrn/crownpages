'use client';

import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface ShareButtonProps {
  url?: string;
  title?: string;
  text?: string;
  className?: string;
  pageId?: string;
}

export function ShareButton({ 
  url, 
  title = 'Check this out!', 
  text = '',
  className = '',
  pageId,
}: ShareButtonProps) {
  const [showCopied, setShowCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const trackShare = (shareType: string) => {
    if (pageId) {
      trackEvent({
        pageId,
        eventType: 'share',
        eventData: { share_type: shareType, source: 'profile_share_button' },
      }).catch(() => {});
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        trackShare('native_share');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
          handleCopyLink();
        }
      }
    } else {
      setShowFallback(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      trackShare('copy_link');
      setTimeout(() => {
        setShowCopied(false);
        setShowFallback(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <>
      {/* Main Share Button */}
      <button
        onClick={handleShare}
        className={`group flex items-center justify-center bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
        aria-label="Share this page"
      >
        <Share2 className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors" />
      </button>

      {/* Fallback Modal for Desktop */}
      {showFallback && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowFallback(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Share this page</h3>
            
            {/* Copy Link Option */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-gray-50 transition-colors mb-3 border border-gray-200"
            >
              {showCopied ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">Link copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-gray-700" />
                  <span className="text-gray-900 font-medium">Copy link</span>
                </>
              )}
            </button>

            {/* URL Display */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600 truncate">{shareUrl}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowFallback(false)}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

