/**
 * Digital Brochure Template Types
 *
 * This is a simplified, single-template system that replaces the block-based editor.
 * All sections are fixed in order and cannot be rearranged.
 */

export interface DigitalBrochureData {
  // Hero & Branding (mandatory)
  heroImage: string; // Path to hero image (mandatory)
  logo: string; // Path to company logo (mandatory)

  // Company Info (mandatory)
  companyName: string; // Bold company name (mandatory)
  address?: string; // Optional address (clickable for maps)

  // Photos & Videos
  mediaItems: MediaItem[];

  // About Section
  about: {
    content: string;
    isExpanded?: boolean; // For UI state
  };

  // Amenities Section
  amenities: {
    items: string[]; // List of amenity strings
    isExpanded?: boolean; // For UI state
  };

  // Links Table (unlimited)
  links: LinkItem[];

  // Contact Information
  contact: ContactInfo;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string; // For videos
  caption?: string;
}

export interface LinkItem {
  id: string;
  title: string; // e.g., "Pricing", "Floor Plans", "Activities Calendar"
  image: string; // Mandatory title card image
  contentType: 'document' | 'image' | 'images'; // Single doc, single image, or gallery
  content: LinkContent;
}

export interface LinkContent {
  // For documents
  documentUrl?: string;
  documentName?: string;

  // For single image
  imageUrl?: string;

  // For multiple images
  images?: string[];
}

export interface ContactInfo {
  // Hero/Profile Picture
  profileImage: string; // Mandatory rectangular hero image

  // Basic Info
  name: string; // Mandatory contact name
  // No title field (deviation from VHN)

  // Phone Numbers (1-2 allowed)
  phones: PhoneNumber[];

  // Communication
  email: string; // Mandatory email
  fax?: string; // Optional fax
  website: string; // Mandatory website
}

export interface PhoneNumber {
  number: string;
  label: string; // e.g., "Main Office", "Mobile"
}

/**
 * vCard generation data
 * Used for "Save Contact" button functionality
 */
export interface VCardData {
  name: string;
  organization: string;
  phones: PhoneNumber[];
  email: string;
  website: string;
  address?: string;
  fax?: string;
}

/**
 * Default empty Digital Brochure data
 */
export const getDefaultDigitalBrochureData = (): DigitalBrochureData => ({
  heroImage: '',
  logo: '',
  companyName: 'Company Name',
  address: '',
  mediaItems: [],
  about: {
    content: 'Tell your story here. What makes your business unique? Share information about your services, history, and what sets you apart.',
  },
  amenities: {
    items: ['Free Wi-Fi', 'Parking Available', '24/7 Access'],
  },
  links: [],
  contact: {
    profileImage: '',
    name: 'Contact Name',
    phones: [
      { number: '', label: 'Main Office' }
    ],
    email: '',
    website: '',
  },
});
