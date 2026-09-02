import { getSectionDefinition, SECTION_DEFINITIONS } from "@crown-pages/types";

export type BuilderFieldDefinition = {
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  options?: Array<{ label: string; value: string }>;
  itemSchema?: Record<string, BuilderFieldDefinition>;
  fields?: Record<string, BuilderFieldDefinition>;
  linkTypes?: string[];
  helperText?: string;
};

export type BuilderSectionDefinition = {
  type: string;
  name: string;
  description?: string;
  defaultData: Record<string, unknown>;
  fields: Record<string, BuilderFieldDefinition>;
};

const SOCIAL_PLATFORM_OPTIONS = [
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "tiktok",
  "x",
  "twitter",
  "website",
  "other",
].map((value) => ({
  label: value === "x" ? "X" : value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));

const LOCAL_SECTION_DEFINITIONS: Record<string, BuilderSectionDefinition> = {
  hero: {
    type: "hero",
    name: "Hero Section",
    description: "Background image and overlay logo.",
    defaultData: {
      backgroundImage: "",
      logoUrl: "",
    },
    fields: {
      backgroundImage: {
        type: "image",
        label: "Background Image",
        placeholder: "Paste image URL or upload from your computer",
      },
      logoUrl: {
        type: "image",
        label: "Logo Image (Overlay)",
        placeholder: "Paste logo URL or upload from your computer",
      },
    },
  },
  about: {
    type: "about",
    name: "About Section",
    description: "Title and body copy only.",
    defaultData: {
      title: "",
      content: "",
    },
    fields: {
      title: {
        type: "text",
        label: "Section Title",
        placeholder: "About",
      },
      content: {
        type: "textarea",
        label: "Content",
        rows: 6,
        placeholder: "Write the about section text here",
      },
    },
  },
  socialLinks: {
    type: "socialLinks",
    name: "Social Media Links",
    description: "A row of social media profile links with icons.",
    defaultData: {
      title: "",
      links: [],
    },
    fields: {
      title: {
        type: "text",
        label: "Section Title",
        placeholder: "Social Media",
      },
      links: {
        type: "array",
        label: "Social Links",
        itemSchema: {
          platform: {
            type: "select",
            label: "Platform",
            options: SOCIAL_PLATFORM_OPTIONS,
          },
          url: {
            type: "text",
            label: "Profile URL",
            placeholder: "https://...",
          },
        },
      },
    },
  },
  gallery: {
    type: "gallery",
    name: "Gallery Section",
    description: "Photos and videos in one media section.",
    defaultData: {
      title: "Photos / Videos",
      images: [],
      videos: [],
    },
    fields: {
      title: {
        type: "text",
        label: "Section Title",
        placeholder: "Photos / Videos",
      },
      images: {
        type: "array",
        label: "Images",
        itemSchema: {
          url: {
            type: "image",
            label: "Image",
            placeholder: "Paste image URL or storage path",
          },
          caption: {
            type: "text",
            label: "Caption",
            placeholder: "Optional caption",
          },
        },
      },
      videos: {
        type: "array",
        label: "Videos",
        itemSchema: {
          url: {
            type: "text",
            label: "Video URL",
            placeholder: "Paste video URL or storage path",
          },
          thumbnail: {
            type: "image",
            label: "Thumbnail",
            placeholder: "Paste thumbnail URL or storage path",
          },
          caption: {
            type: "text",
            label: "Caption",
            placeholder: "Optional caption",
          },
        },
      },
    },
  },
  companyHeader: {
    type: "companyHeader",
    name: "Company Header",
    description: "Company name and address.",
    defaultData: {
      companyName: "Company Name",
      address: "123 Main Street, City, State 12345",
    },
    fields: {
      companyName: {
        type: "text",
        label: "Company Name",
        required: true,
        placeholder: "Enter company name",
      },
      address: {
        type: "textarea",
        label: "Address",
        rows: 3,
        placeholder: "Enter full address",
      },
    },
  },
  contactCard: {
    type: "contactCard",
    name: "Contact Card",
    description: "Contact person with image, details, and status.",
    defaultData: {
      name: "Contact Name",
      role: "Position",
      imageUrl: "",
      phone: "",
      email: "",
    },
    fields: {
      name: {
        type: "text",
        label: "Contact Name",
        required: true,
        placeholder: "Enter contact person name",
      },
      role: {
        type: "text",
        label: "Role/Title",
        placeholder: "e.g., Sales Director, Manager",
      },
      phone: {
        type: "text",
        label: "Phone",
        placeholder: "Phone number",
      },
      email: {
        type: "text",
        label: "Email",
        placeholder: "Email address",
      },
      imageUrl: {
        type: "image",
        label: "Contact Image",
        placeholder: "Paste image URL or storage path",
      },
    },
  },
  amenities: {
    type: "amenities",
    name: "Amenities",
    description: "Bulleted amenities list.",
    defaultData: {
      title: "Amenities",
      amenities: [
        { id: "temp_1", name: "Free Wi-Fi" },
        { id: "temp_2", name: "Parking" },
        { id: "temp_3", name: "24/7 Access" },
      ],
    },
    fields: {
      title: {
        type: "text",
        label: "Section Title",
        placeholder: "Amenities & Features",
      },
      amenities: {
        type: "array",
        label: "Amenities List",
        itemSchema: {
          name: {
            type: "text",
            label: "Amenity Name",
            placeholder: "Amenity name (e.g., Free Wi-Fi)",
          },
        },
      },
    },
  },
  multiContact: {
    type: "multiContact",
    name: "Multi Contact",
    description: "Business info with additional contact people.",
    defaultData: {
      title: "Contact Information",
      businessInfo: [
        {
          id: "business_1",
          name: "",
          address: "",
          phone: "",
          fax: "",
          email: "",
          website: "",
        },
      ],
      contactPersons: [],
    },
    fields: {
      title: {
        type: "text",
        label: "Section Title",
        placeholder: "Contact Information",
      },
      businessInfo: {
        type: "array",
        label: "Main Business Information",
        helperText: "Use one business info item to match the mobile editor.",
        itemSchema: {
          name: { type: "text", label: "Business/Organization Name", required: true },
          address: {
            type: "textarea",
            label: "Business Address",
            rows: 2,
            placeholder: "123 Main Street, City, State 12345",
          },
          phone: { type: "text", label: "Main Phone Number", placeholder: "(555) 123-4567" },
          fax: { type: "text", label: "Fax Number", placeholder: "(555) 123-4568" },
          email: { type: "text", label: "Main Email", placeholder: "info@business.com" },
          website: { type: "text", label: "Website", placeholder: "https://www.yourbusiness.com" },
        },
      },
      contactPersons: {
        type: "array",
        label: "Additional Contact",
        itemSchema: {
          name: { type: "text", label: "Contact Name", required: true, placeholder: "John Smith" },
          title: { type: "text", label: "Title/Department", placeholder: "Sales Manager" },
          photo: { type: "image", label: "Photo", placeholder: "Paste image URL or storage path" },
          phone: { type: "text", label: "Direct Phone", placeholder: "(555) 123-4567" },
          extension: { type: "text", label: "Extension", placeholder: "ext. 123" },
          email: { type: "text", label: "Direct Email", placeholder: "john@business.com" },
        },
      },
    },
  },
  medicalProvider: {
    type: "medicalProvider",
    name: "Medical Provider",
    description: "Facility information, services, insurance, certifications, and gallery.",
    defaultData: {
      facilityName: "",
      heroImage: "",
      logo: "",
      streetAddress: "",
      unit: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      fax: "",
      email: "",
      website: "",
      serviceDescription: "",
      priceLow: "",
      priceHigh: "",
      services: [],
      acceptedInsurance: [],
      admissionCoordinator: "",
      admissionCoordinatorPhone: "",
      admissionCoordinatorEmail: "",
      certifications: [],
      galleryTitle: "Photos & Videos",
      galleryImages: [],
      hasEmergencyResponse: "",
      hasPetFriendly: "",
      operatingHours: "",
      documentsTitle: "Documents",
      documents: [],
    },
    fields: {
      facilityName: { type: "text", label: "Facility Name", required: true, placeholder: "Medical Center Name" },
      serviceDescription: {
        type: "textarea",
        label: "Service Description",
        rows: 4,
        placeholder: "Describe your services and what makes your facility special",
      },
      logo: { type: "image", label: "Provider Logo", placeholder: "Paste logo URL or storage path" },
      heroImage: { type: "image", label: "Hero Background Image", placeholder: "Paste hero image URL or storage path" },
      streetAddress: { type: "text", label: "Street Address", placeholder: "123 Medical Drive" },
      unit: { type: "text", label: "Unit/Suite", placeholder: "Suite 100" },
      city: { type: "text", label: "City", placeholder: "Your City" },
      state: { type: "text", label: "State", placeholder: "CA" },
      zipCode: { type: "text", label: "ZIP Code", placeholder: "12345" },
      phone: { type: "text", label: "Phone Number", placeholder: "(555) 123-4567" },
      fax: { type: "text", label: "Fax Number", placeholder: "(555) 123-4568" },
      email: { type: "text", label: "Email Address", placeholder: "info@provider.com" },
      website: { type: "text", label: "Website", placeholder: "https://www.provider.com" },
      priceLow: { type: "text", label: "Price Low", placeholder: "1000" },
      priceHigh: { type: "text", label: "Price High", placeholder: "2500" },
      admissionCoordinator: { type: "text", label: "Admission Coordinator", placeholder: "Coordinator Name" },
      admissionCoordinatorPhone: { type: "text", label: "Admission Coordinator Phone", placeholder: "(555) 123-4567" },
      admissionCoordinatorEmail: { type: "text", label: "Admission Coordinator Email", placeholder: "admissions@provider.com" },
      hasEmergencyResponse: {
        type: "select",
        label: "Emergency Response",
        options: [
          { label: "Not Set", value: "" },
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
      },
      hasPetFriendly: {
        type: "select",
        label: "Pet Friendly",
        options: [
          { label: "Not Set", value: "" },
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
      },
      operatingHours: { type: "text", label: "Operating Hours", placeholder: "Mon-Fri 9AM-5PM" },
      galleryTitle: { type: "text", label: "Gallery Title", placeholder: "Photos & Videos" },
      galleryImages: {
        type: "array",
        label: "Gallery Images",
        itemSchema: {
          url: { type: "image", label: "Image", placeholder: "Paste image URL or storage path" },
          caption: { type: "text", label: "Caption", placeholder: "Optional caption" },
        },
      },
      services: {
        type: "array",
        label: "Services",
        itemSchema: {
          name: { type: "text", label: "Service Name", placeholder: "Physical Therapy" },
          icon: { type: "text", label: "Icon", placeholder: "heart-outline" },
          available: {
            type: "select",
            label: "Available",
            options: [
              { label: "Yes", value: "true" },
              { label: "No", value: "false" },
            ],
          },
        },
      },
      acceptedInsurance: {
        type: "array",
        label: "Accepted Insurance",
        itemSchema: {
          name: { type: "text", label: "Insurance Name", placeholder: "Aetna" },
        },
      },
      certifications: {
        type: "array",
        label: "Certifications",
        itemSchema: {
          name: { type: "text", label: "Certification Name", placeholder: "Board Certified" },
          icon: { type: "text", label: "Icon", placeholder: "ribbon-outline" },
        },
      },
      documentsTitle: { type: "text", label: "Documents Title", placeholder: "Documents" },
      documents: {
        type: "array",
        label: "Documents",
        itemSchema: {
          name: { type: "text", label: "Document Name", placeholder: "Welcome Packet" },
          url: { type: "text", label: "Document URL", placeholder: "Paste file URL or storage path" },
          size: { type: "text", label: "Size", placeholder: "2.4 MB" },
          type: { type: "text", label: "Type", placeholder: "PDF" },
        },
      },
    },
  },
  linksWithContact: {
    type: "linksWithContact",
    name: "Pages",
    description: "Links, PDFs, and contact CTA in one section.",
    defaultData: {
      title: "Pages",
      links: [],
      contactName: "",
      contactRole: "",
      contactPhone: "",
      contactPhone2: "",
      contactEmail: "",
      contactFax: "",
      contactWebsite: "",
      contactImageUrl: "",
      contactStatus: "",
    },
    fields: {
      title: { type: "text", label: "Section Title", placeholder: "Pages" },
      links: {
        type: "array",
        label: "Links",
        itemSchema: {
          title: { type: "text", label: "Title", placeholder: "Pamphlet" },
          url: { type: "text", label: "URL or File Path", placeholder: "https://... or storage path" },
          image: { type: "image", label: "Icon", placeholder: "Paste image URL or storage path" },
        },
      },
      contactName: { type: "text", label: "Contact Name", placeholder: "Justin Williams" },
      contactRole: { type: "text", label: "Contact Role", placeholder: "Admissions Director" },
      contactPhone: { type: "text", label: "Contact Phone", placeholder: "(555) 123-4567" },
      contactPhone2: { type: "text", label: "Second Phone", placeholder: "(555) 123-4567" },
      contactEmail: { type: "text", label: "Contact Email", placeholder: "name@business.com" },
      contactFax: { type: "text", label: "Contact Fax", placeholder: "(555) 123-4568" },
      contactWebsite: { type: "text", label: "Contact Website", placeholder: "https://www.business.com" },
      contactImageUrl: { type: "image", label: "Contact Image", placeholder: "Paste image URL or storage path" },
      contactStatus: { type: "text", label: "Contact Status", placeholder: "Available" },
    },
  },
};

export function getBuilderSectionDefinition(type: string): BuilderSectionDefinition | null {
  const localDefinition = LOCAL_SECTION_DEFINITIONS[type];
  if (localDefinition) {
    return localDefinition;
  }

  const schemaDefinition = getSectionDefinition(type);
  if (schemaDefinition) {
    return schemaDefinition as unknown as BuilderSectionDefinition;
  }

  return null;
}

export function getAvailableBuilderSectionDefinitions() {
  const schemaDefinitions = Object.values(SECTION_DEFINITIONS).map((definition) => ({
    type: definition.type,
    definition: definition as unknown as BuilderSectionDefinition,
  }));

  const schemaTypes = new Set(schemaDefinitions.map((item) => item.type));
  const localDefinitions = Object.values(LOCAL_SECTION_DEFINITIONS)
    .filter((definition) => !schemaTypes.has(definition.type))
    .map((definition) => ({
      type: definition.type,
      definition,
    }));

  return [...schemaDefinitions, ...localDefinitions];
}
