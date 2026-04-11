"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeAwareLogoProps {
  width: number;
  height: number;
  className?: string;
  alt?: string;
}

const ThemeAwareLogo = ({ 
  width, 
  height, 
  className = "", 
  alt = "CrownPages Logo" 
}: ThemeAwareLogoProps) => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder while loading to prevent hydration mismatch
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
        style={{ width, height }}
      />
    );
  }

  // Determine which logo to show based on the resolved theme
  // resolvedTheme will be 'dark' or 'light' even when theme is 'system'
  const logoSrc = resolvedTheme === 'dark' ? '/lightlogo.png' : '/darklogo.png';

  return (
    <Image
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
};

export { ThemeAwareLogo }; 