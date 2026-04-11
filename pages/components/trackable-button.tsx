'use client';

import React from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

interface TrackableButtonProps {
  href: string;
  pageId: string;
  sectionId: string;
  eventType: 'button_click' | 'link_click' | 'phone_click' | 'email_click' | 'address_click' | 'download' | 'social_click' | 'contact_open' | 'save_contact';
  eventData?: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  target?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function TrackableButton({
  href,
  pageId,
  sectionId,
  eventType,
  eventData = {},
  className = '',
  style,
  children,
  target,
  onClick,
}: TrackableButtonProps) {
  const handleClick = async (e: React.MouseEvent) => {
    // Call custom onClick handler if provided
    if (onClick) {
      onClick(e);
    }

    const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
    const isTelOrMailto = href.startsWith('tel:') || href.startsWith('mailto:');
    const isHttpLink = href.startsWith('http');

    console.log('🔗 TrackableButton clicked:', { href, isExternal, isTelOrMailto, isHttpLink, eventType });

    // For iOS Safari compatibility: Don't prevent default on HTTP/HTTPS links
    // Safari blocks window.open() after async operations, so we let the browser handle navigation
    // and track analytics in the background
    if (isHttpLink) {
      console.log('🔗 HTTP link - letting browser handle navigation');
      // Don't prevent default - let the browser navigate naturally
      // Track analytics in the background (fire and forget)
      trackEvent({
        pageId,
        eventType,
        eventData: {
          section_id: sectionId,
          href,
          ...eventData,
        },
      }).catch((error) => {
        console.error('Failed to track event:', error);
      });
      // Let the default link behavior happen
      return;
    }

    // For tel/mailto, prevent default and handle manually (original behavior)
    if (isTelOrMailto) {
      e.preventDefault();
    }

    try {
      // Track the event
      await trackEvent({
        pageId,
        eventType,
        eventData: {
          section_id: sectionId,
          href,
          ...eventData,
        },
      });

      // Navigate for tel/mailto
      if (isTelOrMailto) {
        window.location.href = href;
      }
    } catch (error) {
      console.error('Failed to track event:', error);

      // If analytics fails, still navigate (fallback behavior)
      if (isTelOrMailto) {
        window.location.href = href;
      }
    }
  };

  // Handle different types of links
  const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
  const isEmail = href.startsWith('mailto:');
  const isPhone = href.startsWith('tel:');

  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        style={style}
        onClick={handleClick}
        target={target || (isEmail || isPhone ? undefined : '_blank')}
        rel={isEmail || isPhone ? undefined : 'noopener noreferrer'}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={handleClick}
      target={target}
    >
      {children}
    </Link>
  );
} 