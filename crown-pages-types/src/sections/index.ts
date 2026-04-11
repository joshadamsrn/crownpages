// Section definitions will be added here 

/**
 * CrownPages Section Definitions
 * 
 * Single source of truth for all page sections across mobile and web platforms.
 * This file defines the schema, validation, and configuration for every section type.
 * 
 * When adding a new section:
 * 1. Add it to SECTION_DEFINITIONS
 * 2. Update mobile editor to use the schema
 * 3. Update web renderer to use the schema
 * 4. Both platforms stay in sync automatically
 */

// Field Types with Validation
export interface BaseFieldDefinition {
    type: string;
    required: boolean;
    label: string;
    placeholder?: string;
    description?: string;
}

export interface TextField extends BaseFieldDefinition {
    type: 'text';
    maxLength?: number;
    minLength?: number;
}

export interface TextAreaField extends BaseFieldDefinition {
    type: 'textarea';
    maxLength?: number;
    rows?: number;
}

export interface ImageField extends BaseFieldDefinition {
    type: 'image';
    accept?: string[];
    maxSize?: number; // in MB
}

export interface SelectField extends BaseFieldDefinition {
    type: 'select';
    options: Array<{
        label: string;
        value: string;
        icon?: string;
        preview?: string;
    }>;
}

export interface ButtonField extends BaseFieldDefinition {
    type: 'button';
    linkTypes: Array<'url' | 'email' | 'phone' | 'internal'>;
}

export interface ArrayField extends BaseFieldDefinition {
    type: 'array';
    minItems?: number;
    maxItems?: number;
    itemSchema: Record<string, FieldDefinition>;
}

export type FieldDefinition =
    | TextField
    | TextAreaField
    | ImageField
    | SelectField
    | ButtonField
    | ArrayField;

// Style Configuration
export interface StyleOptions {
    canOverride: Array<'colors' | 'typography' | 'spacing' | 'layout'>;
    defaultStyles?: Record<string, any>;
    colorFields?: Array<'primary' | 'secondary' | 'background' | 'text'>;
}

// Platform-specific rendering hints
export interface RenderingHints {
    mobile: {
        height?: 'auto' | 'viewport' | string;
        spacing?: 'compact' | 'normal' | 'spacious';
        layout?: 'single' | 'grid' | 'carousel';
        specialFeatures?: {
            addToContacts?: boolean;
            quickActions?: boolean;
            shareCard?: boolean;
            oneHandUsable?: boolean;
            swipeActions?: boolean;
        };
    };
    web: {
        height?: string;
        responsive?: boolean;
        container?: 'full' | 'contained' | 'narrow';
        animation?: boolean;
        specialFeatures?: {
            hoverEffects?: boolean;
            qrCode?: boolean;
            vCard?: boolean;
            socialPreview?: boolean;
            printOptimized?: boolean;
            copyToClipboard?: boolean;
        };
    };
}

// Main Section Definition
export interface SectionDefinition {
    type: string;
    name: string;
    description: string;
    category: 'content' | 'media' | 'interaction' | 'data' | 'layout';
    icon: {
        mobile: string; // Ionicons name
        web: string;    // Lucide icon name
    };

    // Field definitions with validation
    fields: Record<string, FieldDefinition>;

    // Default data when section is created
    defaultData: Record<string, any>;

    // Style customization options
    styleOptions: StyleOptions;

    // Platform-specific hints
    renderingHints: RenderingHints;

    // Version for compatibility
    version: string;
}

// Icon mappings between platforms
export const ICON_OPTIONS = [
    {
        label: 'Checkmark',
        value: 'checkmark-circle',
        mobile: 'checkmark-circle',
        web: 'check-circle',
        category: 'success'
    },
    {
        label: 'Star',
        value: 'star',
        mobile: 'star',
        web: 'star',
        category: 'rating'
    },
    {
        label: 'Shield',
        value: 'shield',
        mobile: 'shield-checkmark',
        web: 'shield-check',
        category: 'security'
    },
    {
        label: 'Time',
        value: 'time',
        mobile: 'time',
        web: 'clock',
        category: 'time'
    },
    {
        label: 'Trophy',
        value: 'trophy',
        mobile: 'trophy',
        web: 'trophy',
        category: 'achievement'
    },
    {
        label: 'Heart',
        value: 'heart',
        mobile: 'heart',
        web: 'heart',
        category: 'emotion'
    },
    {
        label: 'Lightning',
        value: 'flash',
        mobile: 'flash',
        web: 'zap',
        category: 'energy'
    },
    {
        label: 'Target',
        value: 'target',
        mobile: 'radio-button-on',
        web: 'target',
        category: 'focus'
    },
    {
        label: 'Globe',
        value: 'globe',
        mobile: 'globe',
        web: 'globe',
        category: 'global'
    },
    {
        label: 'Thumbs Up',
        value: 'thumbs-up',
        mobile: 'thumbs-up',
        web: 'thumbs-up',
        category: 'approval'
    },
    // Social Media & Popular Platform Icons
    {
        label: 'Facebook',
        value: 'facebook',
        mobile: 'logo-facebook',
        web: 'facebook',
        category: 'social'
    },
    {
        label: 'Instagram',
        value: 'instagram',
        mobile: 'logo-instagram',
        web: 'instagram',
        category: 'social'
    },
    {
        label: 'Twitter/X',
        value: 'twitter',
        mobile: 'logo-twitter',
        web: 'twitter',
        category: 'social'
    },
    {
        label: 'LinkedIn',
        value: 'linkedin',
        mobile: 'logo-linkedin',
        web: 'linkedin',
        category: 'social'
    },
    {
        label: 'TikTok',
        value: 'tiktok',
        mobile: 'logo-tiktok',
        web: 'video',
        category: 'social'
    },
    {
        label: 'YouTube',
        value: 'youtube',
        mobile: 'logo-youtube',
        web: 'youtube',
        category: 'social'
    },
    {
        label: 'WhatsApp',
        value: 'whatsapp',
        mobile: 'logo-whatsapp',
        web: 'message-circle',
        category: 'social'
    },
    {
        label: 'Email',
        value: 'email',
        mobile: 'mail',
        web: 'mail',
        category: 'communication'
    },
    {
        label: 'Phone',
        value: 'phone',
        mobile: 'call',
        web: 'phone',
        category: 'communication'
    },
    {
        label: 'Website',
        value: 'website',
        mobile: 'globe',
        web: 'external-link',
        category: 'web'
    },
    {
        label: 'Download',
        value: 'download',
        mobile: 'download',
        web: 'download',
        category: 'action'
    },
    {
        label: 'Calendar',
        value: 'calendar',
        mobile: 'calendar',
        web: 'calendar',
        category: 'time'
    },
    {
        label: 'Location',
        value: 'location',
        mobile: 'location',
        web: 'map-pin',
        category: 'place'
    }
];

