import React from 'react';
import {
  SiFacebook,
  SiInstagram,
  SiYoutube,
  SiTiktok,
  SiSnapchat,
  SiWhatsapp,
  SiMessenger,
  SiPinterest,
  SiSpotify,
  SiReddit,
  SiDiscord,
  SiThreads,
  SiGithub,
  SiTwitch,
  SiX,
} from 'react-icons/si';
import { FaLinkedinIn } from 'react-icons/fa6';
import { LuGlobe, LuLink } from 'react-icons/lu';
import { IconType } from 'react-icons';

interface PlatformConfig {
  icon: IconType;
  background: string;
  iconColor: string;
  border?: string;
  iconStyle?: React.CSSProperties;
}

const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  facebook: {
    icon: SiFacebook,
    background: '#1877F2',
    iconColor: '#fff',
  },
  instagram: {
    icon: SiInstagram,
    background:
      'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
    iconColor: '#fff',
  },
  linkedin: {
    icon: FaLinkedinIn,
    background: '#0A66C2',
    iconColor: '#fff',
  },
  youtube: {
    icon: SiYoutube,
    background: '#FF0000',
    iconColor: '#fff',
  },
  tiktok: {
    icon: SiTiktok,
    background: '#010101',
    iconColor: '#fff',
  },
  snapchat: {
    icon: SiSnapchat,
    background: '#FFFC00',
    iconColor: '#fff',
    // Thin outline traced around the ghost shape itself via drop-shadow filter
    iconStyle: {
      filter:
        'drop-shadow(0.5px 0 0 rgba(0,0,0,0.25)) drop-shadow(-0.5px 0 0 rgba(0,0,0,0.25)) drop-shadow(0 0.5px 0 rgba(0,0,0,0.25)) drop-shadow(0 -0.5px 0 rgba(0,0,0,0.25))',
    },
  },
  whatsapp: {
    icon: SiWhatsapp,
    background: '#25D366',
    iconColor: '#fff',
  },
  messenger: {
    icon: SiMessenger,
    background: 'linear-gradient(45deg, #0084ff, #a334fa, #ff5ca1)',
    iconColor: '#fff',
  },
  pinterest: {
    icon: SiPinterest,
    background: '#E60023',
    iconColor: '#fff',
  },
  spotify: {
    icon: SiSpotify,
    background: '#1DB954',
    iconColor: '#fff',
  },
  reddit: {
    icon: SiReddit,
    background: '#FF4500',
    iconColor: '#fff',
  },
  discord: {
    icon: SiDiscord,
    background: '#5865F2',
    iconColor: '#fff',
  },
  threads: {
    icon: SiThreads,
    background: '#000',
    iconColor: '#fff',
  },
  github: {
    icon: SiGithub,
    background: '#24292E',
    iconColor: '#fff',
  },
  twitch: {
    icon: SiTwitch,
    background: '#9146FF',
    iconColor: '#fff',
  },
  twitter: {
    icon: SiX,
    background: '#000',
    iconColor: '#fff',
  },
  x: {
    icon: SiX,
    background: '#000',
    iconColor: '#fff',
  },
  website: {
    icon: LuGlobe,
    background: '#007AFF',
    iconColor: '#fff',
  },
  other: {
    icon: LuLink,
    background: '#555555',
    iconColor: '#fff',
  },
};

const FALLBACK_CONFIG: PlatformConfig = {
  icon: LuLink,
  background: '#555555',
  iconColor: '#fff',
};

interface SocialBrandIconProps {
  platform: string;
  /** Size of the rounded square tile in px. Default 72. */
  size?: number;
  className?: string;
}

export const SocialBrandIcon: React.FC<SocialBrandIconProps> = ({
  platform,
  size = 72,
  className = '',
}) => {
  const config = PLATFORM_CONFIG[platform] ?? FALLBACK_CONFIG;
  const Icon = config.icon;
  const iconSize = Math.round(size * 0.52);

  return (
    <div
      className={`flex items-center justify-center rounded-2xl flex-shrink-0 shadow ${className}`}
      style={{
        width: size,
        height: size,
        background: config.background,
      }}
    >
      <Icon size={iconSize} color={config.iconColor} style={config.iconStyle} />
    </div>
  );
};