// Main Section Definitions
export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {
    hero: {
        type: 'hero',
        name: 'Hero Section',
        description: 'Eye-catching header with call-to-action',
        category: 'content',
        icon: {
            mobile: 'image-outline',
            web: 'image'
        },
        fields: {
            title: {
                type: 'text',
                required: false,
                label: 'Main Title',
                placeholder: 'Welcome to Your Business',
                maxLength: 100
            },
            subtitle: {
                type: 'text',
                required: false,
                label: 'Subtitle',
                placeholder: 'Your tagline or mission statement',
                maxLength: 200
            },
            backgroundImage: {
                type: 'image',
                required: false,
                label: 'Background Image',
                accept: ['jpg', 'jpeg', 'png', 'webp'],
                maxSize: 5
            },
            ctaButton: {
                type: 'button',
                required: false,
                label: 'Call-to-Action Button',
                linkTypes: ['url', 'email', 'phone']
            }
        },
        defaultData: {
            title: 'Welcome to Your Business',
            subtitle: 'Your tagline or mission statement here',
            backgroundImage: null,
            ctaButton: { text: 'Get Started', link: 'tel:' }
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'secondary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'viewport',
                spacing: 'normal',
                layout: 'single'
            },
            web: {
                height: '60vh',
                responsive: true,
                container: 'full',
                animation: true
            }
        },
        version: '1.0.0'
    },

    features: {
        type: 'features',
        name: 'Features Section',
        description: 'Highlight key features or benefits',
        category: 'content',
        icon: {
            mobile: 'list-outline',
            web: 'list'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'Why Choose Us',
                maxLength: 80
            },
            features: {
                type: 'array',
                required: true,
                label: 'Features List',
                minItems: 1,
                maxItems: 12,
                itemSchema: {
                    icon: {
                        type: 'select',
                        required: true,
                        label: 'Icon',
                        options: ICON_OPTIONS.map(icon => ({
                            label: icon.label,
                            value: icon.value,
                            icon: icon.mobile,
                            preview: icon.category
                        }))
                    },
                    title: {
                        type: 'text',
                        required: true,
                        label: 'Feature Title',
                        placeholder: 'Amazing Feature',
                        maxLength: 50
                    },
                    description: {
                        type: 'textarea',
                        required: false,
                        label: 'Description',
                        placeholder: 'Describe this feature...',
                        maxLength: 200,
                        rows: 2
                    }
                }
            }
        },
        defaultData: {
            title: 'Why Choose Us',
            features: [
                {
                    id: 'temp_1',
                    icon: 'checkmark-circle',
                    title: 'Quality Service',
                    description: 'We deliver excellence in everything we do'
                },
                {
                    id: 'temp_2',
                    icon: 'time',
                    title: 'Fast Delivery',
                    description: 'Quick turnaround times guaranteed'
                },
                {
                    id: 'temp_3',
                    icon: 'shield',
                    title: 'Trusted',
                    description: 'Hundreds of satisfied customers'
                }
            ]
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing', 'layout'],
            colorFields: ['primary', 'secondary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'grid'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: true
            }
        },
        version: '1.0.0'
    },

    about: {
        type: 'about',
        name: 'About Section',
        description: 'Tell your story with text and images',
        category: 'content',
        icon: {
            mobile: 'information-circle-outline',
            web: 'info'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'About Us',
                maxLength: 80
            },
            content: {
                type: 'textarea',
                required: true,
                label: 'Content',
                placeholder: 'Tell your story here...',
                maxLength: 1000,
                rows: 6
            },
            image: {
                type: 'image',
                required: false,
                label: 'Image',
                accept: ['jpg', 'jpeg', 'png', 'webp'],
                maxSize: 3
            }
        },
        defaultData: {
            title: 'About Us',
            content: 'Tell your story here. What makes your business unique? What are your values and mission?',
            image: null
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing', 'layout'],
            colorFields: ['background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'single'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: false
            }
        },
        version: '1.0.0'
    },

    contact: {
        type: 'contact',
        name: 'Contact Section',
        description: 'Display contact information',
        category: 'data',
        icon: {
            mobile: 'call-outline',
            web: 'phone'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'Contact Us',
                maxLength: 80
            },
            phone: {
                type: 'text',
                required: false,
                label: 'Phone Number',
                placeholder: '(555) 123-4567'
            },
            email: {
                type: 'text',
                required: false,
                label: 'Email',
                placeholder: 'hello@business.com'
            },
            address: {
                type: 'textarea',
                required: false,
                label: 'Address',
                placeholder: '123 Main St\nCity, State 12345',
                rows: 3
            }
        },
        defaultData: {
            title: 'Contact Us',
            phone: '',
            email: '',
            address: ''
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'single'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: false
            }
        },
        version: '1.0.0'
    },

    personalContact: {
        type: 'personalContact',
        name: 'Personal Contact Card',
        description: 'Share your personal contact information as a digital business card',
        category: 'data',
        icon: {
            mobile: 'person-circle-outline',
            web: 'user-circle'
        },
        fields: {
            name: {
                type: 'text',
                required: true,
                label: 'Full Name',
                placeholder: 'Parker Frasure',
                maxLength: 100
            },
            title: {
                type: 'text',
                required: false,
                label: 'Title/Position',
                placeholder: 'Professional Health Network',
                maxLength: 150
            },
            phone: {
                type: 'text',
                required: false,
                label: 'Phone Number',
                placeholder: '(555) 123-4567'
            },
            email: {
                type: 'text',
                required: false,
                label: 'Email',
                placeholder: 'parker@example.com'
            },
            photo: {
                type: 'image',
                required: false,
                label: 'Profile Photo',
                accept: ['jpg', 'jpeg', 'png', 'webp'],
                maxSize: 2
            },
            website: {
                type: 'text',
                required: false,
                label: 'Website',
                placeholder: 'https://www.yourwebsite.com'
            },
            bio: {
                type: 'textarea',
                required: false,
                label: 'Short Bio',
                placeholder: 'Brief description about yourself...',
                maxLength: 300,
                rows: 3
            },
            customLinks: {
                type: 'array',
                required: false,
                label: 'Custom Links',
                maxItems: 8,
                itemSchema: {
                    type: {
                        type: 'select',
                        required: true,
                        label: 'Link Type',
                        options: [
                            { label: 'LinkedIn', value: 'linkedin', icon: 'logo-linkedin', preview: 'Professional networking' },
                            { label: 'Instagram', value: 'instagram', icon: 'logo-instagram', preview: 'Photo sharing' },
                            { label: 'Twitter/X', value: 'twitter', icon: 'logo-twitter', preview: 'Social media' },
                            { label: 'Facebook', value: 'facebook', icon: 'logo-facebook', preview: 'Social network' },
                            { label: 'TikTok', value: 'tiktok', icon: 'logo-tiktok', preview: 'Video content' },
                            { label: 'YouTube', value: 'youtube', icon: 'logo-youtube', preview: 'Video channel' },
                            { label: 'Portfolio', value: 'portfolio', icon: 'briefcase-outline', preview: 'Work showcase' },
                            { label: 'Resume/CV', value: 'resume', icon: 'document-text-outline', preview: 'Professional document' },
                            { label: 'Blog', value: 'blog', icon: 'library-outline', preview: 'Personal blog' },
                            { label: 'WhatsApp', value: 'whatsapp', icon: 'logo-whatsapp', preview: 'Messaging' },
                            { label: 'Telegram', value: 'telegram', icon: 'paper-plane-outline', preview: 'Messaging' },
                            { label: 'Discord', value: 'discord', icon: 'logo-discord', preview: 'Gaming/communities' },
                            { label: 'Calendly', value: 'calendly', icon: 'calendar-outline', preview: 'Booking' },
                            { label: 'Venmo', value: 'venmo', icon: 'card-outline', preview: 'Payment' },
                            { label: 'PayPal', value: 'paypal', icon: 'logo-paypal', preview: 'Payment' },
                            { label: 'Custom', value: 'custom', icon: 'link-outline', preview: 'Other link' }
                        ]
                    },
                    label: {
                        type: 'text',
                        required: true,
                        label: 'Link Label',
                        placeholder: 'Follow me on LinkedIn',
                        maxLength: 50
                    },
                    url: {
                        type: 'text',
                        required: true,
                        label: 'URL',
                        placeholder: 'https://linkedin.com/in/username'
                    }
                }
            }
        },
        defaultData: {
            name: '',
            title: '',
            phone: '',
            email: '',
            photo: null,
            website: '',
            bio: '',
            customLinks: []
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing', 'layout'],
            colorFields: ['primary', 'secondary', 'background', 'text'],
            defaultStyles: {
                cardStyle: 'modern', // modern, classic, minimal
                buttonStyle: 'rounded', // rounded, square, pill
                iconStyle: 'colored' // colored, monochrome, outlined
            }
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'compact',
                layout: 'single',
                specialFeatures: {
                    // Mobile-optimized contact card features
                    addToContacts: true, // Native "Add to Contacts" integration
                    quickActions: true, // Prominent call/message buttons
                    shareCard: true, // Share contact card functionality
                    oneHandUsable: true, // Thumb-friendly button placement
                    swipeActions: true // Swipe gestures for quick actions
                }
            },
            web: {
                height: 'auto',
                responsive: true,
                container: 'narrow', // Business card proportions
                animation: true,
                specialFeatures: {
                    // Desktop-optimized features
                    hoverEffects: true, // Link hover states
                    qrCode: true, // Generate QR code for easy mobile sharing
                    vCard: true, // Download as .vcf file
                    socialPreview: true, // Rich link previews
                    printOptimized: true, // CSS for business card printing
                    copyToClipboard: true // Copy contact info
                }
            }
        },
        version: '1.0.0'
    },

    gallery: {
        type: 'gallery',
        name: 'Gallery Section',
        description: 'Showcase images in a gallery',
        category: 'media',
        icon: {
            mobile: 'images-outline',
            web: 'images'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'Our Work',
                maxLength: 80
            },
            images: {
                type: 'array',
                required: false,
                label: 'Images',
                maxItems: 20,
                itemSchema: {
                    url: {
                        type: 'image',
                        required: true,
                        label: 'Image',
                        accept: ['jpg', 'jpeg', 'png', 'webp'],
                        maxSize: 5
                    },
                    caption: {
                        type: 'text',
                        required: false,
                        label: 'Caption',
                        maxLength: 100
                    }
                }
            }
        },
        defaultData: {
            title: 'Our Work',
            images: []
        },
        styleOptions: {
            canOverride: ['colors', 'spacing', 'layout'],
            colorFields: ['background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'compact',
                layout: 'carousel'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: true
            }
        },
        version: '1.0.0'
    },

    testimonials: {
        type: 'testimonials',
        name: 'Testimonials Section',
        description: 'Display customer testimonials',
        category: 'content',
        icon: {
            mobile: 'chatbubbles-outline',
            web: 'message-circle'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'What Our Customers Say',
                maxLength: 80
            },
            testimonials: {
                type: 'array',
                required: false,
                label: 'Testimonials',
                maxItems: 10,
                itemSchema: {
                    name: {
                        type: 'text',
                        required: true,
                        label: 'Customer Name',
                        placeholder: 'John Doe',
                        maxLength: 50
                    },
                    position: {
                        type: 'text',
                        required: false,
                        label: 'Position/Company',
                        placeholder: 'CEO, Company',
                        maxLength: 100
                    },
                    text: {
                        type: 'textarea',
                        required: true,
                        label: 'Testimonial',
                        placeholder: 'Amazing service!',
                        maxLength: 500,
                        rows: 3
                    },
                    rating: {
                        type: 'select',
                        required: false,
                        label: 'Rating',
                        options: [
                            { label: '5 Stars', value: '5' },
                            { label: '4 Stars', value: '4' },
                            { label: '3 Stars', value: '3' },
                            { label: '2 Stars', value: '2' },
                            { label: '1 Star', value: '1' }
                        ]
                    }
                }
            }
        },
        defaultData: {
            title: 'What Our Customers Say',
            testimonials: [
                {
                    id: 'temp_1',
                    name: 'Sarah Johnson',
                    position: 'CEO, TechCorp',
                    text: 'Amazing service! Highly recommend.',
                    rating: 5
                }
            ]
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'carousel'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: true
            }
        },
        version: '1.0.0'
    },

    faq: {
        type: 'faq',
        name: 'FAQ Section',
        description: 'Frequently asked questions',
        category: 'content',
        icon: {
            mobile: 'help-circle-outline',
            web: 'help-circle'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'Frequently Asked Questions',
                maxLength: 80
            },
            questions: {
                type: 'array',
                required: false,
                label: 'Questions',
                maxItems: 20,
                itemSchema: {
                    question: {
                        type: 'text',
                        required: true,
                        label: 'Question',
                        placeholder: 'What are your hours?',
                        maxLength: 200
                    },
                    answer: {
                        type: 'textarea',
                        required: true,
                        label: 'Answer',
                        placeholder: 'We are open...',
                        maxLength: 1000,
                        rows: 3
                    }
                }
            }
        },
        defaultData: {
            title: 'Frequently Asked Questions',
            questions: [
                {
                    id: 'temp_1',
                    question: 'What are your business hours?',
                    answer: 'We are open Monday-Friday 9AM-6PM, Saturday 10AM-4PM'
                }
            ]
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'single'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: false
            }
        },
        version: '1.0.0'
    },

    cta: {
        type: 'cta',
        name: 'Call-to-Action Section',
        description: 'Encourage visitors to take action',
        category: 'interaction',
        icon: {
            mobile: 'megaphone-outline',
            web: 'megaphone'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Main Title',
                placeholder: 'Ready to get started?',
                maxLength: 100
            },
            description: {
                type: 'textarea',
                required: false,
                label: 'Description',
                placeholder: 'Contact us today',
                maxLength: 300,
                rows: 2
            },
            button: {
                type: 'button',
                required: true,
                label: 'Action Button',
                linkTypes: ['url', 'email', 'phone']
            }
        },
        defaultData: {
            title: 'Ready to get started?',
            description: 'Contact us today to learn more',
            button: { text: 'Contact Us', link: 'tel:' }
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'secondary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'spacious',
                layout: 'single'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: false
            }
        },
        version: '1.0.0'
    },

    multiContact: {
        type: 'multiContact',
        name: 'Multi-Contact Section',
        description: 'Professional business contact with main location info and specific contact persons',
        category: 'data',
        icon: {
            mobile: 'business-outline',
            web: 'building'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'Contact Information',
                maxLength: 80
            },
            businessInfo: {
                type: 'array',
                required: true,
                label: 'Main Business Information',
                minItems: 1,
                maxItems: 1,
                itemSchema: {
                    name: {
                        type: 'text',
                        required: true,
                        label: 'Business/Organization Name',
                        placeholder: 'Your Business Name',
                        maxLength: 200
                    },
                    address: {
                        type: 'textarea',
                        required: false,
                        label: 'Business Address',
                        placeholder: '123 Main Street, City, State 12345',
                        rows: 2,
                        maxLength: 500
                    },
                    phone: {
                        type: 'text',
                        required: false,
                        label: 'Main Phone Number',
                        placeholder: '(555) 123-4567',
                        maxLength: 50
                    },
                    fax: {
                        type: 'text',
                        required: false,
                        label: 'Fax Number',
                        placeholder: '(555) 123-4568',
                        maxLength: 50
                    },
                    email: {
                        type: 'text',
                        required: false,
                        label: 'Main Email',
                        placeholder: 'info@business.com',
                        maxLength: 200
                    },
                    website: {
                        type: 'text',
                        required: false,
                        label: 'Website',
                        placeholder: 'https://www.yourbusiness.com',
                        maxLength: 300
                    }
                }
            },
            contactPersons: {
                type: 'array',
                required: false,
                label: 'Additional Contact',
                maxItems: 10,
                itemSchema: {
                    name: {
                        type: 'text',
                        required: true,
                        label: 'Contact Name',
                        placeholder: 'John Smith',
                        maxLength: 100
                    },
                    title: {
                        type: 'text',
                        required: false,
                        label: 'Title/Department',
                        placeholder: 'Sales Manager',
                        maxLength: 150
                    },
                    photo: {
                        type: 'image',
                        required: false,
                        label: 'Contact Photo',
                        accept: ['jpg', 'jpeg', 'png', 'webp'],
                        maxSize: 2
                    },
                    phone: {
                        type: 'text',
                        required: false,
                        label: 'Direct Phone',
                        placeholder: '(555) 123-4567',
                        maxLength: 50
                    },
                    email: {
                        type: 'text',
                        required: false,
                        label: 'Direct Email',
                        placeholder: 'john@business.com',
                        maxLength: 200
                    },
                    extension: {
                        type: 'text',
                        required: false,
                        label: 'Extension',
                        placeholder: 'ext. 123',
                        maxLength: 20
                    }
                }
            }
        },
        defaultData: {
            title: 'Contact Information',
            businessInfo: [
                {
                    id: 'business_1',
                    name: '',
                    address: '',
                    phone: '',
                    fax: '',
                    email: '',
                    website: ''
                }
            ],
            contactPersons: []
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing', 'layout'],
            colorFields: ['primary', 'secondary', 'background', 'text'],
            defaultStyles: {
                cardStyle: 'modern',
                expandableStyle: 'drawer'
            }
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'single',
                specialFeatures: {
                    addToContacts: true,
                    quickActions: true,
                    oneHandUsable: true,
                    swipeActions: true
                }
            },
            web: {
                height: 'auto',
                responsive: true,
                container: 'contained',
                animation: true,
                specialFeatures: {
                    hoverEffects: true,
                    copyToClipboard: true,
                    vCard: true,
                    printOptimized: true
                }
            }
        },
        version: '1.0.0'
    },

    medicalProvider: {
        type: 'medicalProvider',
        name: 'Full Page: Medical Provider',
        description: 'Complete medical provider page with hero, contact info, services, gallery, and more',
        category: 'content',
        icon: {
            mobile: 'medical-outline',
            web: 'heart-pulse'
        },
        fields: {
            // Basic Provider Information
            facilityName: {
                type: 'text',
                required: true,
                label: 'Provider/Facility Name',
                placeholder: 'Medical Center Name',
                maxLength: 200
            },
            heroImage: {
                type: 'image',
                required: false,
                label: 'Hero Background Image',
                accept: ['jpg', 'jpeg', 'png', 'webp'],
                maxSize: 5
            },
            logo: {
                type: 'image',
                required: false,
                label: 'Provider Logo',
                accept: ['jpg', 'jpeg', 'png', 'webp'],
                maxSize: 2
            },
            
            // Address and Location
            streetAddress: {
                type: 'text',
                required: false,
                label: 'Street Address',
                placeholder: '123 Medical Drive',
                maxLength: 200
            },
            unit: {
                type: 'text',
                required: false,
                label: 'Unit/Suite',
                placeholder: 'Suite 100',
                maxLength: 50
            },
            city: {
                type: 'text',
                required: false,
                label: 'City',
                placeholder: 'Your City',
                maxLength: 100
            },
            state: {
                type: 'text',
                required: false,
                label: 'State',
                placeholder: 'CA',
                maxLength: 50
            },
            zipCode: {
                type: 'text',
                required: false,
                label: 'ZIP Code',
                placeholder: '12345',
                maxLength: 20
            },
            
            // Contact Information
            phone: {
                type: 'text',
                required: false,
                label: 'Main Phone Number',
                placeholder: '(555) 123-4567',
                maxLength: 50
            },
            fax: {
                type: 'text',
                required: false,
                label: 'Fax Number',
                placeholder: '(555) 123-4568',
                maxLength: 50
            },
            email: {
                type: 'text',
                required: false,
                label: 'Email Address',
                placeholder: 'info@provider.com',
                maxLength: 200
            },
            website: {
                type: 'text',
                required: false,
                label: 'Website URL',
                placeholder: 'https://www.provider.com',
                maxLength: 300
            },
            
            // About Section
            serviceDescription: {
                type: 'textarea',
                required: false,
                label: 'About Description',
                placeholder: 'Describe your services and what makes you unique...',
                maxLength: 2000,
                rows: 6
            },
            
            // Pricing Information
            priceLow: {
                type: 'text',
                required: false,
                label: 'Starting Price (monthly)',
                placeholder: '2500'
            },
            priceHigh: {
                type: 'text',
                required: false,
                label: 'High Price (monthly)',
                placeholder: '5000'
            },
            
            // Services/Specialties
            services: {
                type: 'array',
                required: false,
                label: 'Services & Specialties',
                maxItems: 15,
                itemSchema: {
                    name: {
                        type: 'text',
                        required: true,
                        label: 'Service Name',
                        placeholder: 'Assisted Living',
                        maxLength: 100
                    },
                    icon: {
                        type: 'select',
                        required: false,
                        label: 'Service Icon',
                        options: [
                            { label: 'Assisted Living', value: 'home', icon: 'home-outline', preview: 'home' },
                            { label: 'Memory Care', value: 'brain', icon: 'library-outline', preview: 'brain' },
                            { label: 'Skilled Nursing', value: 'medical', icon: 'medkit-outline', preview: 'medical' },
                            { label: 'Physical Therapy', value: 'fitness', icon: 'fitness-outline', preview: 'fitness' },
                            { label: 'Occupational Therapy', value: 'hand', icon: 'hand-left-outline', preview: 'therapy' },
                            { label: 'Speech Therapy', value: 'mic', icon: 'mic-outline', preview: 'speech' },
                            { label: 'Mental Health', value: 'happy', icon: 'happy-outline', preview: 'mental' },
                            { label: 'Hospice Care', value: 'heart', icon: 'heart-outline', preview: 'hospice' },
                            { label: 'Home Health', value: 'home-medical', icon: 'home-outline', preview: 'home health' },
                            { label: 'Independent Living', value: 'person', icon: 'person-outline', preview: 'independent' },
                            { label: 'Transportation', value: 'car', icon: 'car-outline', preview: 'transport' },
                            { label: 'Dining Services', value: 'restaurant', icon: 'restaurant-outline', preview: 'dining' },
                            { label: 'Activities', value: 'game', icon: 'game-controller-outline', preview: 'activities' },
                            { label: 'Emergency Response', value: 'alert', icon: 'alert-circle-outline', preview: 'emergency' },
                            { label: 'Medication Management', value: 'medical-bag', icon: 'medical-outline', preview: 'medication' }
                        ]
                    },
                    available: {
                        type: 'select',
                        required: true,
                        label: 'Available',
                        options: [
                            { label: 'Yes', value: 'true' },
                            { label: 'No', value: 'false' }
                        ]
                    }
                }
            },
            
            // Insurance Information
            acceptedInsurance: {
                type: 'array',
                required: false,
                label: 'Accepted Insurance',
                maxItems: 20,
                itemSchema: {
                    name: {
                        type: 'text',
                        required: true,
                        label: 'Insurance Provider',
                        placeholder: 'Medicare',
                        maxLength: 100
                    }
                }
            },
            
            // Admission Coordinator
            admissionCoordinator: {
                type: 'text',
                required: false,
                label: 'Admission Coordinator Name',
                placeholder: 'John Smith',
                maxLength: 100
            },
            admissionCoordinatorPhone: {
                type: 'text',
                required: false,
                label: 'Admission Coordinator Phone',
                placeholder: '(555) 123-4567',
                maxLength: 50
            },
            admissionCoordinatorEmail: {
                type: 'text',
                required: false,
                label: 'Admission Coordinator Email',
                placeholder: 'admissions@provider.com',
                maxLength: 200
            },
            
            // Certifications and Awards
            certifications: {
                type: 'array',
                required: false,
                label: 'Certifications & Awards',
                maxItems: 10,
                itemSchema: {
                    name: {
                        type: 'text',
                        required: true,
                        label: 'Certification/Award Name',
                        placeholder: 'UALA Certified',
                        maxLength: 150
                    },
                    icon: {
                        type: 'select',
                        required: false,
                        label: 'Badge Icon',
                        options: [
                            { label: 'Certificate', value: 'certificate', icon: 'ribbon-outline', preview: 'certificate' },
                            { label: 'Award', value: 'award', icon: 'trophy-outline', preview: 'award' },
                            { label: 'Star Rating', value: 'star', icon: 'star-outline', preview: 'rating' },
                            { label: 'Shield/Security', value: 'shield', icon: 'shield-checkmark-outline', preview: 'security' },
                            { label: 'Medical Cross', value: 'medical', icon: 'medical-outline', preview: 'medical' },
                            { label: 'Checkmark', value: 'check', icon: 'checkmark-circle-outline', preview: 'verified' }
                        ]
                    }
                }
            },
            
            // Gallery Integration (reuse existing gallery structure)
            galleryTitle: {
                type: 'text',
                required: false,
                label: 'Gallery Section Title',
                placeholder: 'Photos & Videos',
                maxLength: 80
            },
            galleryImages: {
                type: 'array',
                required: false,
                label: 'Gallery Images',
                maxItems: 20,
                itemSchema: {
                    url: {
                        type: 'image',
                        required: true,
                        label: 'Image',
                        accept: ['jpg', 'jpeg', 'png', 'webp'],
                        maxSize: 5
                    },
                    caption: {
                        type: 'text',
                        required: false,
                        label: 'Caption',
                        maxLength: 100
                    }
                }
            },
            
            // Additional Features
            hasEmergencyResponse: {
                type: 'select',
                required: false,
                label: '24/7 Emergency Response',
                options: [
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' }
                ]
            },
            hasPetFriendly: {
                type: 'select',
                required: false,
                label: 'Pet Friendly',
                options: [
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' }
                ]
            },
            operatingHours: {
                type: 'textarea',
                required: false,
                label: 'Operating Hours',
                placeholder: 'Monday-Friday: 9AM-6PM\nSaturday: 10AM-4PM\nSunday: Closed',
                rows: 3,
                maxLength: 300
            }
        },
        defaultData: {
            facilityName: '',
            heroImage: null,
            logo: null,
            streetAddress: '',
            unit: '',
            city: '',
            state: '',
            zipCode: '',
            phone: '',
            fax: '',
            email: '',
            website: '',
            serviceDescription: '',
            priceLow: '',
            priceHigh: '',
            services: [
                {
                    id: 'service_1',
                    name: 'Assisted Living',
                    icon: 'home',
                    available: 'true'
                },
                {
                    id: 'service_2',
                    name: 'Memory Care',
                    icon: 'brain',
                    available: 'true'
                },
                {
                    id: 'service_3',
                    name: 'Skilled Nursing',
                    icon: 'medical',
                    available: 'true'
                }
            ],
            acceptedInsurance: [
                {
                    id: 'insurance_1',
                    name: 'Medicare'
                },
                {
                    id: 'insurance_2',
                    name: 'Medicaid'
                }
            ],
            admissionCoordinator: '',
            admissionCoordinatorPhone: '',
            admissionCoordinatorEmail: '',
            certifications: [
                {
                    id: 'cert_1',
                    name: 'State Licensed',
                    icon: 'certificate'
                }
            ],
            galleryTitle: 'Photos & Videos',
            galleryImages: [],
            hasEmergencyResponse: 'true',
            hasPetFriendly: 'false',
            operatingHours: ''
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing', 'layout'],
            colorFields: ['primary', 'secondary', 'background', 'text'],
            defaultStyles: {
                heroHeight: 'large', // small, medium, large
                cardStyle: 'modern', // classic, modern, minimal
                buttonStyle: 'rounded', // square, rounded, pill
                layoutDensity: 'comfortable' // compact, comfortable, spacious
            }
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'single',
                specialFeatures: {
                    addToContacts: true,
                    quickActions: true, // Quick call/directions buttons
                    shareCard: true,
                    oneHandUsable: true,
                    swipeActions: false // Gallery will handle swiping
                }
            },
            web: {
                height: 'auto',
                responsive: true,
                container: 'full', // This is a full page layout
                animation: true,
                specialFeatures: {
                    hoverEffects: true,
                    copyToClipboard: true, // Copy contact info
                    socialPreview: true, // Rich previews for sharing
                    printOptimized: true, // Print-friendly layout
                    qrCode: false, // Not needed for provider pages
                    vCard: true // Download contact as vCard
                }
            }
        },
        version: '1.0.0'
    },

    companyHeader: {
        type: 'companyHeader',
        name: 'Company Header',
        description: 'Display company name, address, and map link',
        category: 'content',
        icon: {
            mobile: 'business-outline',
            web: 'building'
        },
        fields: {
            companyName: {
                type: 'text',
                required: true,
                label: 'Company Name',
                placeholder: 'Your Business Name',
                maxLength: 200
            },
            address: {
                type: 'textarea',
                required: false,
                label: 'Address',
                placeholder: '123 Main Street, City, State 12345',
                maxLength: 300,
                rows: 2
            },
            mapUrl: {
                type: 'text',
                required: false,
                label: 'Google Maps URL',
                placeholder: 'https://maps.google.com/?q=...',
                maxLength: 500
            }
        },
        defaultData: {
            companyName: 'Company Name',
            address: '123 Main Street, City, State 12345',
            mapUrl: ''
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'compact',
                layout: 'single'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: false
            }
        },
        version: '1.0.0'
    },

    contactCard: {
        type: 'contactCard',
        name: 'Contact Card',
        description: 'Individual contact card with photo, name, role, and contact details - opens as modal via contact button',
        category: 'data',
        icon: {
            mobile: 'person-outline',
            web: 'user'
        },
        fields: {
            contactName: {
                type: 'text',
                required: true,
                label: 'Contact Name',
                placeholder: 'John Doe',
                maxLength: 100
            },
            contactRole: {
                type: 'text',
                required: false,
                label: 'Role/Position',
                placeholder: 'Sales Director',
                maxLength: 100
            },
            communityName: {
                type: 'text',
                required: false,
                label: 'Business/Community Name',
                placeholder: 'Your Business Name',
                maxLength: 200
            },
            address: {
                type: 'text',
                required: false,
                label: 'Address',
                placeholder: '123 Main Street, City, State 12345',
                maxLength: 300
            },
            phone: {
                type: 'text',
                required: false,
                label: 'Phone Number',
                placeholder: '(555) 123-4567',
                maxLength: 50
            },
            email: {
                type: 'text',
                required: false,
                label: 'Email',
                placeholder: 'contact@example.com',
                maxLength: 200
            },
            fax: {
                type: 'text',
                required: false,
                label: 'Fax Number',
                placeholder: '(555) 123-4568',
                maxLength: 50
            },
            personalPhone: {
                type: 'text',
                required: false,
                label: 'Personal Phone',
                placeholder: '(555) 987-6543',
                maxLength: 50
            },
            logo: {
                type: 'image',
                required: false,
                label: 'Logo/Photo',
                accept: ['jpg', 'jpeg', 'png', 'webp'],
                maxSize: 2
            },
            link: {
                type: 'text',
                required: false,
                label: 'Website Link',
                placeholder: 'https://example.com',
                maxLength: 500
            }
        },
        defaultData: {
            contactName: 'Contact Person',
            contactRole: 'Sales Director',
            communityName: 'Your Business Name',
            address: '123 Main Street, City, State 12345',
            phone: '(123) 456-7890',
            email: 'contact@example.com',
            fax: '',
            personalPhone: '',
            logo: '',
            link: ''
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'compact',
                layout: 'single',
                specialFeatures: {
                    quickActions: true,
                    addToContacts: true
                }
            },
            web: {
                responsive: true,
                container: 'narrow',
                animation: false,
                specialFeatures: {
                    vCard: true,
                    copyToClipboard: true
                }
            }
        },
        version: '1.0.0'
    },

    amenities: {
        type: 'amenities',
        name: 'Amenities',
        description: 'Grid display of amenities with icons',
        category: 'content',
        icon: {
            mobile: 'list-outline',
            web: 'list-checks'
        },
        fields: {
            title: {
                type: 'text',
                required: true,
                label: 'Section Title',
                placeholder: 'Amenities',
                maxLength: 80
            },
            amenities: {
                type: 'array',
                required: true,
                label: 'Amenities List',
                minItems: 1,
                maxItems: 20,
                itemSchema: {
                    name: {
                        type: 'text',
                        required: true,
                        label: 'Amenity Name',
                        placeholder: 'Free Wi-Fi',
                        maxLength: 50
                    },
                    icon: {
                        type: 'select',
                        required: false,
                        label: 'Icon',
                        options: ICON_OPTIONS.map(icon => ({
                            label: icon.label,
                            value: icon.value,
                            icon: icon.mobile,
                            preview: icon.category
                        }))
                    }
                }
            }
        },
        defaultData: {
            title: 'Amenities',
            amenities: [
                { id: 'temp_1', name: 'Free Wi-Fi', icon: 'wifi' },
                { id: 'temp_2', name: 'Parking Available', icon: 'car' },
                { id: 'temp_3', name: '24/7 Access', icon: 'time' }
            ]
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing', 'layout'],
            colorFields: ['primary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'grid'
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: false
            }
        },
        version: '1.0.0'
    },

    linksWithContact: {
        type: 'linksWithContact',
        name: 'Pages with Contact',
        description: 'Display a list of pages/links with an attached contact card',
        category: 'interaction',
        icon: {
            mobile: 'document-outline',
            web: 'file-text'
        },
        fields: {
            title: {
                type: 'text',
                required: false,
                label: 'Section Title',
                placeholder: 'Pages',
                maxLength: 80
            },
            links: {
                type: 'array',
                required: true,
                label: 'Pages',
                minItems: 1,
                maxItems: 20,
                itemSchema: {
                    title: {
                        type: 'text',
                        required: true,
                        label: 'Page Title',
                        placeholder: 'Official Website',
                        maxLength: 100
                    },
                    url: {
                        type: 'text',
                        required: true,
                        label: 'URL or File',
                        placeholder: 'https://example.com'
                    },
                    icon: {
                        type: 'select',
                        required: false,
                        label: 'Icon',
                        options: ICON_OPTIONS.map(icon => ({
                            label: icon.label,
                            value: icon.value,
                            icon: icon.mobile,
                            preview: icon.category
                        }))
                    },
                    image: {
                        type: 'image',
                        required: false,
                        label: 'Thumbnail Image',
                        accept: ['jpg', 'jpeg', 'png', 'webp'],
                        maxSize: 1
                    },
                    mediaItems: {
                        type: 'array',
                        required: false,
                        label: 'Media Items (photos/videos)',
                        minItems: 0,
                        maxItems: 20,
                        itemSchema: {
                            id: { type: 'text', required: true, label: 'ID' },
                            type: { type: 'select', required: true, label: 'Type', options: [{ label: 'Photo', value: 'photo' }, { label: 'Video', value: 'video' }] },
                            url: { type: 'text', required: true, label: 'File path' },
                            thumbnail: { type: 'text', required: false, label: 'Thumbnail path' }
                        }
                    }
                }
            },
            contactName: {
                type: 'text',
                required: false,
                label: 'Contact Name',
                placeholder: 'e.g., Jane Smith',
                maxLength: 100
            },
            contactRole: {
                type: 'text',
                required: false,
                label: 'Role / Title',
                placeholder: 'e.g., Sales Director',
                maxLength: 100
            },
            contactPhone: {
                type: 'text',
                required: false,
                label: 'Main Office Phone',
                placeholder: 'Main office number',
                maxLength: 30
            },
            contactPhone2: {
                type: 'text',
                required: false,
                label: 'Personal Phone',
                placeholder: 'Personal phone number',
                maxLength: 30
            },
            contactEmail: {
                type: 'text',
                required: false,
                label: 'Email',
                placeholder: 'contact@example.com',
                maxLength: 150
            },
            contactFax: {
                type: 'text',
                required: false,
                label: 'Fax',
                placeholder: 'Fax number',
                maxLength: 30
            },
            contactWebsite: {
                type: 'text',
                required: false,
                label: 'Website',
                placeholder: 'e.g., example.com',
                maxLength: 200
            },
            contactImageUrl: {
                type: 'image',
                required: false,
                label: 'Contact Photo',
                accept: ['jpg', 'jpeg', 'png', 'webp'],
                maxSize: 2
            }
        },
        defaultData: {
            title: 'Pages',
            links: [
                {
                    id: 'temp_link_1',
                    title: 'Official Website',
                    url: 'https://example.com',
                    icon: 'website',
                    image: ''
                }
            ],
            contactName: '',
            contactRole: '',
            contactPhone: '',
            contactPhone2: '',
            contactEmail: '',
            contactFax: '',
            contactWebsite: '',
            contactImageUrl: ''
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'secondary', 'background', 'text']
        },
        renderingHints: {
            mobile: {
                height: 'auto',
                spacing: 'normal',
                layout: 'single',
                specialFeatures: {
                    quickActions: true,
                    swipeActions: false
                }
            },
            web: {
                responsive: true,
                container: 'contained',
                animation: true,
                specialFeatures: {
                    hoverEffects: true
                }
            }
        },
        version: '1.0.0'
    },
    socialLinks: {
        type: 'socialLinks',
        name: 'Social Media Links',
        description: 'A row of social media profile links with icons',
        category: 'interaction',
        icon: { mobile: 'share-social-outline', web: 'share-2' },
        fields: {
            title: {
                type: 'text',
                required: false,
                label: 'Section Title',
                placeholder: 'Social Media',
                maxLength: 80
            },
            links: {
                type: 'array',
                required: true,
                label: 'Social Links',
                minItems: 1,
                maxItems: 20,
                itemSchema: {
                    platform: { type: 'text', required: true, label: 'Platform', placeholder: 'e.g., facebook' },
                    url: { type: 'text', required: true, label: 'Profile URL', placeholder: 'https://facebook.com/yourpage' },
                    label: { type: 'text', required: false, label: 'Display Label', placeholder: 'Optional custom label' }
                }
            }
        },
        defaultData: {
            title: 'Social Media',
            links: [
                { id: 'temp_social_1', platform: 'facebook', url: '', label: '' },
                { id: 'temp_social_2', platform: 'instagram', url: '', label: '' }
            ]
        },
        styleOptions: {
            canOverride: ['colors', 'typography', 'spacing'],
            colorFields: ['primary', 'background', 'text'],
            defaultStyles: {}
        },
        renderingHints: {
            mobile: { height: 'auto', spacing: 'normal', layout: 'single' },
            web: { responsive: true, container: 'contained', animation: false }
        },
        version: '1.0.0'
    }
};

// Helper Functions
export const getSectionDefinition = (type: string): SectionDefinition | null => {
    return SECTION_DEFINITIONS[type] || null;
};

export const getAllSectionTypes = (): string[] => {
    return Object.keys(SECTION_DEFINITIONS);
};

export const getSectionsByCategory = (category: string): SectionDefinition[] => {
    return Object.values(SECTION_DEFINITIONS).filter(def => def.category === category);
};

export const validateSectionData = (sectionType: string, data: any): { valid: boolean; errors: string[] } => {
    const definition = getSectionDefinition(sectionType);
    if (!definition) {
        return { valid: false, errors: [`Unknown section type: ${sectionType}`] };
    }

    const errors: string[] = [];

    // Validate required fields
    Object.entries(definition.fields).forEach(([fieldName, fieldDef]) => {
        if (fieldDef.required && (!data[fieldName] || data[fieldName] === '')) {
            errors.push(`${fieldDef.label} is required`);
        }

        // Validate text length
        if (fieldDef.type === 'text' && data[fieldName]) {
            const textField = fieldDef as TextField;
            if (textField.maxLength && data[fieldName].length > textField.maxLength) {
                errors.push(`${fieldDef.label} must be ${textField.maxLength} characters or less`);
            }
        }
    });

    return { valid: errors.length === 0, errors };
};

export const getIconForPlatform = (iconValue: string, platform: 'mobile' | 'web'): string => {
    const iconOption = ICON_OPTIONS.find(option => option.value === iconValue);
    return iconOption ? iconOption[platform] : iconValue;
};

// Version compatibility
export const SCHEMA_VERSION = '1.0.0';
export const isCompatibleVersion = (version: string): boolean => {
    return version === SCHEMA_VERSION;
};