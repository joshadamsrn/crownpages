#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import zipcodesUs from "zipcodes-us";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const pagesDir = path.resolve(repoRoot, "pages");

const PHN_MEDIA_BUCKET = "facility-media-files";
const CROWN_MEDIA_FOLDER_PREFIX = "phn-import";
const DEFAULT_OWNER_EMAIL = "joshadamsrn@gmail.com";
const DEFAULT_CONTACT_IMAGE_URL =
  "https://dbrbbqntpuujgjcinoek.supabase.co/storage/v1/object/public/uploads/phn-import/contact/star.jpg";
const MONUMENT_BOUNTIFUL_LOGO_PATH =
  "phn-import/605e40f7-6f0f-4ae7-a8d4-56bf7a151edf/logo.jpg";

const ASSISTED_LIVING_DEFAULT_AMENITIES = [
  "Delicious Food",
  "Housekeeping Services",
  "24/7 Support Staff",
  "Transportation Services",
  "Activities",
];

const SKILLED_NURSING_DEFAULT_AMENITIES = [
  "Skilled Nursing",
  "Short-Term Rehabilitation",
  "Post-Acute Care",
  "Physical Therapy",
  "Occupational Therapy",
  "Speech Therapy",
  "Nursing Support",
  "Medication Management",
  "Discharge Planning",
  "Care Coordination",
];

const HOME_HEALTH_DEFAULT_AMENITIES = [
  "Home Health",
  "Skilled Nursing Visits",
  "Medication Management",
  "Physical Therapy",
  "Occupational Therapy",
  "Speech Therapy",
  "Wound Care Support",
  "Post-Hospital Recovery Support",
  "Care Coordination",
  "Patient and Family Education",
  "Medicare Accepted",
  "Major Insurance Accepted",
];

const HOSPICE_DEFAULT_AMENITIES = [
  "Hospice Care",
  "Comfort-Focused Care",
  "Pain and Symptom Management",
  "Nursing Support",
  "Medication Support",
  "Social Work Support",
  "Spiritual Care Support",
  "Family Support",
  "Care Coordination",
  "Bereavement Support",
  "Medicare Accepted",
  "Major Insurance Accepted",
];

const IN_HOME_CARE_DEFAULT_AMENITIES = [
  "In-Home Care",
  "Personal Care Support",
  "Companionship",
  "Meal Preparation",
  "Light Housekeeping",
  "Medication Reminders",
  "Transportation Support",
  "Respite Care",
  "Safety Supervision",
  "Flexible Scheduling",
];

const INDEPENDENT_LIVING_DEFAULT_AMENITIES = [
  "Independent Living",
  "Maintenance-Free Living",
  "Community Activities",
  "Dining Options",
  "Housekeeping Services",
  "Transportation Services",
  "Social Programming",
  "Wellness Support",
];

const MEMORY_CARE_DEFAULT_AMENITIES = [
  "Memory Care",
  "Secure Environment",
  "24/7 Support Staff",
  "Medication Management",
  "Personalized Care Plans",
  "Daily Activities",
  "Dining Support",
  "Family Communication",
  "Housekeeping Services",
  "Comfortable Common Areas",
];

const DME_DEFAULT_AMENITIES = [
  "Durable Medical Equipment",
  "Home Medical Equipment",
  "Mobility Support",
  "Equipment Coordination",
  "Delivery Support",
  "Setup Assistance",
  "Patient and Family Education",
  "Insurance Coordination",
];

const TRANSPORTATION_DEFAULT_AMENITIES = [
  "Medical Transportation",
  "Non-Emergency Transportation",
  "Appointment Transportation",
  "Wheelchair Transportation",
  "Senior Transportation Support",
  "Reliable Pickup and Drop-Off",
  "Care Team Coordination",
  "Local Service Area",
];

function buildSpringGardensEnrichment({
  locationName,
  city,
  website,
  phone,
  facebookUrl,
  shortDescription = "Assisted Living",
  services = "assisted living and memory care",
  includeMemoryCare = true,
}) {
  return {
    shortDescription,
    website,
    phone,
    serviceDescription: `${locationName} is an Avista Senior Living community in ${city}, Utah, offering ${services} in a warm senior living setting with personalized care, 24/7 support, restaurant-style dining, activities, and comfortable community amenities.`,
    socialLinks: [
      ...(facebookUrl
        ? [
            {
              id: "social-facebook",
              platform: "facebook",
              url: facebookUrl,
            },
          ]
        : []),
      {
        id: "social-website",
        platform: "website",
        url: website,
      },
    ],
    amenities: [
      "Assisted Living",
      ...(includeMemoryCare ? ["Memory Care"] : []),
      "24/7 Health Care Providers",
      "Strong Nurse Presence",
      "Medication Management",
      "Laundry Services",
      "Kitchenettes in Assisted Living Units",
      "Restaurant-Style Dining",
      "Activities and Social Programming",
      "Theater and Craft Rooms",
      "Spacious Premium Rooms",
      "Luxury Finishes",
      "Emergency Response Systems",
      ...(includeMemoryCare ? ["Secure Memory Care Courtyard"] : []),
    ],
    resources: [
      {
        id: "resource-website",
        title: `${locationName} Website`,
        url: website,
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: website,
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: `${website}#amenities`,
        icon: "heart",
      },
      ...(includeMemoryCare
        ? [
            {
              id: "resource-memory-care-guide",
              title: "Memory Care Guide",
              url: "https://8996515.fs1.hubspotusercontent-na1.net/hubfs/8996515/E-Books/Ultimate%20Guide%20to%20Dementia%20and%20Memory%20Care%20E-Book_Avista.pdf",
              icon: "document",
            },
          ]
        : []),
      {
        id: "resource-contact",
        title: "Request Information",
        url: `${website}#contact`,
        icon: "calendar",
      },
    ],
  };
}

function buildAbbingtonEnrichment({
  locationName,
  city,
  website,
  phone,
  apartmentCount,
  setting,
}) {
  return {
    shortDescription: "Assisted Living / Independent Living / Memory Care",
    website,
    phone,
    serviceDescription:
      `${locationName} is an Abbington Senior Living community in ${city}, Utah, offering independent living, assisted living, and memory care with ${apartmentCount} apartments, ${setting}, restaurant-style gourmet meals, nurse-supported care, activities, and comfortable community amenities.`,
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: website,
      },
    ],
    amenities: [
      "Independent Living",
      "Assisted Living",
      "Memory Care",
      "Gourmet Meals",
      "Restaurant-Style Dining",
      "Ice Cream Parlor",
      "Housekeeping",
      "Laundry Facilities",
      "Scheduled Transportation",
      "Movie Theater",
      "Fitness Center",
      "Full-Service Salon",
      "Library",
      "Activities and Social Events",
      "Memory Programs",
      "Wellness Programs",
      "Social and Spiritual Programs",
      "Nurse-Supported Care",
    ],
    resources: [
      {
        id: "resource-website",
        title: `${locationName} Website`,
        url: website,
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living at Abbington",
        url: "https://abbingtonseniorliving.com/assisted-living/",
        icon: "heart",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://abbingtonseniorliving.com/independent-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://abbingtonseniorliving.com/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities & Activities",
        url: `${website}#amenities`,
        icon: "list",
      },
      {
        id: "resource-locations",
        title: "Abbington Communities",
        url: "https://abbingtonseniorliving.com/locations/",
        icon: "building",
      },
      {
        id: "resource-tour",
        title: "Request a Tour",
        url: "https://abbingtonseniorliving.com/contact/",
        icon: "calendar",
      },
    ],
  };
}

function buildFormerSandstoneMonumentEnrichment({
  displayName,
  city,
  website,
  phone,
  formerName,
  extraAmenities = [],
}) {
  return {
    displayName,
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website,
    phone,
    logoUrl: MONUMENT_BOUNTIFUL_LOGO_PATH,
    contactName: `${displayName} Admissions`,
    contactRole: "Admissions",
    contactPhone: phone,
    serviceDescription:
      `${displayName} is a skilled nursing and rehabilitation facility in ${city}, Utah, offering short-term rehabilitation, long-term care, post-acute support, skilled nursing, physical therapy, occupational therapy, speech therapy, medication management, discharge planning, and coordinated clinical support for patients recovering after hospitalization, surgery, injury, or illness.`,
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: website,
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Post-Acute Care",
      "24-Hour Skilled Nursing",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Medication Management",
      "Care Coordination",
      "Discharge Planning",
      "Wound Care Support",
      "Respiratory Therapy Support",
      "In-House Therapy",
      "Activities and Social Programming",
      "Dining Services",
      "Housekeeping Services",
      "Medicare Accepted",
      "Medicaid Accepted",
      "Major Insurance Accepted",
      ...extraAmenities,
    ],
    resources: [
      {
        id: "resource-website",
        title: `${displayName} Website`,
        url: website,
        icon: "home",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing Services",
        url: "https://monumenthg.com/services/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-short-term-rehab",
        title: "Short-Term Rehabilitation",
        url: "https://monumenthg.com/services/short-term-rehabilitation/",
        icon: "heart",
      },
      {
        id: "resource-services",
        title: "Monument Health Services",
        url: "https://monumenthg.com/services/",
        icon: "list",
      },
      {
        id: "resource-former-name",
        title: `Formerly ${formerName}`,
        url: website,
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Monument Health",
        url: `${website}#contact`,
        icon: "calendar",
      },
    ],
  };
}

function buildGablesEnrichment({ locationName, city, website, phone }) {
  return {
    shortDescription: "Assisted Living / Memory Care",
    website,
    phone,
    serviceDescription:
      `${locationName} is part of The Gables Assisted Living family, offering assisted living and memory care support in ${city}, Utah, with a small, home-like setting, home-cooked meals, housekeeping, medication management, activity programming, outdoor spaces, and 24-hour on-call nursing support.`,
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: website,
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Spacious Suites",
      "Home-Cooked Meals",
      "Housekeeping Services",
      "Medication Management",
      "24-Hour On-Call Nursing Support",
      "On-Site Salon",
      "Activity Programs",
      "Game Nights",
      "Group Exercise Classes",
      "Arts and Crafts",
      "Community Outings",
      "Raised Bed Gardening",
      "Patios or Courtyards",
      "Laundry Services",
      "Transportation",
      "Respite Care",
      "Hourly Adult Care",
      "Family-Like Atmosphere",
    ],
    resources: [
      {
        id: "resource-website",
        title: `${locationName} Website`,
        url: website,
        icon: "home",
      },
      {
        id: "resource-utah-assisted-living",
        title: "Utah Assisted Living",
        url: "https://www.thegablesfamily.com/utah-assisted-living/",
        icon: "list",
      },
      {
        id: "resource-locations",
        title: "The Gables Locations",
        url: "https://www.thegablesfamily.com/locations/",
        icon: "building",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: website,
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.thegablesfamily.com/contact-us/",
        icon: "calendar",
      },
    ],
  };
}

function buildRetreatEnrichment({ locationName, website, phone, neighborhoodDetail }) {
  return {
    shortDescription: "Assisted Living / Memory Care / Respite Care",
    website,
    phone,
    serviceDescription:
      `${locationName} is a Jaybird Senior Living community in St. George, Utah, offering assisted living, memory care, and respite care with supportive caregivers, restaurant-style dining, community activities, outdoor spaces, pet-friendly apartments, and services designed to help residents enjoy a warmhearted retirement lifestyle.`,
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: website,
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Respite Care",
      "Restaurant-Style Dining",
      "Made-to-Order Meals",
      "Community Activities",
      "Music Programs",
      "Fitness and Mobility Classes",
      "Arts and Crafts",
      "Shopping and Local Outings",
      "Outdoor Courtyard",
      "Walking Trails",
      "Pet-Friendly Apartments",
      "Caregiver Support",
      "Medication Assistance",
      "Personal Hygiene Assistance",
      "Dressing Assistance",
      "Transfer Assistance",
      "Resource Articles",
      neighborhoodDetail,
    ].filter(Boolean),
    resources: [
      {
        id: "resource-website",
        title: `${locationName} Website`,
        url: website,
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: `${website}assisted-living/`,
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: `${website}memory-care/`,
        icon: "heart",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: `${website}respite-care/`,
        icon: "calendar",
      },
      {
        id: "resource-services",
        title: "Services",
        url: `${website}services/`,
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: `${website}amenities/`,
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: `${website}floor-plans/`,
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: website,
        icon: "calendar",
      },
    ],
  };
}

function buildRidgeEnrichment({ locationName, city, website, phone }) {
  return {
    shortDescription: "Assisted Living / Memory Care",
    website,
    phone,
    serviceDescription:
      `${locationName} is a luxury Ridge Senior Living community in ${city}, Utah, offering assisted living and memory care with upscale services, resort-style amenities, dining, wellness programming, 24-hour staffing, medication management, transportation, and thoughtfully designed residences.`,
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: website,
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "24-Hour Senior Care and Staffing",
      "Medication Management",
      "Emergency Response System",
      "Flexible Dining Plan",
      "Fresh Diverse Menus",
      "Private Dining Rooms",
      "Fitness Room",
      "Health and Wellness Activities",
      "Door-to-Door Outings",
      "Local Transportation",
      "Beauty Salon and Barbershop",
      "Movie Theater",
      "Game Room",
      "Multipurpose Room",
      "Landscaped Grounds",
      "Courtyards",
      "Community Garden Beds",
      "Underground Parking",
      "Pet-Friendly Policy",
      "Weekly Housekeeping",
      "Concierge Services",
      "Free Wi-Fi in Common Areas",
    ],
    resources: [
      {
        id: "resource-website",
        title: `${locationName} Website`,
        url: website,
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: `${website}lifestyles-care/assisted-living/`,
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: `${website}lifestyles-care/memory-care/`,
        icon: "heart",
      },
      {
        id: "resource-services-amenities",
        title: "Services & Amenities",
        url: `${website}the-ridge-experience/services-amenities/`,
        icon: "list",
      },
      {
        id: "resource-wellness",
        title: "Wellness Programs",
        url: `${website}the-ridge-experience/wellness/`,
        icon: "heart",
      },
      {
        id: "resource-location",
        title: "Location & Area",
        url: `${website}the-ridge-experience/location/`,
        icon: "map",
      },
      {
        id: "resource-tour",
        title: "Contact & Schedule",
        url: `${website}contact/`,
        icon: "calendar",
      },
    ],
  };
}

const PROFILE_ENRICHMENTS = {
  "eb024929-5a1a-4707-85cb-cfc9b41fcded": {
    website: "https://www.acaciasprings.com/",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/acaciaspringsseniorliving/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/acaciasprings/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.acaciasprings.com/",
      },
    ],
    amenities: [
      "Restaurant-Style Dining",
      "Health and Wellness Programs",
      "Fitness Lessons",
      "Everyday Activities",
      "Transportation Services",
      "Therapy Partners",
    ],
    resources: [
      {
        id: "resource-lifestyle-amenities",
        title: "Lifestyle & Amenities",
        url: "https://www.acaciasprings.com/lifestyle-and-amenities/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.acaciasprings.com/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://www.acaciasprings.com/virtual-tour-gallery/#virtual-tour",
        icon: "video",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.acaciasprings.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-graceful-dining",
        title: "Graceful Dining",
        url: "https://www.acaciasprings.com/lifestyle-and-amenities/#graceful-dining",
        icon: "restaurant",
      },
      {
        id: "resource-contact",
        title: "Request Tour",
        url: "https://www.acaciasprings.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "8913793c-95cc-4a76-9208-3cd27877885b": {
    website: "https://appletreeal.com/",
    fax: "801-546-5606",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/Apple-Tree-Assisted-Living-111399732258275/",
      },
      {
        id: "social-youtube",
        platform: "youtube",
        url: "https://www.youtube.com/channel/UCvAukXsNFUDLbgnK5n2oCUw",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://appletreeal.com/",
      },
    ],
    amenities: [
      "Restaurant-Style Dining",
      "Indoor Gardens",
      "Social & Recreational Activities",
      "Housekeeping & Laundry Services",
      "24-Hour On-Site Assistance",
      "Medication Management",
      "Medical Transportation",
    ],
    resources: [
      {
        id: "resource-care-services",
        title: "Care Services",
        url: "https://appletreeal.com/services-amenities/levels-of-care/",
        icon: "list",
      },
      {
        id: "resource-senior-living-options",
        title: "Senior Living Options",
        url: "https://appletreeal.com/community/senior-living-options/",
        icon: "home",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://appletreeal.com/community/photo-gallery/",
        icon: "document",
      },
      {
        id: "resource-sample-calendar",
        title: "Sample Calendar",
        url: "https://appletreeal.com/sample-calendar/",
        icon: "calendar",
      },
      {
        id: "resource-sample-menu",
        title: "Sample Menu",
        url: "https://appletreeal.com/services-amenities/sample-menu/",
        icon: "restaurant",
      },
      {
        id: "resource-contact",
        title: "Request Tour",
        url: "https://appletreeal.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "b57e8594-158f-4e3f-80b9-dd479ba9f089": {
    website: "https://www.autumnparkseniorliving.com/",
    serviceDescription:
      "Autumn Park Assisted Living provides 365 days a year of services with specific support schedules developed around each individual's assessed needs. They provide comfort and security in a warm, skilled, home-like atmosphere for seniors in Washington, Utah.",
    fax: "435-275-4407",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.autumnparkseniorliving.com/",
      },
    ],
    amenities: [
      "All-Private Rooms",
      "24-Hour Security",
      "Attendant Call Pendants",
      "Three Meals Daily Plus Snacks",
      "Personal Barber & Beauty Services",
      "Walk-In Bathtub / Roll-In Shower",
      "Free WiFi & Satellite TV",
      "Relaxing Patio Area",
    ],
    resources: [
      {
        id: "resource-what-we-offer",
        title: "What We Offer",
        url: "https://www.autumnparkseniorliving.com/services/",
        icon: "list",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://www.autumnparkseniorliving.com/virtual-tour/",
        icon: "video",
      },
      {
        id: "resource-self-assessment",
        title: "Self Assessment",
        url: "https://www.autumnparkseniorliving.com/resources/self-assessment/",
        icon: "check",
      },
      {
        id: "resource-cost-comparison",
        title: "Cost Comparison",
        url: "https://www.autumnparkseniorliving.com/resources/cost-comparison/",
        icon: "document",
      },
      {
        id: "resource-blog",
        title: "Senior Living Blog",
        url: "https://www.autumnparkseniorliving.com/resources/blog/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.autumnparkseniorliving.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "77e210aa-98e2-4db9-9611-23c9453325a1": {
    website: "https://avamereatcheyenne.com/",
    phone: "702-658-5882",
    fax: "702-658-5842",
    serviceDescription:
      "Avamere at Cheyenne provides independent and assisted living in Las Vegas with personalized care, engaging activities, restaurant-style dining, transportation, and a comfortable senior living environment.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://avamereatcheyenne.com/",
      },
    ],
    amenities: [
      "Personalized Care",
      "Medication Reminders",
      "Health & Wellness Checks",
      "Vibrant Activities Calendar",
      "Restaurant-Style Dining",
      "In-House Transportation",
      "Fitness Classes",
      "Housekeeping and Maintenance",
      "24-Hour Staff",
      "Emergency Call System",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://avamereatcheyenne.com/assisted-living-in-las-vegas-nv/",
        icon: "home",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://avamereatcheyenne.com/amenities/",
        icon: "list",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://avamereatcheyenne.com/independent-living-in-las-vegas-nv/",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://avamereatcheyenne.com/respite-care/",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://avamereatcheyenne.com/wp-content/uploads/2022/02/Avamere-at-Cheyenne-Floorplans.pdf",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://avamereatcheyenne.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "6c9a7699-57be-4feb-a86b-6f4c8da4dbac": {
    website: "https://avamereatmountainridge.com/",
    phone: "801-475-5111",
    fax: "801-475-1884",
    serviceDescription:
      "Avamere at Mountain Ridge offers assisted living and memory care in South Ogden, Utah, with personalized care, engaging activities, restaurant-style dining, and a safe, active senior living environment.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://avamereatmountainridge.com/",
      },
    ],
    amenities: [
      "Personalized Care",
      "Medication Management and Reminders",
      "Regular Wellness Assessments",
      "Restaurant-Style Dining",
      "Private Apartments",
      "Housekeeping and Laundry",
      "Fitness Classes",
      "Transportation to Appointments",
      "Enclosed Courtyard",
      "24-Hour Staff",
      "Emergency Call System",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://avamereatmountainridge.com/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://avamereatmountainridge.com/memory-care-in-south-ogden-ut/",
        icon: "home",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://avamereatmountainridge.com/amenities/",
        icon: "list",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://avamereatmountainridge.com/virtual-tour/",
        icon: "video",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://avamereatmountainridge.com/wp-content/uploads/2022/01/Avamere-at-Mountain-Ridge-Floorplans.pdf",
        icon: "document",
      },
      {
        id: "resource-dining",
        title: "Dine With Us",
        url: "https://avamereatmountainridge.com/dine-with-us/",
        icon: "restaurant",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://avamereatmountainridge.com/tour/",
        icon: "calendar",
      },
    ],
  },
  "9e31a050-0303-426b-8bfe-9fd736b2d1d3": {
    website: "https://bartoncreekseniorliving.com/",
    phone: "801-298-4200",
    fax: "801-397-8029",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/BartonCreekSL/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://bartoncreekseniorliving.com/",
      },
    ],
    amenities: [
      "24-Hour Awake Staff",
      "Restaurant-Style Dining",
      "Weekly Housekeeping and Linen Service",
      "Medication Reviews",
      "Social and Recreational Activities",
      "Beds Made Daily",
      "Scheduled Transportation",
      "Utilities, WiFi, Phone, and TV Included",
    ],
    resources: [
      {
        id: "resource-care-services",
        title: "Care Services",
        url: "https://bartoncreekseniorliving.com/services-amenities/levels-of-care/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://bartoncreekseniorliving.com/services-amenities/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-sample-menu",
        title: "Sample Menu",
        url: "https://bartoncreekseniorliving.com/services-amenities/sample-menu/",
        icon: "restaurant",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://bartoncreekseniorliving.com/services-amenities/events/",
        icon: "calendar",
      },
      {
        id: "resource-photo-gallery",
        title: "Photo Gallery",
        url: "https://bartoncreekseniorliving.com/our-community/photo-gallery/",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://bartoncreekseniorliving.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "197a2cfa-f657-427d-9267-a97be11c165d": {
    website: "https://www.beaconcrestseniorliving.com/",
    phone: "801-951-1300",
    fax: "801-770-0328",
    contactRole: "Executive Director / President",
    serviceDescription:
      "Beacon Crest of Draper offers luxury assisted and independent senior living in Draper, Utah, with personalized care, gourmet dining, elegant common spaces, engaging activities, and custom floor plans.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/beaconcrest/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/beaconcrestsl/",
      },
      {
        id: "social-youtube",
        platform: "youtube",
        url: "https://www.youtube.com/@beaconcrest5281",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.beaconcrestseniorliving.com/",
      },
    ],
    amenities: [
      "Personalized Care Services",
      "Luxury Community Amenities",
      "Executive Culinary Service",
      "Custom Floor Plans",
      "Engaging Activities",
      "24-Hour Emergency Call System",
      "Independent Living Cottages",
      "Gourmet Dining",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.beaconcrestseniorliving.com/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-personalized-care",
        title: "Personalized Care",
        url: "https://www.beaconcrestseniorliving.com/personalized-care-services/",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Luxury Amenities",
        url: "https://www.beaconcrestseniorliving.com/luxury-community-amenities/",
        icon: "list",
      },
      {
        id: "resource-dining",
        title: "Dining",
        url: "https://www.beaconcrestseniorliving.com/executive-culinary-service/",
        icon: "restaurant",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.beaconcrestseniorliving.com/custom-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-reviews",
        title: "Reviews",
        url: "https://www.beaconcrestseniorliving.com/reviews/",
        icon: "check",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.beaconcrestseniorliving.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "0ea51dde-78aa-412d-ad26-0ca8e98c1499": {
    website: "https://beehivehomes.com/locations/riverton/",
    phone: "801-253-2237",
    fax: "801-253-2238",
    serviceDescription:
      "BeeHive Homes of Riverton provides assisted living, memory care, and respite care in a residential, home-like setting with private rooms, 24-hour support, home-cooked meals, housekeeping, laundry, and life-enrichment activities.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/beehivehomesofriverton",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/riverton/",
      },
    ],
    amenities: [
      "Private Rooms with Bathrooms",
      "24-Hour Support",
      "Home-Cooked Meals",
      "Medication Monitoring",
      "Housekeeping and Laundry Services",
      "Social Activities and Outings",
      "Daily Physical and Mental Exercise",
      "Utilities, Telephone, and Cable TV Included",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/riverton/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/riverton/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://beehivehomes.com/locations/riverton/",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://beehivehomes.com/locations/riverton/",
        icon: "heart",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://beehivehomes.com/locations/riverton/",
        icon: "list",
      },
      {
        id: "resource-photo-gallery",
        title: "Photo Gallery",
        url: "https://www.facebook.com/beehivehomesofriverton",
        icon: "image",
      },
      {
        id: "resource-request-info",
        title: "Request Info",
        url: "https://beehivehomes.com/locations/riverton/",
        icon: "calendar",
      },
    ],
  },
  "78a874e8-a833-495e-bd38-ec02377c3589": {
    website: "https://beehivehomes.com/locations/draper/",
    phone: "801-495-3100",
    fax: "801-495-3114",
    serviceDescription:
      "BeeHive Homes of Draper provides assisted living, memory care, senior day care, and respite care in a warm residential setting with private rooms, 24-hour support, home-cooked meals, housekeeping, laundry, and life-enrichment activities.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/draper/",
      },
    ],
    amenities: [
      "Private Rooms with Bathrooms",
      "24-Hour Staffing",
      "Home-Cooked Meals",
      "Medication Assistance",
      "Daily Housekeeping",
      "Laundry Services",
      "Secure Outdoor Courtyard",
      "Hair / Nail Salon",
      "Life Enrichment Activities",
      "Utilities, Telephone, Cable TV, and WiFi Included",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/draper/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/draper/custom/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://beehivehomes.com/locations/draper/custom/memory-care",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://beehivehomes.com/locations/draper/custom/respite-care",
        icon: "heart",
      },
      {
        id: "resource-adls",
        title: "Daily Living Assistance",
        url: "https://beehivehomes.com/locations/draper/custom/adls-draper",
        icon: "list",
      },
      {
        id: "resource-photos-tour",
        title: "Photos & Virtual Tour",
        url: "https://beehivehomes.com/locations/draper/",
        icon: "image",
      },
      {
        id: "resource-request-info",
        title: "Request Info",
        url: "https://beehivehomes.com/locations/draper/",
        icon: "calendar",
      },
    ],
  },
  "7046ca48-d7be-46cd-a7ad-2117820ea8a9": {
    website: "https://beehivehomes.com/locations/henderson/",
    phone: "702-551-0265",
    fax: "702-462-2993",
    serviceDescription:
      "BeeHive Homes of Henderson provides assisted living and memory care in a comfortable home-like setting with private rooms, ADA-approved bathrooms, home-cooked meals, activities, housekeeping, laundry, and daily support.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/BeeHiveHomesofHenderson/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/henderson/",
      },
    ],
    amenities: [
      "Private Rooms with ADA-Approved Bathrooms",
      "24-Hour Staffing",
      "Home-Cooked Meals",
      "Medication Monitoring",
      "Housekeeping and Laundry Services",
      "Social Activities and Outings",
      "Daily Physical and Mental Exercise",
      "Secure Outdoor Courtyard",
      "Hair / Nail Salon",
      "Public WiFi and Cable TV",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/henderson/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/henderson/custom/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://beehivehomes.com/locations/henderson/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://beehivehomes.com/locations/henderson/",
        icon: "list",
      },
      {
        id: "resource-photo-gallery",
        title: "Photo Gallery",
        url: "https://www.facebook.com/BeeHiveHomesofHenderson/",
        icon: "image",
      },
      {
        id: "resource-request-info",
        title: "Request Info",
        url: "https://beehivehomes.com/locations/henderson/",
        icon: "calendar",
      },
    ],
  },
  "6f16562e-4d99-4ab8-978a-6c99ae778e18": {
    website: "https://beehivehomes.com/locations/herriman/",
    phone: "801-203-0800",
    fax: "801-446-6003",
    serviceDescription:
      "BeeHive Homes of Herriman provides assisted living, memory care, respite care, and day care in a warm, home-like community with private rooms, 24-hour support, home-cooked meals, housekeeping, laundry, and daily activities.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/herriman/",
      },
    ],
    amenities: [
      "Private Rooms with Bathrooms",
      "24-Hour Staffing",
      "RN On Call 24/7",
      "Home-Cooked Meals",
      "Medication Monitoring",
      "Daily Housekeeping and Laundry",
      "Social Activities and Outings",
      "Daily Physical and Mental Exercise",
      "Utilities, Telephone, Cable TV, and WiFi Included",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/herriman/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/herriman/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://beehivehomes.com/locations/herriman/",
        icon: "home",
      },
      {
        id: "resource-video-tour",
        title: "Video Tour",
        url: "https://beehivehomes.com/locations/herriman/",
        icon: "video",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://beehivehomes.com/locations/herriman/",
        icon: "list",
      },
      {
        id: "resource-request-info",
        title: "Request Info",
        url: "https://beehivehomes.com/locations/herriman/",
        icon: "calendar",
      },
    ],
  },
  "3a1bca62-f455-4256-ab18-fd10dd1eec37": {
    website: "https://beehivehomes.com/locations/mesquite/",
    phone: "702-381-6899",
    fax: "702-346-0867",
    serviceDescription:
      "BeeHive Homes of Mesquite provides assisted living, respite care, and senior living services in a comfortable home-like setting with private rooms, ADA-approved bathrooms, home-cooked meals, activities, housekeeping, laundry, and daily support.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/beehivehomesofmesquite",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/mesquite/",
      },
    ],
    amenities: [
      "Private Rooms with ADA-Approved Bathrooms",
      "24-Hour Staffing",
      "Family Style Dining",
      "Home-Cooked Meals",
      "Medication Assistance",
      "Daily Housekeeping and Laundry",
      "Life Enrichment Activities",
      "Hair / Nail Salon",
      "Utilities, Telephone, Cable TV, and Public WiFi",
      "Respite Care",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/mesquite/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/mesquite/",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://beehivehomes.com/locations/mesquite/",
        icon: "heart",
      },
      {
        id: "resource-videos",
        title: "Videos",
        url: "https://beehivehomes.com/locations/mesquite/",
        icon: "video",
      },
      {
        id: "resource-photos",
        title: "Photos",
        url: "https://beehivehomes.com/locations/mesquite/",
        icon: "image",
      },
      {
        id: "resource-pricing",
        title: "Pricing & Packages",
        url: "https://beehivehomes.com/locations/mesquite/",
        icon: "document",
      },
      {
        id: "resource-our-story",
        title: "Our Story",
        url: "https://beehivehomes.com/locations/mesquite/custom/our-story",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Us",
        url: "https://beehivehomes.com/locations/mesquite/custom/contact-us",
        icon: "calendar",
      },
    ],
  },
  "272ae02d-d112-4e1a-a2db-bfc58ca31003": {
    website: "https://beehivecare.com/river-road-little-valley/",
    phone: "435-634-7637",
    fax: "866-300-9276",
    serviceDescription:
      "BeeHive Homes River Road / Little Valley is a 16-room assisted living home in St. George, Utah, offering Level 2 care in a small, home-like setting for the Little Valley and Bloomington Hills communities.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivecare.com/river-road-little-valley/",
      },
    ],
    amenities: [
      "16-Room Residential Home",
      "Level 2 Assisted Living Care",
      "24-Hour Care",
      "Medication Assistance",
      "Home-Cooked Meals",
      "Daily Housekeeping",
      "Laundry Services",
      "Individual and Group Activities",
      "Respite / Short-Term Stay",
      "Scheduled Transportation",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivecare.com/river-road-little-valley/",
        icon: "home",
      },
      {
        id: "resource-level-2-care",
        title: "Level 2 Care",
        url: "https://beehivecare.com/river-road-little-valley/",
        icon: "list",
      },
      {
        id: "resource-location",
        title: "Location",
        url: "https://beehivecare.com/river-road-little-valley/",
        icon: "map",
      },
      {
        id: "resource-request-info",
        title: "Request Information",
        url: "https://beehivecare.com/river-road-little-valley/",
        icon: "calendar",
      },
      {
        id: "resource-beehive-care",
        title: "BeeHive Care",
        url: "https://beehivecare.com/",
        icon: "website",
      },
    ],
  },
  "85fcb0b1-abe9-4475-a6dc-08dd47474a6c": {
    website: "https://beehivehomes.com/locations/salt-lake-city/",
    phone: "385-237-0800",
    fax: false,
    serviceDescription:
      "BeeHive Homes of Salt Lake City provides assisted living, memory care, and respite care in a smaller residential setting where professional caregivers can offer more personal support and get to know each resident's individual needs.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/beehivehomesofslc",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/salt-lake-city/",
      },
    ],
    amenities: [
      "Private Rooms with Bathrooms",
      "24-Hour Staffing",
      "Home-Cooked Meals",
      "Medication Monitoring",
      "Housekeeping and Laundry Services",
      "Social Activities and Outings",
      "Daily Physical and Mental Exercise",
      "Utilities, Telephone, Cable TV, and WiFi Included",
      "Respite Care",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/salt-lake-city/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/salt-lake-city/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://beehivehomes.com/locations/salt-lake-city/",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://beehivehomes.com/locations/salt-lake-city/",
        icon: "heart",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://beehivehomes.com/locations/salt-lake-city/",
        icon: "list",
      },
      {
        id: "resource-request-info",
        title: "Request Info",
        url: "https://beehivehomes.com/locations/salt-lake-city/",
        icon: "calendar",
      },
    ],
  },
  "b4bf4fc5-1d8c-4d5b-a099-ecd2864cbcb2": {
    website: "https://beehivehomes.com/locations/santaquin/",
    phone: "801-477-9015",
    fax: false,
    serviceDescription:
      "BeeHive Homes of Santaquin provides assisted living, memory care, and respite care in a residential setting with private rooms, 24-hour support, home-cooked meals, housekeeping, laundry, activities, and consulting nursing support.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/santaquin/",
      },
    ],
    amenities: [
      "Private Rooms with Bathrooms",
      "24-Hour Staffing",
      "Consulting Nurse Available 24/7",
      "Home-Cooked Meals",
      "Medication Monitoring",
      "Housekeeping and Laundry Services",
      "Social Activities and Outings",
      "Daily Physical and Mental Exercise",
      "Secure Outdoor Courtyard",
      "Hair / Nail Salon",
      "Utilities, Telephone, Cable TV, and WiFi Included",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/santaquin/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/santaquin/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://beehivehomes.com/locations/santaquin/",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://beehivehomes.com/locations/santaquin/",
        icon: "heart",
      },
      {
        id: "resource-video",
        title: "Video",
        url: "https://beehivehomes.com/locations/santaquin/",
        icon: "video",
      },
      {
        id: "resource-faq",
        title: "Frequently Asked Questions",
        url: "https://beehivehomes.com/locations/santaquin/",
        icon: "document",
      },
      {
        id: "resource-request-info",
        title: "Request Info",
        url: "https://beehivehomes.com/locations/santaquin/",
        icon: "calendar",
      },
    ],
  },
  "fb18319a-e3f6-4804-9afe-55bb04664f00": {
    website: "https://beehivehomes.com/locations/st-george-snow-canyon/",
    phone: "435-525-2183",
    fax: false,
    serviceDescription:
      "BeeHive Homes of St. George Snow Canyon provides assisted living, memory care, and respite care in a warm, home-like environment with just 11 private rooms, all-inclusive pricing, 24/7 care, home-cooked meals, activities, and nursing oversight.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/",
      },
    ],
    amenities: [
      "11 Private Rooms",
      "24/7 Care",
      "Home-Cooked Meals and Snacks",
      "Medication Management",
      "Daily Housekeeping and Laundry",
      "Utilities Included",
      "DirecTV",
      "Biannual Nursing Assessments",
      "Secure Outdoor Courtyard",
      "Life Enrichment Activities",
      "Respite Care",
    ],
    resources: [
      {
        id: "resource-care-options",
        title: "Care Options",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/custom/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/",
        icon: "heart",
      },
      {
        id: "resource-photos",
        title: "Photos",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/",
        icon: "image",
      },
      {
        id: "resource-faq",
        title: "Frequently Asked Questions",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/",
        icon: "document",
      },
      {
        id: "resource-request-info",
        title: "Request Info",
        url: "https://beehivehomes.com/locations/st-george-snow-canyon/",
        icon: "calendar",
      },
    ],
  },
  "4bcee528-b56d-42d3-8334-f54d737f0834": {
    website: "https://www.bellaviewassistedliving.com/",
    phone: "801-980-8100",
    fax: "385-287-7140",
    serviceDescription:
      "Bellaview Assisted Living in Lehi offers assisted living and memory care with specialized personal care, vibrant activities, chef-prepared meals, a garden courtyard, a therapy dog, and a warm community-centered environment.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.bellaviewassistedliving.com/",
      },
    ],
    amenities: [
      "Chef-Prepared Meals",
      "Weekly Housekeeping and Linen Services",
      "24-Hour Staff",
      "Pendant Alert Safety System",
      "Garden Courtyard with Waterfall",
      "Bellaview Bistro",
      "Beauty Salon and Fitness Center",
      "Movie Theater",
      "Complimentary WiFi",
      "Transportation to Medical Appointments",
      "Therapy Dog",
    ],
    resources: [
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://www.bellaviewassistedliving.com/",
        icon: "video",
      },
      {
        id: "resource-rooms-amenities",
        title: "Rooms & Amenities",
        url: "https://www.bellaviewassistedliving.com/senior-rooms-and-amenities",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.bellaviewassistedliving.com/senior-rooms-and-amenities",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.bellaviewassistedliving.com/senior-rooms-and-amenities",
        icon: "home",
      },
      {
        id: "resource-photo-gallery",
        title: "Photo Gallery",
        url: "https://www.bellaviewassistedliving.com/",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact Us",
        url: "https://www.bellaviewassistedliving.com/",
        icon: "calendar",
      },
    ],
  },
  "e01f8fca-771e-4fe1-bcc5-5c01289eb0a7": {
    website: "https://birchcreekassistedliving.com/",
    phone: "435-554-1776",
    fax: "435-557-0200",
    serviceDescription:
      "Birch Creek Assisted Living in Smithfield, Utah creates a safe, home-like environment with assisted living care, beautiful surroundings, clean common spaces, care packages, activities, and support from dedicated caregivers.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/birchcreekassistedliving/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://birchcreekassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living Care",
      "Care Packages",
      "Safe Home-Like Environment",
      "Beautiful Common Spaces",
      "Housekeeping Support",
      "Activities",
      "Dining Support",
      "Personal Care Assistance",
      "Dedicated Caregivers",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://birchcreekassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-care-packages",
        title: "Care Packages",
        url: "https://birchcreekassistedliving.com/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://birchcreekassistedliving.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://birchcreekassistedliving.com/floor-plans/",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://birchcreekassistedliving.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "cc02539e-3622-4df2-95a6-0381c276309f": {
    website: "https://blacksmithforkassistedliving.com/",
    phone: "435-994-3000",
    fax: "435-994-3700",
    serviceDescription:
      "Blacksmith Fork Assisted Living in Hyrum, Utah provides a safe, home-like assisted living environment with beautiful spaces, clean common areas, personalized care, care packages, activities, and dedicated caregivers.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/blacksmithforkassistedliving/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://blacksmithforkassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living Care",
      "Care Packages",
      "Safe Home-Like Environment",
      "Beautiful Common Spaces",
      "Housekeeping Support",
      "Activities",
      "Dining Support",
      "Personal Care Assistance",
      "Dedicated Caregivers",
    ],
    resources: [
      {
        id: "resource-about",
        title: "About Blacksmith Fork",
        url: "https://blacksmithforkassistedliving.com/about/",
        icon: "document",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living Care",
        url: "https://blacksmithforkassistedliving.com/assisted-living-care/",
        icon: "home",
      },
      {
        id: "resource-care-packages",
        title: "Care Packages",
        url: "https://blacksmithforkassistedliving.com/assisted-living-care/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://blacksmithforkassistedliving.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://blacksmithforkassistedliving.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "f0960932-e96d-449c-85e8-2d5eac782de8": {
    website: "https://carringtoncourtal.com/",
    phone: "801-676-8787",
    fax: "801-285-8324",
    serviceDescription:
      "Carrington Court Assisted Living in South Jordan, Utah provides personalized assisted living care, safety-focused support, care assessments by nursing leadership, activities, dining, and a warm senior living community.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/CarringtonCourt/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://carringtoncourtal.com/",
      },
    ],
    amenities: [
      "Personalized Plan of Care",
      "Director of Nursing Assessments",
      "24-Hour Staff",
      "Medication Assistance",
      "Dining Services",
      "Activities and Events",
      "Safety-Focused Support",
      "Housekeeping Support",
      "Transportation Assistance",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://carringtoncourtal.com/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://carringtoncourtal.com/memory-care",
        icon: "home",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://carringtoncourtal.com/independent-living",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Day Care & Respite",
        url: "https://carringtoncourtal.com/day-care-and-respite",
        icon: "heart",
      },
      {
        id: "resource-photos",
        title: "Photos",
        url: "https://carringtoncourtal.com/photos",
        icon: "image",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://carringtoncourtal.com/virtual-tour",
        icon: "video",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://carringtoncourtal.com/contact",
        icon: "calendar",
      },
    ],
  },
  "20390a2c-3f08-40fb-869a-88844cb6a36d": {
    website: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/",
    phone: "385-485-8518",
    fax: "801-571-7640",
    serviceDescription:
      "Cedarwood at Sandy offers assisted living in a beautiful Sandy, Utah community beneath the Wasatch Mountains, with active residents, friendly associates, dining, activities, care support, and apartment-style senior living.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/CedarwoodatSandy/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/",
      },
    ],
    amenities: [
      "Assisted Living Support",
      "Apartment-Style Living",
      "Restaurant-Style Dining",
      "Activities and Events",
      "Fitness and Wellness",
      "Housekeeping Support",
      "Transportation Support",
      "Beautiful Mountain Views",
      "Friendly Associates",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/living-options/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/gallery/",
        icon: "image",
      },
      {
        id: "resource-dining",
        title: "Dining",
        url: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/dining/",
        icon: "restaurant",
      },
      {
        id: "resource-activities",
        title: "Activities",
        url: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/activities/",
        icon: "calendar",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://kiscoseniorliving.com/senior-living/ut/sandy/cedarwood-at-sandy/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "d921681a-62e0-43be-85fe-eb2f70922445": {
    website: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/",
    phone: "801-779-0798",
    fax: "801-779-2798",
    serviceDescription:
      "Chancellor Gardens in Clearfield, Utah offers relationship-based assisted living and memory care with personalized support, chef-prepared meals, engaging activities, transportation, and a connected senior living community.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Relationship-Based Support",
      "Chef-Prepared Meals",
      "Engaging Activities",
      "Transportation Services",
      "Wellness Programming",
      "Beautiful Common Spaces",
      "Personalized Care Support",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/living-options/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/living-options/memory-care",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/floor-plans",
        icon: "document",
      },
      {
        id: "resource-amenities",
        title: "Features & Amenities",
        url: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/features-amenities",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Photos & Videos",
        url: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/gallery",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.mbkseniorliving.com/senior-living/ut/clearfield/chancellor-gardens-at-clearfield/contact-us",
        icon: "calendar",
      },
    ],
  },
  "ac0b5345-085f-49fb-9226-5d6669ca4dfe": {
    website: "https://stellarliving.com/communities/copper-creek-senior-assisted-living-south-jordan-ut/",
    phone: "385-274-2000",
    fax: "385-283-6712",
    serviceDescription:
      "Copper Creek Senior Living in South Jordan, Utah offers independent living, assisted living, memory care, and short-term care in a bright, resort-style community with dining, activities, transportation, and personalized support.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/CopperCreekSouthJordan",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/coppercreeksouthjordan/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://stellarliving.com/communities/copper-creek-senior-assisted-living-south-jordan-ut/",
      },
    ],
    amenities: [
      "Independent Living",
      "Assisted Living",
      "Memory Care",
      "Short-Term Care",
      "All-Day Dining",
      "Chef-Prepared Meals",
      "Daily Fitness Classes",
      "Weekly Outings",
      "Beauty Salon & Barber Shop",
      "Housekeeping & Linen Service",
      "Transportation Services",
      "24-Hour Personal Care Support",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Copper Creek Website",
        url: "https://stellarliving.com/communities/copper-creek-senior-assisted-living-south-jordan-ut/",
        icon: "website",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://stellarliving.com/independent-living/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://stellarliving.com/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://stellarliving.com/stellar-apollo-program/",
        icon: "heart",
      },
      {
        id: "resource-life-enrichment",
        title: "Life Enrichment",
        url: "https://stellarliving.com/life-enrichment/",
        icon: "calendar",
      },
      {
        id: "resource-local-things-to-do",
        title: "Things To Do Nearby",
        url: "https://stellarliving.com/10-things-to-do-near-copper-creek/",
        icon: "list",
      },
      {
        id: "resource-spotlight",
        title: "Community Spotlight",
        url: "https://stellarliving.com/spotlight-on-copper-creek-assisted-living-memory-care/",
        icon: "document",
      },
    ],
  },
  "c6c0b37f-0aea-4542-8705-dddd5ae3dcb3": {
    website: "https://cottagesatgreenvalley.com/",
    phone: "702-472-8833",
    fax: "702-992-0001",
    serviceDescription:
      "Cottages at Green Valley in Henderson, Nevada offers assisted living, memory care, and respite care in a warm, home-like senior living community near trusted medical centers and everyday conveniences.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/CottagesatGreenValley/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/cottagesatgreenvalley/",
      },
      {
        id: "social-linkedin",
        platform: "linkedin",
        url: "https://www.linkedin.com/company/cottages-at-green-valley/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://cottagesatgreenvalley.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Respite Care",
      "Restaurant-Style Dining",
      "Activities and Events",
      "Social Spaces",
      "Secured, Easy-to-Navigate Campus",
      "Personalized Support",
      "Housekeeping Services",
      "Transportation Support",
      "Friendly Professional Care Team",
    ],
    resources: [
      {
        id: "resource-about",
        title: "About the Community",
        url: "https://cottagesatgreenvalley.com/about-us/",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://cottagesatgreenvalley.com/gallery/",
        icon: "image",
      },
      {
        id: "resource-living-options",
        title: "Living Options",
        url: "https://cottagesatgreenvalley.com/living-options/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://cottagesatgreenvalley.com/living-options/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://cottagesatgreenvalley.com/living-options/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://cottagesatgreenvalley.com/living-options/respite-care/",
        icon: "heart-outline",
      },
      {
        id: "resource-amenities",
        title: "Services & Amenities",
        url: "https://cottagesatgreenvalley.com/services-and-amenities/",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://cottagesatgreenvalley.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "5d639e5c-17bb-4759-b3cf-beb7e979d728": {
    website: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/",
    phone: "801-923-3661",
    fax: "801-281-1512",
    serviceDescription:
      "Cottonwood Creek in Salt Lake City, Utah offers assisted living and short-term respite stays with personalized support, restaurant-style dining, wellness programming, transportation, landscaped walking paths, and comfortable apartment homes.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Short-Term Stays",
      "Restaurant-Style Dining",
      "Weekly Housekeeping and Linen Service",
      "Transportation and Concierge Support",
      "Fitness & Rehab Center",
      "In-House Therapy Program",
      "Theater Room",
      "Beauty Salon & Barber Shop",
      "Community Gardens",
      "Walking Paths",
      "Pet-Friendly Apartment Homes",
      "Emergency Alert & Response System",
    ],
    resources: [
      {
        id: "resource-floor-plans",
        title: "Floor Plans & Pricing",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/floor-plans-pricing",
        icon: "document",
      },
      {
        id: "resource-photos-videos",
        title: "Photos & Videos",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/photos-and-videos",
        icon: "image",
      },
      {
        id: "resource-lifestyle-options",
        title: "Lifestyle Options",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/lifestyle-options",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/assisted-living",
        icon: "home",
      },
      {
        id: "resource-amenities",
        title: "Features & Amenities",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/features-amenities",
        icon: "list",
      },
      {
        id: "resource-activities",
        title: "Activities & Events",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/activities-events",
        icon: "calendar",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/cottonwood-creek/contact-us",
        icon: "calendar",
      },
    ],
  },
  "6627e0ce-547c-4fa5-b9cd-a6ca5412e963": {
    website: "https://www.countryhomeassistedliving.co/",
    phone: "385-206-3679",
    fax: "801-294-6088",
    serviceDescription:
      "Country Home Assisted Living in Bountiful, Utah provides assisted living and memory care in a home-like setting with personalized support, medication management, meals, companionship, and attentive caregivers.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.countryhomeassistedliving.co/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Medication Management",
      "Personal Care Assistance",
      "Companionship",
      "Meals and Nutrition Support",
      "Housekeeping Support",
      "Family Communication",
      "Safety-Focused Care",
      "Dedicated Caregivers",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Country Home Website",
        url: "https://www.countryhomeassistedliving.co/",
        icon: "website",
      },
      {
        id: "resource-faq",
        title: "Frequently Asked Questions",
        url: "https://www.countryhomeassistedliving.co/faq",
        icon: "document",
      },
      {
        id: "resource-map",
        title: "Map & Directions",
        url: "https://maps.app.goo.gl/BkVm4xNdWkd65YvR6",
        icon: "map",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.countryhomeassistedliving.co/contact",
        icon: "calendar",
      },
    ],
  },
  "b2faebaa-9905-450a-a43f-5b08da0c47bd": {
    website: "https://stellarliving.com/communities/courtyard-at-jamestown-assisted-senior-living-provo-ut/",
    phone: "385-469-8987",
    fax: "801-375-0808",
    serviceDescription:
      "Courtyard at Jamestown in Provo, Utah offers assisted living in a luxury senior living setting with private apartment homes, high-quality care, engaging activities, dining, and lifestyle amenities.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/courtyard.atjamestown",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/courtyardatjamestown/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://stellarliving.com/communities/courtyard-at-jamestown-assisted-senior-living-provo-ut/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Private Apartment Homes",
      "High-Quality Care Services",
      "Restaurant-Style Dining",
      "Activities and Events",
      "Life Enrichment Programming",
      "Beautiful Community Spaces",
      "Fitness and Wellness Support",
      "Transportation Support",
      "Housekeeping Support",
      "Personalized Assistance",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Courtyard at Jamestown Website",
        url: "https://stellarliving.com/communities/courtyard-at-jamestown-assisted-senior-living-provo-ut/",
        icon: "website",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://stellarliving.com/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://stellarliving.com/stellar-apollo-program/",
        icon: "heart",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://stellarliving.com/independent-living/",
        icon: "home",
      },
      {
        id: "resource-life-enrichment",
        title: "Life Enrichment",
        url: "https://stellarliving.com/life-enrichment/",
        icon: "calendar",
      },
      {
        id: "resource-spotlight",
        title: "Community Spotlight",
        url: "https://stellarliving.com/spotlight-on-courtyard-at-jamestown/",
        icon: "document",
      },
    ],
  },
  "c16fb395-cd77-4730-9e07-74699f4c241e": {
    website: "https://www.covepointretirement.com/",
    phone: "801-377-9670",
    fax: "801-375-0492",
    serviceDescription:
      "Cove Point Retirement in Provo, Utah offers assisted living and independent living in a park-like community with meals, housekeeping, laundry, utilities, dining, recreational services, and comfortable senior apartments.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.covepointretirement.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Daily Meals",
      "Dining Services",
      "Laundry Service",
      "Housekeeping Services",
      "Utilities Included",
      "Cable TV",
      "Recreational Services",
      "Park-Like Grounds",
      "Mature Trees and Water Features",
      "Apartment-Style Living",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Cove Point Website",
        url: "https://www.covepointretirement.com/",
        icon: "website",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.covepointretirement.com/assisted-living",
        icon: "home",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://www.covepointretirement.com/assisted-living-1",
        icon: "home",
      },
      {
        id: "resource-floorplans",
        title: "Floorplans",
        url: "https://www.covepointretirement.com/floorplans",
        icon: "document",
      },
      {
        id: "resource-dining",
        title: "Dining",
        url: "https://www.covepointretirement.com/dining",
        icon: "restaurant",
      },
      {
        id: "resource-recreation",
        title: "Recreational Services",
        url: "https://www.covepointretirement.com/recreational-services",
        icon: "calendar",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://www.covepointretirement.com/gallery",
        icon: "image",
      },
      {
        id: "resource-tour",
        title: "Book a Tour",
        url: "https://www.covepointretirement.com/booking-calendar/book-a-tour",
        icon: "calendar",
      },
    ],
  },
  "d7d616dc-0847-4884-8a1f-ccea95662137": {
    website: "https://stellarliving.com/communities/creekside-assisted-senior-living-bountiful-ut/",
    phone: "801-406-9431",
    fax: "385-777-2908",
    serviceDescription:
      "Creekside Senior Living in Bountiful, Utah offers assisted living with personalized support, vibrant activities, dining, wellness amenities, transportation, and comfortable senior living spaces.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/creeksideseniorliving",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/creeksideassistedliving/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://stellarliving.com/communities/creekside-assisted-senior-living-bountiful-ut/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Personalized Care",
      "All-Day Dining",
      "Chef-Prepared Meals",
      "Daily Fitness Classes",
      "Weekly Outings",
      "Beauty Salon & Barber Shop",
      "Library",
      "Theater Room",
      "Wellness Center",
      "Life Enrichment Programming",
      "Transportation Support",
      "Housekeeping Support",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Creekside Website",
        url: "https://stellarliving.com/communities/creekside-assisted-senior-living-bountiful-ut/",
        icon: "website",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://stellarliving.com/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://stellarliving.com/stellar-apollo-program/",
        icon: "heart",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://stellarliving.com/independent-living/",
        icon: "home",
      },
      {
        id: "resource-life-enrichment",
        title: "Life Enrichment",
        url: "https://stellarliving.com/life-enrichment/",
        icon: "calendar",
      },
    ],
  },
  "e9b4e1e4-0104-4e70-a9c1-89d55d0821b7": {
    website: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/",
    phone: "801-462-2741",
    fax: "801-790-2401",
    serviceDescription:
      "Crescent Senior Living in Sandy, Utah offers assisted living and memory care with well-designed apartment homes, dining, activities, wellness programming, personalized support, and maintenance-free senior living.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/crescentsl/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/crescentseniorliving",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Short-Term Stays",
      "Restaurant-Style Dining",
      "Activities and Events",
      "Wellness Programming",
      "Game Room",
      "Movie Theater",
      "Picturesque Grounds",
      "Maintenance-Free Living",
      "Housekeeping Services",
      "Pet-Friendly Community",
      "Personalized Care Support",
    ],
    resources: [
      {
        id: "resource-services",
        title: "Services",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/services",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/memory-care",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/floor-plans",
        icon: "document",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/amenities",
        icon: "list",
      },
      {
        id: "resource-dining",
        title: "Dining Experience",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/dining-experience",
        icon: "restaurant",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/gallery",
        icon: "image",
      },
      {
        id: "resource-resources",
        title: "Resources",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/resources",
        icon: "document",
      },
      {
        id: "resource-dementia",
        title: "Dementia Resources",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/dementia-resources",
        icon: "heart-outline",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.meridiansenior.com/senior-living/ut/sandy/crescent-senior-living/contact-us",
        icon: "calendar",
      },
    ],
  },
  "0e9a4db7-b11b-4386-bb37-a119f98c5064": {
    website: "https://desertspringsliving.com/",
    phone: "702-909-1887",
    fax: "702-873-5316",
    serviceDescription:
      "Desert Springs Senior Living in Las Vegas, Nevada offers assisted living, independent living, and respite care with compassionate support, dining, activities, comfortable apartments, and a friendly senior living community.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/desertspringsseniorliving/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/desertsprings.sl/",
      },
      {
        id: "social-linkedin",
        platform: "linkedin",
        url: "https://www.linkedin.com/company/desert-springs-senior-living/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://desertspringsliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Respite Care",
      "Restaurant-Style Dining",
      "Activities and Events",
      "Low-Income Support",
      "Comfortable Apartments",
      "Community Spaces",
      "Personalized Care Support",
      "Housekeeping Support",
      "Transportation Support",
      "Friendly Care Team",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Our Community",
        url: "https://desertspringsliving.com/our-community/",
        icon: "home",
      },
      {
        id: "resource-living-options",
        title: "Living Options",
        url: "https://desertspringsliving.com/living-options/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://desertspringsliving.com/living-options/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://desertspringsliving.com/living-options/independent-living/",
        icon: "home",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://desertspringsliving.com/living-options/respite-care/",
        icon: "heart-outline",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://desertspringsliving.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://desertspringsliving.com/gallery/",
        icon: "image",
      },
      {
        id: "resource-low-income-support",
        title: "Low-Income Support",
        url: "https://desertspringsliving.com/low-income-support/",
        icon: "heart",
      },
      {
        id: "resource-faq",
        title: "Frequently Asked Questions",
        url: "https://desertspringsliving.com/faq/",
        icon: "document",
      },
      {
        id: "resource-schedule",
        title: "Schedule a Visit",
        url: "https://desertspringsliving.com/schedule-a-visit/",
        icon: "calendar",
      },
    ],
  },
  "d7826e59-2976-44f1-bf81-97762f4fae39": {
    website: "https://desertviewseniorliving.com/",
    phone: "702-553-1924",
    fax: "702-410-5842",
    serviceDescription:
      "Desert View Senior Living in Las Vegas, Nevada offers assisted living, memory care, independent living, and respite care with personalized service, comfortable apartments, activities, and a welcoming senior living community.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/DesertViewSeniorLiving/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/desertview.sl/",
      },
      {
        id: "social-linkedin",
        platform: "linkedin",
        url: "https://www.linkedin.com/company/desert-view-sl",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://desertviewseniorliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Independent Living",
      "Respite Care",
      "Comfortable Apartments",
      "Activities and Events",
      "Dining Services",
      "Personalized Care Support",
      "Community Spaces",
      "Housekeeping Support",
      "Transportation Support",
      "Friendly Care Team",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Our Community",
        url: "https://desertviewseniorliving.com/our-community/",
        icon: "home",
      },
      {
        id: "resource-living-options",
        title: "Living Options",
        url: "https://desertviewseniorliving.com/living-options/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://desertviewseniorliving.com/living-options/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://desertviewseniorliving.com/living-options/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-respite-care",
        title: "Respite Care",
        url: "https://desertviewseniorliving.com/living-options/respite-care/",
        icon: "heart-outline",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://desertviewseniorliving.com/gallery/",
        icon: "image",
      },
      {
        id: "resource-faq",
        title: "Frequently Asked Questions",
        url: "https://desertviewseniorliving.com/faq/",
        icon: "document",
      },
      {
        id: "resource-local-activities",
        title: "Local Activities",
        url: "https://desertviewseniorliving.com/desert-view-local-activities-and-fun/",
        icon: "calendar",
      },
      {
        id: "resource-pennant",
        title: "Operator Profile",
        url: "https://pennantgroup.com/location/desert-view-senior-living/",
        icon: "document",
      },
      {
        id: "resource-schedule",
        title: "Schedule a Visit",
        url: "https://desertviewseniorliving.com/schedule-a-visit/",
        icon: "calendar",
      },
    ],
  },
  "67e71c1e-9ff9-4a38-8438-9ce945380405": {
    website: "https://www.generationsllc.com/communities/fairfield-village/",
    phone: "801-876-1611",
    fax: "801-927-6240",
    contactEmail: "info@fairfieldvillagelayton.com",
    serviceDescription:
      "Fairfield Village in Layton, Utah offers independent living, assisted living, memory care, and post-acute care with stylish residences, 24-hour caregiving assistance, activities, dining, and supportive senior living services.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/fairfieldvillagelayton",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/generations_nation/",
      },
      {
        id: "social-linkedin",
        platform: "linkedin",
        url: "https://www.linkedin.com/company/generations-llc_2/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.generationsllc.com/communities/fairfield-village/",
      },
    ],
    amenities: [
      "Independent Living",
      "Assisted Living",
      "Memory Care",
      "Post-Acute Care",
      "24-Hour Caregiving Assistance",
      "Stylish Residences",
      "Dining Services",
      "Activity Calendars",
      "Dementia Support Group",
      "Community Events",
      "Transportation Support",
      "Supportive Senior Living Services",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Fairfield Village Website",
        url: "https://www.generationsllc.com/communities/fairfield-village/",
        icon: "website",
      },
      {
        id: "resource-brochure",
        title: "Community Brochure",
        url: "https://www.generationsllc.com/wp-content/uploads/2022/06/FairfieldVillage-TrifoldMini-Digital-2026-R1.pdf",
        icon: "document",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://www.generationsllc.com/communities/fairfield-village/independent-living/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.generationsllc.com/communities/fairfield-village/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.generationsllc.com/communities/fairfield-village/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-post-acute",
        title: "Post-Acute Care",
        url: "https://www.generationsllc.com/communities/fairfield-village/post-acute-care/",
        icon: "heart-outline",
      },
      {
        id: "resource-map",
        title: "Map & Directions",
        url: "http://maps.google.com/maps?q=1205%20N%20Fairfield%20Road%20Layton%2C%20UT%2084041",
        icon: "map",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.generationsllc.com/contact?community=Fairfield-Village",
        icon: "calendar",
      },
    ],
  },
  "f8eb992b-01ba-455c-8c8e-50a53c2ebc19": {
    website: "https://www.familytreeliving.com/west-point-family-tree-community",
    phone: "801-775-8733",
    fax: "801-775-0620",
    serviceDescription:
      "Family Tree Assisted Living in West Point, Utah offers assisted living in a friendly residential setting with studio apartments, care support, nearby medical services, activities, meals, and a home-like senior living community.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.familytreeliving.com/west-point-family-tree-community",
      },
    ],
    amenities: [
      "Assisted Living",
      "Studio Apartments",
      "Walk-In Closets",
      "Private Bathrooms",
      "Walk-In Showers",
      "Independent Patio Units",
      "Nearby Medical Clinic and Pharmacy",
      "Meals and Dining",
      "Activities and Events",
      "Care Support",
      "Residential Neighborhood Setting",
      "Home-Like Community",
    ],
    resources: [
      {
        id: "resource-west-point",
        title: "West Point Community",
        url: "https://www.familytreeliving.com/west-point-family-tree-community",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://www.familytreeliving.com/services",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.familytreeliving.com/amenities",
        icon: "list",
      },
      {
        id: "resource-about",
        title: "About Family Tree",
        url: "https://www.familytreeliving.com/about",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://www.familytreeliving.com/gallery",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact Family Tree",
        url: "https://www.familytreeliving.com/contact-us",
        icon: "calendar",
      },
    ],
  },
  "7e5c53f9-3bb3-4294-8c0c-c66a02fb0c60": {
    website: "https://www.familytreeliving.com/morgan-family-tree-community",
    phone: "801-829-5120",
    fax: "801-829-3294",
    serviceDescription:
      "Family Tree of Morgan Assisted Living in Morgan, Utah offers assisted living in a warm, social setting with luxury and comfort, supportive care, activities, meals, and a focus on helping residents stay as independent as possible.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.familytreeliving.com/morgan-family-tree-community",
      },
    ],
    amenities: [
      "Assisted Living",
      "Private Studio Units",
      "Walk-In Closets",
      "Private Bathrooms",
      "Meals and Dining",
      "Housekeeping Services",
      "Laundry Services",
      "Weekly Shopping Trips",
      "Daily Games",
      "Weekly Exercise Groups",
      "Monthly Socials",
      "Sunday Church Services",
      "Resident Council",
    ],
    resources: [
      {
        id: "resource-morgan",
        title: "Morgan Community",
        url: "https://www.familytreeliving.com/morgan-family-tree-community",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://www.familytreeliving.com/services",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.familytreeliving.com/amenities",
        icon: "list",
      },
      {
        id: "resource-about",
        title: "About Family Tree",
        url: "https://www.familytreeliving.com/about",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://www.familytreeliving.com/gallery",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact Family Tree",
        url: "https://www.familytreeliving.com/contact-us",
        icon: "calendar",
      },
    ],
  },
  "c797ae58-d7a6-4234-a9f1-81b5ed32d0ec": {
    website: "https://gardensal.com/",
    phone: "801-394-1400",
    serviceDescription:
      "Gardens Assisted Living in Ogden, Utah provides assisted living, memory care, and respite care with personalized support, engaging activities, and a compassionate senior living environment.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/gardensal/?rf=188222107925501",
      },
      {
        id: "social-youtube",
        platform: "youtube",
        url: "https://www.youtube.com/@GardensAssistedLiving?sub_confirmation=1",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://gardensal.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Respite Care",
      "Personalized Care Plans",
      "24/7 Care and Support",
      "Dining Services",
      "Housekeeping Services",
      "Laundry Services",
      "Transportation Services",
      "Events and Activities",
    ],
    resources: [
      {
        id: "resource-levels-of-care",
        title: "Levels of Care",
        url: "https://gardensal.com/services-amenities/levels-of-care/",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Services & Amenities",
        url: "https://gardensal.com/services-amenities/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://gardensal.com/photo-gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://gardensal.com/events-activities/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-events",
        title: "Events & Activities",
        url: "https://gardensal.com/events-activities/",
        icon: "calendar",
      },
      {
        id: "resource-visit",
        title: "Visit Gardens Assisted Living",
        url: "https://gardensal.com/visit-us/",
        icon: "calendar",
      },
      {
        id: "resource-contact",
        title: "Contact Gardens",
        url: "https://gardensal.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "4513b23e-9c75-4356-8a56-b5c15e1909b7": {
    website: "https://grovecreekassistedliving.com/",
    phone: "385-273-7100",
    serviceDescription:
      "Grove Creek Assisted Living in Lindon, Utah provides assisted living in a warm community setting with personalized care, social connection, dining, activities, and supportive daily services.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://grovecreekassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Activities and Outings",
      "Transportation Services",
      "Chef Prepared Dining",
      "Private Family Dining Room",
      "Housekeeping Services",
      "Laundry Services",
      "Cable, Wi-Fi, and Utilities",
      "On-Site Beauty/Barber Shop",
      "Emergency Assistance Systems",
      "24/7 Nursing Staff",
      "Medication Management",
      "Personal Care Assistance",
    ],
    resources: [
      {
        id: "resource-home",
        title: "Grove Creek Website",
        url: "https://grovecreekassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services & Amenities",
        url: "https://grovecreekassistedliving.com/services/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://grovecreekassistedliving.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Grove Creek",
        url: "https://grovecreekassistedliving.com/about/",
        icon: "document",
      },
      {
        id: "resource-rmc-assisted-living",
        title: "Rocky Mountain Care Assisted Living",
        url: "https://rockymountaincare.com/services/assisted-living-facilities/",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact Grove Creek",
        url: "https://grovecreekassistedliving.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "628995cb-af55-4edd-87e1-cd0dce4fb510": {
    website: "https://havenassistedliving.com/assisted-living-haven-at-sky-mountain/",
    phone: "435-674-7883",
    serviceDescription:
      "The Haven at Sky Mountain Assisted Living in Hurricane, Utah provides assisted living with personalized care plans, high-end amenities, dining, activities, transportation, and supportive services in a scenic senior living community.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://havenassistedliving.com/assisted-living-haven-at-sky-mountain/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Personalized Care Plans",
      "Medication Management",
      "Shower and Dressing Assistance",
      "Continence Care",
      "Diabetic Monitoring",
      "Private Suites",
      "Certified Staff On-Site 24/7",
      "Three Daily Nutritious Meals",
      "Outdoor Courtyard",
      "Daily Housekeeping and Linen Services",
      "Activities and Entertainment",
      "Weekly Field Trips",
      "Religious Services On Site",
      "Scheduled Transportation",
      "Beauty Salon",
      "Movie Theater",
      "Fitness Center",
    ],
    resources: [
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://havenassistedliving.com/assisted-living-haven-at-sky-mountain/",
        icon: "home",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://havenassistedliving.com/photo-gallery/",
        icon: "image",
      },
      {
        id: "resource-faq",
        title: "Frequently Asked Questions",
        url: "https://havenassistedliving.com/f-a-q/",
        icon: "document",
      },
      {
        id: "resource-team",
        title: "Meet Our Team",
        url: "https://havenassistedliving.com/meet-our-team/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://havenassistedliving.com/schedule-a-tour/",
        icon: "calendar",
      },
      {
        id: "resource-contact",
        title: "Contact The Haven",
        url: "https://havenassistedliving.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "a1d095c2-ba39-4a4b-aa78-b4117e669104": {
    shortDescription: "Assisted Living",
    website: "https://www.hearthstonemanor.com/",
    phone: "801-798-1500",
    contactEmail: "hsm.utah@gmail.com",
    serviceDescription:
      "Hearthstone Manor in Spanish Fork, Utah is a locally owned assisted living community with all-inclusive services, private apartments, mountain views, daily activities, and around-the-clock care.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.hearthstonemanor.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Trained Caregivers Around the Clock",
      "Coordinated Medical, Home Health and Hospice Care",
      "Monthly Wellness Check-Ins",
      "Spacious Walk-In Showers",
      "Private Kitchenette in Every Apartment",
      "Three Home-Cooked Meals Daily",
      "Cable TV in Every Room",
      "Daily Housekeeping and Trash Removal",
      "Weekly Fresh Linens and Laundry",
      "On-Site Beauty Salon",
      "Daily Activities and Entertainment",
      "Scenic Mountain Views",
    ],
    resources: [
      {
        id: "resource-home",
        title: "Hearthstone Manor Website",
        url: "https://www.hearthstonemanor.com/",
        icon: "home",
      },
      {
        id: "resource-why-hearthstone",
        title: "Why Hearthstone",
        url: "https://www.hearthstonemanor.com/why-hearthstone",
        icon: "document",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.hearthstonemanor.com/assisted-living",
        icon: "home",
      },
      {
        id: "resource-about",
        title: "About Hearthstone",
        url: "https://www.hearthstonemanor.com/about",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://www.hearthstonemanor.com/gallery",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact Hearthstone",
        url: "https://www.hearthstonemanor.com/contact",
        icon: "calendar",
      },
    ],
  },
  "162e94c0-c0c4-45c7-8c77-74a0049b1174": {
    website: "https://heritagegardensspringville.com/",
    phone: "801-489-3344",
    fax: "801-515-6082",
    contactName: "Rebecca Vom Dorp",
    contactEmail: "hgspringville@gmail.com",
    serviceDescription:
      "Heritage Gardens of Springville is an assisted living community in Springville, Utah offering individualized care, home-cooked meals, spacious rooms, memory care support, and a clean home-centered environment.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://heritagegardensspringville.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Individualized Care Plans",
      "Memory Care Support",
      "Respite Care Available",
      "Home-Health Care Services",
      "ADL Support",
      "Shower, Bathing and Grooming Assistance",
      "Three Meals Prepared Daily",
      "Daily Snacks",
      "Housekeeping Services",
      "Laundry Services",
      "24/7 Care by Nurse and CNAs",
      "Medication Administration",
      "Transportation to Appointments and Outings",
      "Continence Management",
      "Single-Level Living",
      "Spacious Rooms",
      "Kitchenettes in Most Rooms",
    ],
    resources: [
      {
        id: "resource-home",
        title: "Heritage Gardens Website",
        url: "https://heritagegardensspringville.com/",
        icon: "home",
      },
      {
        id: "resource-pricing",
        title: "Pricing",
        url: "https://heritagegardensspringville.com/pricing",
        icon: "document",
      },
      {
        id: "resource-features",
        title: "Features & Virtual Tour",
        url: "https://heritagegardensspringville.com/features",
        icon: "video",
      },
      {
        id: "resource-contact",
        title: "Contact Heritage Gardens",
        url: "https://heritagegardensspringville.com/contact-us",
        icon: "calendar",
      },
      {
        id: "resource-careers",
        title: "Careers",
        url: "https://heritagegardensspringville.com/careers",
        icon: "document",
      },
    ],
  },
  "2c4cbed7-4bbd-4a2a-95dc-dba6ba7feffc": {
    website: "https://www.cascadeliving.com/community/heritage-springs/",
    phone: "702-360-6023",
    serviceDescription:
      "Heritage Springs in Las Vegas, Nevada provides assisted living and memory care with personalized support, engaging activities, chef-prepared dining, fitness amenities, and comfortable senior living near Summerlin.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.cascadeliving.com/community/heritage-springs/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Robust Social Calendar",
      "Fitness Center",
      "Bistro and Game Lounge",
      "TV Room for Movies and Wii",
      "Tasteful Dining Room",
      "Daily Chef Specials",
      "EverDine A La Carte Menus",
      "Private Dining Rooms",
      "Al Fresco Dining",
      "Beauty Salon and Barbershop",
      "Lush Courtyards",
      "Common Spaces for Socializing",
      "Scheduled Outings",
      "Weekly Live Entertainment",
      "Walking Paths",
      "EverFit Wellness Programs",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Heritage Springs Website",
        url: "https://www.cascadeliving.com/community/heritage-springs/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.cascadeliving.com/community/heritage-springs/#assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.cascadeliving.com/community/heritage-springs/#memory-care",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.cascadeliving.com/community/heritage-springs/#amenities",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.cascadeliving.com/community/heritage-springs/#floor-plans",
        icon: "document",
      },
      {
        id: "resource-pricing",
        title: "Contact Us for Pricing",
        url: "https://www.cascadeliving.com/community/heritage-springs/#pricing",
        icon: "document",
      },
      {
        id: "resource-team",
        title: "Meet Our Team",
        url: "https://www.cascadeliving.com/community/heritage-springs/#team",
        icon: "document",
      },
    ],
  },
  "a3b7a92a-b0aa-4764-96c8-7616ccb3da18": {
    website: "https://www.hiddenvalleyal.com/",
    phone: "801-689-0500",
    contactEmail: "admin@hiddenvalleyal.com",
    serviceDescription:
      "Hidden Valley Assisted Living in South Ogden, Utah offers assisted living and memory care with personalized support, daily activities, restaurant-style dining, private accommodations, and a safe home-like setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.hiddenvalleyal.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized Care Plans",
      "Daily Activities",
      "Restaurant-Style Dining",
      "Homestyle Made From Scratch Meals",
      "Private Accommodations",
      "Gathering Areas",
      "Cleaning Services",
      "Trash Removal",
      "Linen Changes",
      "Medication Management",
      "Personal Care Assistance",
      "Transportation Services",
      "Clean, Safe and Secure Environment",
      "Home-Like Setting",
    ],
    resources: [
      {
        id: "resource-home",
        title: "Hidden Valley Website",
        url: "https://www.hiddenvalleyal.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.hiddenvalleyal.com/assisted-living",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Assisted Living Services",
        url: "https://www.hiddenvalleyal.com/assisted-living-services-in-utah",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.hiddenvalleyal.com/#contact",
        icon: "calendar",
      },
    ],
  },
  "e137f366-5998-4727-9b71-a02d9d1f9c83": {
    shortDescription: "Assisted Living",
    website: "https://centurypa.com/senior-living/highland-cove/",
    phone: "801-272-8226",
    serviceDescription:
      "Highland Cove in Salt Lake City, Utah offers assisted living and independent living with resort-style amenities, personalized support, social and wellness activities, dining, transportation, and professional associates available around the clock.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/HighlandCoveRetirement/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://centurypa.com/senior-living/highland-cove/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Personalized Services",
      "Activities of Daily Living Support",
      "Bathing and Dressing Assistance",
      "Medication Management",
      "Housekeeping Services",
      "Laundry Services",
      "Three Home-Cooked Meals Daily",
      "Three Restaurant-Style Meals Daily",
      "24-Hour Emergency Response System",
      "Scheduled Transportation",
      "Library",
      "Wellness Programs",
      "Wellness Center",
      "Billiards",
      "Beauty Salon and Barbershop",
      "Massage Therapy",
      "Beautifully Maintained Grounds",
      "Social and Recreational Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Highland Cove Website",
        url: "https://centurypa.com/senior-living/highland-cove/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://centurypa.com/senior-living/highland-cove/assisted-living",
        icon: "home",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://centurypa.com/senior-living/highland-cove/independent-living",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services & Amenities",
        url: "https://centurypa.com/senior-living/highland-cove/services-amenities",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://centurypa.com/senior-living/highland-cove/gallery",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://centurypa.com/senior-living/highland-cove/floor-plans",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://centurypa.com/senior-living/highland-cove/schedule-tour",
        icon: "calendar",
      },
    ],
  },
  "33c1cc28-758d-45fa-aa8d-d1d904eb80fb": {
    shortDescription: "Assisted Living",
    website: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/",
    phone: "801-610-3500",
    serviceDescription:
      "Highland Glen in Highland, Utah provides assisted living and memory care with personalized support, chef-prepared dining, wellness programming, transportation, community amenities, and a warm MBK Senior Living environment.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/mbkhighlandglen",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized Service and Care",
      "Spacious Studio and 1 Bedroom Apartments",
      "Basic Cable Included",
      "All Utilities Included Except Telephone",
      "Emergency Alert System",
      "Laundry Service",
      "Housekeeping Services",
      "Restaurant-Style Dining",
      "Chef-Prepared Meals",
      "Fitness Center and Fitness Classes",
      "Salon and Barber Shop",
      "Community Gardens",
      "Activities Center",
      "Private Outdoor Patio with Mountain Views",
      "Community Fire Pit",
      "Outdoor Walking Paths and Water Feature",
      "Putting Green",
      "Transportation Services 7 Days a Week",
      "Organized Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Highland Glen Website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/memory-care",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans & Pricing",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/floor-plans-pricing",
        icon: "document",
      },
      {
        id: "resource-photos",
        title: "Photos & Videos",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/photos-videos",
        icon: "image",
      },
      {
        id: "resource-amenities",
        title: "Features & Amenities",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/features-amenities",
        icon: "list",
      },
      {
        id: "resource-activities",
        title: "Activities & Events",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/activities-events",
        icon: "calendar",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.mbkseniorliving.com/senior-living/ut/highland/highland-glen/contact-us",
        icon: "calendar",
      },
    ],
  },
  "d41bd9c4-f569-46ed-a219-03eb10ccf509": {
    shortDescription: "Assisted Living",
    website: "https://www.ivybrookal.com",
    phone: "801-966-4286",
    serviceDescription:
      "IvyBrook Assisted Living of Taylorsville provides assisted living in the Salt Lake City area with personalized support, dining, activities, and a care-team-focused environment.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/IvybrookAssistedLiving/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ivybrookal.com",
      },
    ],
    amenities: [
      "Assisted Living",
      "Personalized Care",
      "Dining Services",
      "Daily Activities",
      "Medication Assistance",
      "Resident Safety Support",
      "Therapy Services",
      "Housekeeping Services",
      "Laundry Services",
      "Transportation Services",
      "Family Communication",
      "24/7 Support Staff",
    ],
    resources: [
      {
        id: "resource-community",
        title: "IvyBrook Website",
        url: "https://www.ivybrookal.com",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.ivybrookal.com/get-started",
        icon: "home",
      },
      {
        id: "resource-resources",
        title: "Resources",
        url: "https://www.ivybrookal.com/blank-1",
        icon: "document",
      },
      {
        id: "resource-dining",
        title: "Dining",
        url: "https://www.ivybrookal.com/privacy-policy",
        icon: "dining",
      },
      {
        id: "resource-team",
        title: "Care Team",
        url: "https://www.ivybrookal.com/blank-2",
        icon: "users",
      },
      {
        id: "resource-contact",
        title: "Contact IvyBrook",
        url: "https://www.ivybrookal.com/contact",
        icon: "calendar",
      },
    ],
  },
  "a0b10bdf-a038-4a20-9dfc-a52ed6207a16": {
    shortDescription: "Assisted Living",
    website: "https://lakeridgeliving.net/",
    phone: "801-225-6559",
    serviceDescription:
      "Lake Ridge Senior Living in Orem, Utah provides assisted living, independent living, memory care, respite stays, in-house therapy, restaurant-style dining, daily activities, and a warm community environment.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/people/Lake-Ridge-Senior-Living/100077410124520/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://lakeridgeliving.net/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Memory Care",
      "Respite Stays",
      "Restaurant-Style Dining",
      "Daily Activities",
      "Frequent Outings",
      "Sight-Seeing Trips",
      "In-House Therapy",
      "Month-to-Month Leases",
      "Activities Program",
      "Arts and Crafts Classes",
      "Current Events",
      "Lecture Series",
      "24/7 Support Staff",
      "Housekeeping Services",
      "Transportation Services",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Lake Ridge Website",
        url: "https://lakeridgeliving.net/",
        icon: "home",
      },
      {
        id: "resource-care",
        title: "Care & Living",
        url: "https://lakeridgeliving.net/care-and-living/",
        icon: "heart",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://lakeridgeliving.net/care-and-living/#assisted",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://lakeridgeliving.net/care-and-living/#memory",
        icon: "list",
      },
      {
        id: "resource-service-options",
        title: "Service Options",
        url: "https://lakeridgeliving.net/service-options/",
        icon: "document",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://lakeridgeliving.net/amenities/",
        icon: "list",
      },
      {
        id: "resource-photos",
        title: "Videos & Photos",
        url: "https://lakeridgeliving.net/videos-photos/",
        icon: "image",
      },
      {
        id: "resource-tour",
        title: "Schedule a Personal Tour",
        url: "https://lakeridgeliving.net/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "33f13d69-5905-4037-8977-4dbc2b2d1853": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/",
    phone: "801-335-9530",
    contactName: "Liz Allred",
    contactRole: "Sales & Marketing Director",
    serviceDescription:
      "Legacy House of Bountiful provides assisted living and memory care in Bountiful, Utah, with personalized care, restaurant-style dining, daily activities, apartment floor plans, and a home-like setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Round-the-Clock Caregiver Support",
      "Licensed Practical Nurse Access",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Bountiful Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/events/",
        icon: "calendar",
      },
      {
        id: "resource-leadership",
        title: "Leadership",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/leadership/",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-bountiful/visit/",
        icon: "calendar",
      },
    ],
  },
  "c1afdbe1-c318-492b-a9b4-ee1c78a661f1": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/",
    phone: "725-525-7564",
    serviceDescription:
      "Legacy House of Centennial Hills provides assisted living and memory care in Las Vegas, Nevada, with personalized care, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/legacycentennial/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Round-the-Clock Caregiver Support",
      "Enhanced Continence Care",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Centennial Hills Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/gallery2/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/events/",
        icon: "calendar",
      },
      {
        id: "resource-leadership",
        title: "Leadership",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/leadership-2/",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-centennial-hills/visit/",
        icon: "calendar",
      },
    ],
  },
  "f7a310d1-227b-4aa2-a9ce-d2d5cf9b5ff0": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-logan/",
    phone: "435-265-3295",
    serviceDescription:
      "Legacy House of Logan provides assisted living and memory care in Logan, Utah, with personalized care, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Licensed Practical Nurse Availability",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Round-the-Clock Caregiver Support",
      "Enhanced Continence Care",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Logan Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/events/",
        icon: "calendar",
      },
      {
        id: "resource-leadership",
        title: "Leadership",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/leadership/",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-logan/visit/",
        icon: "calendar",
      },
    ],
  },
  "f97521b0-2c88-400f-8cfe-efc3fd63db7e": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-ogden/",
    phone: "801-436-5079",
    serviceDescription:
      "Legacy House of Ogden provides assisted living and memory care in Ogden, Utah, with personalized care, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Licensed Practical Nurse Availability",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Round-the-Clock Caregiver Support",
      "Enhanced Continence Care",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Ogden Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/events/",
        icon: "calendar",
      },
      {
        id: "resource-leadership",
        title: "Leadership",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/leadership/",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-ogden/visit/",
        icon: "calendar",
      },
    ],
  },
  "7d737619-ec3b-40c1-82c7-79288c902375": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/",
    phone: "385-220-8211",
    serviceDescription:
      "Legacy House of Park Lane provides assisted living and memory care in Farmington, Utah, with personalized care, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting near Station Park.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Registered Nurse Availability",
      "Medication Management",
      "Specialized Medication Oversight",
      "Diabetes Care",
      "Incontinence Care Services",
      "Short-Term Respite Care",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Individually Controlled Heating and Air",
      "24-Hour Emergency Call System",
      "Accessible Apartment Features",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Walking Paths",
      "Flower Gardens",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Park Lane Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/memory/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/events/",
        icon: "calendar",
      },
      {
        id: "resource-about",
        title: "About Legacy House of Park Lane",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/about-us/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-park-lane/visit/",
        icon: "calendar",
      },
    ],
  },
  "f5838780-a336-4c83-b41c-000f8bd11929": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/",
    phone: "725-712-8651",
    serviceDescription:
      "Legacy House of Southern Hills provides assisted living and memory care in Las Vegas, Nevada, with personalized care, engaging activities, restaurant-style dining, apartment floor plans, and a supportive home-like setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Licensed Practical Nurse Availability",
      "Medication Management",
      "Comprehensive Continence Care Services",
      "Short-Term Respite Care",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Individually Controlled Heating and Air",
      "24-Hour Emergency Call System",
      "Accessible Apartment Features",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Walking Paths",
      "Flower Gardens",
      "Round-the-Clock Caregiver Support",
      "Enhanced Continence Care",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Southern Hills Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Legacy House of Southern Hills",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/about-us/",
        icon: "document",
      },
      {
        id: "resource-blog",
        title: "Blog",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/blog/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-southern-hills/visit/",
        icon: "calendar",
      },
    ],
  },
  "f89cc883-c32f-436d-adc2-47ec166c6069": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/",
    phone: "385-217-5698",
    serviceDescription:
      "Legacy House of South Jordan provides assisted living and memory care in South Jordan, Utah, with personalized care, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting near the Jordan River Utah Temple.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Licensed Practical Nurse Availability",
      "Medication Management",
      "Specialized Medication Oversight",
      "Diabetes Care",
      "Comprehensive Continence Care Services",
      "Short-Term Respite Care",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Individually Controlled Heating and Air",
      "24-Hour Emergency Call System",
      "Accessible Apartment Features",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Walking Paths",
      "Flower Gardens",
      "State-of-the-Art Emergency Response",
      "Security Systems",
      "Round-the-Clock Caregiver Support",
      "Enhanced Continence Care",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
      "Sensory Gardens",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of South Jordan Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Legacy House of South Jordan",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/about-us/",
        icon: "document",
      },
      {
        id: "resource-blog",
        title: "Blog",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/blog/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-south-jordan/visit/",
        icon: "calendar",
      },
    ],
  },
  "4459357e-8bb8-434b-bf35-9e14d826d100": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/",
    phone: "385-999-7080",
    serviceDescription:
      "Legacy House of Spanish Fork provides assisted living and memory care in Spanish Fork, Utah, with personalized support, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting near Highway 6.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Full-Time Registered Nurse Availability",
      "Medication Monitoring",
      "Diabetes Care",
      "Incontinence Care",
      "Short-Term Respite Care",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Snow Removal",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Individually Controlled Heating and Air",
      "24-Hour Emergency Call System",
      "Accessible Apartment Features",
      "On-Site Laundry Room",
      "Beauty and Barber Shop",
      "Library",
      "Activity Room",
      "Game Room",
      "Fitness Room",
      "Therapy Room",
      "Private Dining Room",
      "Common Areas",
      "Water Features",
      "Walking Paths",
      "Flower Gardens",
      "Secure Memory Care Neighborhood",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Spanish Fork Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Legacy House of Spanish Fork",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/about-us/",
        icon: "document",
      },
      {
        id: "resource-blog",
        title: "Blog",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/blog/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-spanish-fork/visit/",
        icon: "calendar",
      },
    ],
  },
  "a86de4a9-248b-4caf-a5b1-833a80b7fb1c": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/",
    phone: "385-213-0224",
    serviceDescription:
      "Legacy House of Taylorsville provides assisted living and memory care in Taylorsville, Utah, with personalized support, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting near Jordan Valley Hospital.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Full-Time Registered Nurse Availability",
      "Medication Monitoring",
      "Diabetes Care",
      "Incontinence Care",
      "Short-Term Respite Care",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Snow Removal",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "Private Bathrooms",
      "Individually Controlled Heating and Air",
      "24-Hour Emergency Call System",
      "Safety Features",
      "Grab Bars",
      "Accessible Apartments",
      "On-Site Laundry Room",
      "Beauty and Barber Shop",
      "Library",
      "Activity Room",
      "Game Room",
      "Fitness Room",
      "Therapy Room",
      "Private Dining Room",
      "Common Areas",
      "Water Features",
      "Walking Paths",
      "Flower Gardens",
      "Secure Memory Care Neighborhood",
      "Specialized Memory Care Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy House of Taylorsville Website",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Legacy House of Taylorsville",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/about-us/",
        icon: "document",
      },
      {
        id: "resource-blog",
        title: "Blog",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/blog/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-house-of-taylorsville/visit/",
        icon: "calendar",
      },
    ],
  },
  "2d7211f7-4639-436d-8d0c-2ea2fecf071b": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-village-of-provo/",
    phone: "385-412-7140",
    serviceDescription:
      "Legacy Village of Provo provides assisted living and memory care in Provo, Utah, with views of Mt. Timpanogos, daily activities, restaurant-style dining, apartment floor plans, and a home-like setting near The Shops at Riverwoods.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Licensed Practical Nurse Availability",
      "Medication Management",
      "Specialized Medication Oversight",
      "Diabetes Care",
      "Comprehensive Continence Care Services",
      "Short-Term Respite Care",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Individually Controlled Heating and Air",
      "24-Hour Emergency Call System",
      "Safety Features",
      "Grab Bars",
      "Accessible Apartments",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Walking Paths",
      "Flower Gardens",
      "State-of-the-Art Emergency Response",
      "Security Systems",
      "Round-the-Clock Caregiver Support",
      "Enhanced Continence Care",
      "Regular Monitoring",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
      "Sensory Gardens",
      "Chef-Prepared Meals",
      "Engage Memory Care Program",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy Village of Provo Website",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Legacy Village of Provo",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/about-us/",
        icon: "document",
      },
      {
        id: "resource-blog",
        title: "Blog",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/blog/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-village-of-provo/visit/",
        icon: "calendar",
      },
    ],
  },
  "4cda9cac-7301-45e3-8b0e-600d4a08b7a1": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-village-of-st-george/",
    phone: "435-572-7866",
    serviceDescription:
      "Legacy Village of St. George provides assisted living and memory care in St. George, Utah, with personalized care, daily activities, restaurant-style dining, apartment floor plans, and a modern home-like setting near Snow Canyon.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Independent Living",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Licensed Practical Nurse Availability",
      "Medication Management",
      "Specialized Medication Oversight",
      "Comprehensive Continence Care Services",
      "Short-Term Respite Care",
      "In-House Physical Therapy",
      "In-House Occupational Therapy",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Individually Controlled Heating and Air",
      "Advanced 24-Hour Emergency Call System",
      "Safety Features",
      "Grab Bars",
      "Accessible Apartments",
      "Heated Swimming Pool",
      "Jacuzzi",
      "Pickleball",
      "Fitness Center",
      "Senior Exercise Classes",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Walking Paths",
      "Scenic Waterfall",
      "Flower Gardens",
      "State-of-the-Art Emergency Response",
      "Security Systems",
      "Round-the-Clock Caregiver Support",
      "Enhanced Continence Care",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
      "Sensory Gardens",
      "Pet-Friendly Community",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy Village of St. George Website",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Legacy Village of St. George",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/about-us/",
        icon: "document",
      },
      {
        id: "resource-blog",
        title: "Blog",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/blog/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-village-of-st-george/visit/",
        icon: "calendar",
      },
    ],
  },
  "b2c324d1-8e1b-4a44-9d0d-45afe4d5978a": {
    shortDescription: "Assisted Living",
    website: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/",
    phone: "801-269-0700",
    serviceDescription:
      "Legacy Village of Sugar House provides assisted living and memory care in Salt Lake City, Utah, with urban senior living, daily activities, restaurant-style dining, apartment floor plans, and views of the Wasatch Mountains.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Independent Living",
      "Personalized ADL Assistance",
      "24-Hour On-Site Caregivers",
      "Registered Nurse Availability",
      "Medication Management",
      "Specialized Medication Oversight",
      "Comprehensive Continence Care Services",
      "Restaurant-Style Dining",
      "Three Fresh Meals Daily",
      "Snacks",
      "Weekly Housekeeping",
      "Linen Services",
      "Personal Laundry Service",
      "Professional Maintenance",
      "Landscaping Services",
      "Life Enrichment Programs",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Spiritual Activities",
      "Scheduled Transportation",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Individually Controlled Heating and Air",
      "Advanced 24-Hour Emergency Call System",
      "Safety Features",
      "Grab Bars",
      "Accessible Apartments",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Private Dining Room",
      "Walking Paths",
      "Courtyards",
      "Flower Gardens",
      "Library",
      "Media Rooms",
      "Fitness Center",
      "Exercise Classes",
      "Game Room",
      "Activity Rooms",
      "Educational Seminars",
      "Pet-Friendly Community",
      "Round-the-Clock Caregiver Support",
      "Frequent Staff Monitoring",
      "Secure Memory Care Neighborhoods",
      "Specialized Memory Care Activities",
      "Engage Memory Care Program",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Legacy Village of Sugar House Website",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.legacyretire.com/care/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.legacyretire.com/care/memory-care/",
        icon: "list",
      },
      {
        id: "resource-support",
        title: "Care Support",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/support/",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/amenities/",
        icon: "list",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/gallery/",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Legacy Village of Sugar House",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/about-us/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.legacyretire.com/communities/legacy-village-of-sugar-house/visit/",
        icon: "calendar",
      },
    ],
  },
  "97e150e4-8f23-438e-a062-44a5e7bb272b": {
    shortDescription: "Assisted Living",
    website: "https://cogirusa.com/communities/cogir-of-lotus-park/",
    phone: "801-732-5290",
    serviceDescription:
      "Lotus Park Senior Living provides independent living, assisted living, and memory care in West Haven, Utah, with personalized support, engaging programs, chef-crafted dining, floor plan options, and a welcoming community setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Memory Care",
      "Personalized Care Plans",
      "Supportive Services",
      "Chef-Crafted Dining",
      "Fresh Seasonal Ingredients",
      "Special Diet Accommodations",
      "Cafe-Style Dining",
      "Engaging Activities",
      "Social Programs",
      "Art Classes",
      "Fitness Programs",
      "Outdoor Games",
      "Pet-Friendly Community",
      "Memory Care Programming",
      "Relationship-Based Memory Care",
      "Personalized Attention",
      "Spacious Apartments",
      "Private Apartments",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Floor Plan Options",
      "Fitness Center",
      "Game Room",
      "Indoor Common Areas",
      "Outdoor Common Areas",
      "Indoor Atrium",
      "Enclosed Courtyard",
      "Walking Areas",
      "Piano or Organ",
      "Arts and Crafts Center",
      "Beautician",
      "Housekeeping",
      "Laundry Service",
      "Complimentary Transportation",
      "Grocery Shopping and Errands",
      "Resident Parking",
      "Secured Community",
      "Medication Management",
      "Incontinence Care",
      "Diabetic Care",
      "High Acuity Care",
      "Non-Ambulatory Care",
      "Ancillary Services",
      "Wi-Fi / High-Speed Internet",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Cogir of Lotus Park Website",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/",
        icon: "home",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/gallery/",
        icon: "image",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/memory-care/",
        icon: "list",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/independent-living/",
        icon: "home",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/amenities/",
        icon: "list",
      },
      {
        id: "resource-dining",
        title: "Dining",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/dining/",
        icon: "restaurant",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/events/",
        icon: "calendar",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://cogirusa.com/communities/cogir-of-lotus-park/contact/",
        icon: "calendar",
      },
    ],
  },
  "4290b6f1-ebc8-45d9-8b9f-9b4a7d19fccf": {
    shortDescription: "Assisted Living",
    website: "https://maplespringsliving.com/",
    phone: "435-723-9100",
    fax: "435-723-9150",
    serviceDescription:
      "Maple Springs Assisted Living provides assisted living in Brigham City, Utah, with a warm senior living setting, personalized support, activities, dining, and services designed to help residents feel at home.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://maplespringsliving.com/",
      },
    ],
    amenities: [
      "Delicious Food",
      "Housekeeping Services",
      "24/7 Support Staff",
      "Transportation Services",
      "Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Maple Springs Living Website",
        url: "https://maplespringsliving.com/",
        icon: "home",
      },
    ],
  },
  "0b54dc2c-2669-4e8b-a9d5-e7e0183495d0": {
    shortDescription: "Assisted Living",
    serviceDescription:
      "Meadows at Escalante Assisted Living provides assisted living in St. George, Utah, with personalized support, activities, dining, housekeeping, transportation, and a warm senior living environment.",
    amenities: [
      "Delicious Food",
      "Housekeeping Services",
      "24/7 Support Staff",
      "Transportation Services",
      "Activities",
    ],
    resources: [],
  },
  "ab325005-389b-43f7-b945-9d1bd306b79d": {
    shortDescription: "Assisted Living",
    website: "https://mesavalleyseniorliving.com/",
    phone: "702-344-5050",
    serviceDescription:
      "Mesa Valley Estates Assisted Living provides assisted living and memory care in Mesquite, Nevada, with personalized support, chef-prepared meals, wellness programs, social activities, and a comfortable senior living community.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://mesavalleyseniorliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Three Chef-Prepared Meals Daily",
      "Snacks Available Throughout the Day",
      "Private Dining",
      "Bistro",
      "Ice Cream Parlor",
      "Dedicated Life Enrichment Coordinator",
      "Full-Time Wellness Director",
      "Fitness Classes",
      "Personalized Wellness Programs",
      "Cultural Activities",
      "On-Site Beauty and Barber Salon",
      "Indoor Theater",
      "Billiards Room",
      "Library",
      "Creative Arts Programs",
      "Raised Garden Beds",
      "Community Van for Group Outings",
      "Transportation Scheduling Assistance",
      "Weekly Housekeeping",
      "Laundry Services",
      "Personal-Use Laundry Facilities",
      "24/7 Trained Team Members",
      "Beautifully Maintained Grounds",
      "Walking Paths",
      "Apartment Floor Plan Options",
      "Advanced Fire Safety Systems",
      "Social Activities",
      "Recreational Activities",
      "Music Sessions",
      "Games and Clubs",
      "Movie Nights",
      "Memory Support Coordination",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Mesa Valley Estates Website",
        url: "https://mesavalleyseniorliving.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://mesavalleyseniorliving.com/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://mesavalleyseniorliving.com/amenities/",
        icon: "list",
      },
      {
        id: "resource-about",
        title: "About Mesa Valley Estates",
        url: "https://mesavalleyseniorliving.com/about-us/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://mesavalleyseniorliving.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "ba7eb6ab-fc29-4687-b01d-cb1d27dbf6f5": {
    shortDescription: "Assisted Living",
    website: "https://www.motherstouchseniorhome.com/",
    phone: "702-501-4246",
    contactEmail: "motherstouchlasvegas@gmail.com",
    serviceDescription:
      "Mother's Touch Senior Home provides assisted living in Las Vegas, Nevada, with personalized residential care, home-like surroundings, daily support, meals, medication management, memory care, and respite care.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.motherstouchseniorhome.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Residential Care Home",
      "Bathing Assistance",
      "Grooming Assistance",
      "Meals",
      "Snacks",
      "Medication Management",
      "Incontinence Care",
      "Range of Motion Support",
      "Transfer Assistance",
      "Ambulation Assistance",
      "Hospice Support",
      "Memory Care",
      "Higher Care Support",
      "Respite Care",
      "Recovery Care",
      "Continuous Observation",
      "Personalized Care",
      "Home-Like Environment",
      "Clean and Organized Home",
      "Private Rooms",
      "Family-Style Care",
      "Care Coordination",
      "Provider Coordination",
      "Virtual Tours",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Mother's Touch Senior Home Website",
        url: "https://www.motherstouchseniorhome.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://www.motherstouchseniorhome.com/services",
        icon: "list",
      },
      {
        id: "resource-about",
        title: "About Mother's Touch",
        url: "https://www.motherstouchseniorhome.com/about-us",
        icon: "document",
      },
      {
        id: "resource-faqs",
        title: "FAQs",
        url: "https://www.motherstouchseniorhome.com/faqs",
        icon: "document",
      },
    ],
  },
  "333e5f98-afb1-4b50-900d-1132c64feca8": {
    shortDescription: "Assisted Living",
    website: "https://oakeyassistedliving.com/",
    phone: "702-258-7572",
    fax: "702-258-7057",
    serviceDescription:
      "Oakey Assisted Living provides assisted living and memory care in Las Vegas, Nevada, with personalized support, health services oversight, medication management, activities, housekeeping, dining assistance, and a comfortable senior living community.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://oakeyassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Health Services Oversight",
      "Weekly Housekeeping",
      "Linen Service",
      "Medication Management",
      "Bathing Assistance",
      "24-Hour Staffing",
      "Diabetic Management",
      "Morning Dressing and Grooming",
      "Evening Dressing and Grooming",
      "Bathroom Assistance",
      "Incontinence Care",
      "Escorting Assistance",
      "Assistance with Meals",
      "Creative Activities Program",
      "Full-Time Activities Program",
      "Comfortable Lounges",
      "Socializing Spaces",
      "Relaxing Spaces",
      "Fitness Center",
      "Wellness Programming",
      "Business Office Support",
      "Tour Scheduling",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Oakey Assisted Living Website",
        url: "https://oakeyassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://oakeyassistedliving.com/las-vegas-assisted-living/",
        icon: "home",
      },
      {
        id: "resource-care-services",
        title: "Care & Services",
        url: "https://oakeyassistedliving.com/care-services/",
        icon: "list",
      },
      {
        id: "resource-location",
        title: "Location",
        url: "https://oakeyassistedliving.com/location/",
        icon: "map",
      },
      {
        id: "resource-fitness",
        title: "Fitness Center",
        url: "https://oakeyassistedliving.com/senior-living-fitness-center/",
        icon: "heart",
      },
      {
        id: "resource-wellness",
        title: "Wellness",
        url: "https://oakeyassistedliving.com/senior-wellness/",
        icon: "heart",
      },
    ],
  },
  "88b53c99-612e-4ef4-8b3c-1d77e0771c03": {
    shortDescription: "Assisted Living",
    serviceDescription:
      "Oakmont of the Lakes Assisted Living provides assisted living and memory care in Las Vegas, Nevada, with personalized support, dining, activities, housekeeping, transportation, and a welcoming senior living environment.",
    amenities: [
      "Delicious Food",
      "Housekeeping Services",
      "24/7 Support Staff",
      "Transportation Services",
      "Activities",
    ],
    resources: [],
  },
  "4316a5c3-469c-4941-a5bf-2554753bf8f2": {
    shortDescription: "Assisted Living",
    website: "https://www.ourhouseassistedlivingofcedarcity.com/",
    phone: "435-867-0055",
    fax: "435-867-1185",
    serviceDescription:
      "Our House of Cedar City provides assisted living and memory care in Cedar City, Utah, with compassionate caregivers, home-like surroundings, life enrichment programs, nutritious meals, nursing support, and personalized resident care.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ourhouseassistedlivingofcedarcity.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Three Nutritious Meals",
      "Life Enhancing Activities",
      "Weekly Laundering of Towels and Sheets",
      "Weekly Housekeeping",
      "Registered Nurse Services",
      "Regular Wellness Checks by Nursing Staff",
      "24-Hour Specially Trained On-Site Staff",
      "Special Diet Support",
      "Transportation Plans",
      "Bathing Assistance",
      "Dressing Assistance",
      "Grooming Assistance",
      "Activity Escorting",
      "Mealtime Escorting",
      "Medication Training",
      "Dementia Care Training",
      "EssentiALZ Memory Care Training",
      "Salon",
      "Library",
      "Game Area",
      "Outdoor Recreational Spaces",
      "Secure Memory Care Courtyard",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Walk-In Closets",
      "Kitchenettes",
      "Emergency Call Systems",
      "Food Handler Certified Staff",
      "CPR Certified Staff",
      "First Aid Certified Staff",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Our House of Cedar City Website",
        url: "https://www.ourhouseassistedlivingofcedarcity.com/",
        icon: "home",
      },
      {
        id: "resource-care-packages",
        title: "Care Packages",
        url: "https://www.ourhouseassistedlivingofcedarcity.com/care-packages/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Community & Floor Plans",
        url: "https://www.ourhouseassistedlivingofcedarcity.com/community-and-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.ourhouseassistedlivingofcedarcity.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Our House of Cedar City",
        url: "https://www.ourhouseassistedlivingofcedarcity.com/about-us/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.ourhouseassistedlivingofcedarcity.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "93d265c7-0ad3-4a32-9db7-0473f863bf90": {
    shortDescription: "Assisted Living",
    website: "https://www.ourhouseassistedlivingofogden.com/",
    phone: "801-399-0456",
    fax: "801-399-0457",
    serviceDescription:
      "Our House of Ogden provides assisted living in Ogden, Utah, with compassionate caregivers, home-like surroundings, life enrichment programs, nutritious meals, nursing support, and personalized resident care.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ourhouseassistedlivingofogden.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Three Nutritious Meals",
      "Life Enhancing Activities",
      "Weekly Laundering of Towels and Sheets",
      "Weekly Housekeeping",
      "Registered Nurse Services",
      "Regular Wellness Checks by Nursing Staff",
      "24-Hour Specially Trained On-Site Staff",
      "Special Diet Support",
      "Transportation Plans",
      "Bathing Assistance",
      "Dressing Assistance",
      "Grooming Assistance",
      "Activity Escorting",
      "Mealtime Escorting",
      "Medication Training",
      "Dementia Care Training",
      "EssentiALZ Memory Care Training",
      "Salon",
      "Library",
      "Game Area",
      "Outdoor Recreational Spaces",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Walk-In Closets",
      "Kitchenettes",
      "Emergency Call Systems",
      "Food Handler Certified Staff",
      "CPR Certified Staff",
      "First Aid Certified Staff",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Our House of Ogden Website",
        url: "https://www.ourhouseassistedlivingofogden.com/",
        icon: "home",
      },
      {
        id: "resource-care-packages",
        title: "Care Packages",
        url: "https://www.ourhouseassistedlivingofogden.com/care-packages/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Community & Floor Plans",
        url: "https://www.ourhouseassistedlivingofogden.com/community-and-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.ourhouseassistedlivingofogden.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Our House of Ogden",
        url: "https://www.ourhouseassistedlivingofogden.com/about-us/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.ourhouseassistedlivingofogden.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "17f030df-8c0a-4d5e-92ce-cef717fe0cc3": {
    shortDescription: "Assisted Living",
    website: "https://www.ourhouseassistedlivingoftooele.com/",
    phone: "435-843-5100",
    fax: "435-255-3511",
    serviceDescription:
      "Our House of Tooele provides assisted living and memory care in Tooele, Utah, with compassionate caregivers, a home-like environment, life enrichment programs, nutritious meals, nursing support, and personalized resident care.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ourhouseassistedlivingoftooele.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Three Nutritious Meals",
      "Life Enhancing Activities",
      "Weekly Laundering of Towels and Sheets",
      "Weekly Housekeeping",
      "Registered Nurse Services",
      "Regular Wellness Checks by Nursing Staff",
      "24-Hour Specially Trained On-Site Staff",
      "Scheduled Transportation",
      "Full Service Salon",
      "Bistro",
      "Library",
      "Fitness Room",
      "Large Multi-Purpose Room",
      "Game Room",
      "Secured Memory Care",
      "Private Dining Room",
      "Laundry Room",
      "Wi-Fi Internet Throughout the Building",
      "Outdoor Basketball Court",
      "Raised Flower Beds",
      "Putting Green",
      "Pickleball Court",
      "Kids Swing Set",
      "Outdoor Fire Pit",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Walk-In Closets",
      "Apartment Sizes from 340-550 Square Feet",
      "Granite Countertops",
      "10-Foot Ceilings",
      "Emergency Call System",
      "Stain-Grade Cabinetry",
      "Kitchenettes with Refrigerators",
      "Memory Care Private Courtyard",
      "Dressing Assistance",
      "Eating Assistance",
      "Escorting to Meals and Activities",
      "Incontinence Care",
      "Bathing Assistance",
      "Grooming Assistance",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Our House of Tooele Website",
        url: "https://www.ourhouseassistedlivingoftooele.com/",
        icon: "home",
      },
      {
        id: "resource-care-packages",
        title: "Care Packages",
        url: "https://www.ourhouseassistedlivingoftooele.com/care-packages/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Community & Floor Plans",
        url: "https://www.ourhouseassistedlivingoftooele.com/community-and-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.ourhouseassistedlivingoftooele.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-team",
        title: "Our Team",
        url: "https://www.ourhouseassistedlivingoftooele.com/our-team/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.ourhouseassistedlivingoftooele.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "a3fb29bf-c371-4565-9f30-3e727e30c905": {
    shortDescription: "Assisted Living",
    website: "https://ovationsiennahills.com/",
    phone: "435-429-0000",
    serviceDescription:
      "Ovation Sienna Hills Assisted Living provides senior living in Washington, Utah, with personalized care, an active adult lifestyle, chef-prepared dining, spacious floor plans, fitness, social engagement, and resort-style amenities near St. George.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://ovationsiennahills.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Memory Care",
      "Female-Only Memory Care",
      "Personalized Care",
      "Professional Care and Support",
      "Bathing Assistance",
      "Dressing Assistance",
      "Medication Management",
      "Meal Preparation Support",
      "Emergency Call Systems",
      "24/7 Staff Availability",
      "Social Engagement",
      "Group Activities",
      "Maintenance-Free Living",
      "Housekeeping Services",
      "Laundry Services",
      "Fitness Centers",
      "Transportation Services",
      "Organized Outings",
      "Chef-Prepared Dining",
      "Seasonal Locally Sourced Ingredients",
      "Vegetarian and Alternative Diets",
      "Daily Specials",
      "Supportive Dining Services",
      "Resident-Inspired Recipes",
      "Spacious Apartments",
      "Studio Apartments",
      "Two-Bedroom Apartments",
      "Villas",
      "Pet-Friendly Community",
      "Swimming Pool",
      "Yoga and Stretching",
      "Salon Services",
      "Garden Areas",
      "Walking and Hiking Areas",
      "Guest Meals",
      "Room Service",
      "On-Site Pharmacy Services",
      "Religious Services",
      "Physical Therapy / Rehabilitation",
      "Guest Parking",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Ovation Sienna Hills Website",
        url: "https://ovationsiennahills.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://ovationsiennahills.com/living-options/assisted-living/",
        icon: "home",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://ovationsiennahills.com/living-options/independent-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://ovationsiennahills.com/living-options/memory-care/",
        icon: "list",
      },
      {
        id: "resource-villas",
        title: "The Villas",
        url: "https://ovationsiennahills.com/living-options/villas/",
        icon: "home",
      },
      {
        id: "resource-dining",
        title: "Dining",
        url: "https://ovationsiennahills.com/dining/",
        icon: "restaurant",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://ovationsiennahills.com/virtual-tour/",
        icon: "video",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://ovationsiennahills.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "67680414-1404-4f40-9ec8-217372a52bed": {
    shortDescription: "Assisted Living",
    website: "https://peachtree-place-assisted-living.ogdendirect.us/",
    phone: "801-682-4948",
    serviceDescription:
      "Peach Tree Assisted Living provides assisted living in West Haven, Utah, with personalized support, dining, housekeeping, transportation, activities, and a comfortable senior living environment.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://peachtree-place-assisted-living.ogdendirect.us/",
      },
    ],
    amenities: [
      "Delicious Food",
      "Housekeeping Services",
      "24/7 Support Staff",
      "Transportation Services",
      "Activities",
    ],
    resources: [
      {
        id: "resource-community",
        title: "PeachTree Place Assisted Living Website",
        url: "https://peachtree-place-assisted-living.ogdendirect.us/",
        icon: "home",
      },
    ],
  },
  "f026924e-de5f-462d-a304-733b566cb4f5": {
    shortDescription: "Assisted Living",
    website: "https://petersenfarmsassistedliving.squarespace.com/",
    phone: "801-479-6000",
    serviceDescription:
      "Petersen Farms provides assisted living and memory care in South Weber, Utah, with studio apartments, private memory care apartments, life-enhancing activities, home-cooked meals, nursing oversight, and Wasatch Mountain views.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/petersenfarmsassistedlivingandmemorycare",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://petersenfarmsassistedliving.squarespace.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Level I Care",
      "Level II Care",
      "Life-Enhancing Activities",
      "Medication Management",
      "24-Hour Care",
      "Health Monitoring by RN",
      "Bathing Assistance",
      "Dressing Assistance",
      "Grooming Assistance",
      "Eating Assistance",
      "Housekeeping and Linen Services",
      "Home-Cooked Meals",
      "Snacks",
      "Special Diets",
      "Scheduled Transportation",
      "Incontinence Care",
      "Kitchenettes",
      "Walk-In Closets",
      "Emergency Call System",
      "Granite Countertops",
      "10-Foot Ceilings",
      "Individual Heating and Cooling",
      "Walk-In Showers",
      "Safety Chair",
      "Adjustable Shower-Head",
      "Full Service Salon",
      "Private Family Dining Room",
      "Wi-Fi Internet",
      "Satellite TV",
      "Laundry Room",
      "Large Multi-Purpose Room",
      "Library Area",
      "Secured Memory Care Unit",
      "Outdoor Patio Area",
      "Assisted Living Studio Apartments",
      "Private Memory Care Apartments",
      "Wasatch Mountain Views",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Petersen Farms Website",
        url: "https://petersenfarmsassistedliving.squarespace.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services & Amenities",
        url: "https://petersenfarmsassistedliving.squarespace.com/our-services",
        icon: "list",
      },
      {
        id: "resource-floor-plan",
        title: "Floor Plan",
        url: "https://petersenfarmsassistedliving.squarespace.com/floor-plan",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Petersen Farms",
        url: "https://petersenfarmsassistedliving.squarespace.com/about-us",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Request More Information",
        url: "https://petersenfarmsassistedliving.squarespace.com/contact-us",
        icon: "calendar",
      },
    ],
  },
  "0c6c3e90-cbab-4b5a-b510-56d3ed7362a9": {
    shortDescription: "Assisted Living",
    website: "https://pheasantviewliving.com/",
    phone: "801-719-6760",
    contactEmail: "info@zioncareutah.com",
    serviceDescription:
      "Pheasant View Assisted Living and Memory Care provides senior living in Layton, Utah, with assisted living care levels, secure memory care, clear pricing, daily activities, meals, housekeeping, transportation, and a small home-like community setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://pheasantviewliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "24/7 Care",
      "Daily Activities",
      "Three Meals Daily",
      "Community Activities",
      "Weekly Housekeeping",
      "Laundry Service",
      "Linen Service",
      "Registered Nurse Services",
      "Wellness Checks",
      "Daily Support",
      "Scheduled Transportation",
      "Emergency Call Systems",
      "Utilities",
      "Cable",
      "Apartment Maintenance",
      "Salon Access",
      "Gym Space",
      "Movie Area",
      "Medication Management",
      "Ambulation Support",
      "Meal Escorting",
      "Eating Assistance",
      "Dressing Assistance",
      "Toileting Assistance",
      "Incontinence Care",
      "Grooming Assistance",
      "Showering Assistance",
      "Secure Memory Care Environment",
      "Full Personal Care",
      "Trained Staff Support",
      "Open Family Visits",
      "Shared Meals",
      "Daily Routines",
      "Music",
      "Fitness Room",
      "Resident Rooms",
      "Dining Areas",
      "Activity Spaces",
      "Outdoor Walkway",
      "Personalized Rooms",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Pheasant View Website",
        url: "https://pheasantviewliving.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://pheasantviewliving.com/assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://pheasantviewliving.com/memory-care",
        icon: "list",
      },
      {
        id: "resource-pricing",
        title: "Pricing",
        url: "https://pheasantviewliving.com/pricing",
        icon: "document",
      },
      {
        id: "resource-life-here",
        title: "Life Here",
        url: "https://pheasantviewliving.com/life-here",
        icon: "heart",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://pheasantviewliving.com/gallery",
        icon: "image",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://pheasantviewliving.com/floor-plans",
        icon: "document",
      },
      {
        id: "resource-faq",
        title: "FAQ",
        url: "https://pheasantviewliving.com/faq",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://pheasantviewliving.com/contact",
        icon: "calendar",
      },
    ],
  },
  "02e032ce-12d6-4c22-9464-e66b212d8aec": {
    shortDescription: "Assisted Living",
    serviceDescription:
      "Quail Meadow Assisted Living and Memory Care provides assisted living and memory care in North Ogden, Utah, with personalized support, meals, housekeeping, activities, transportation, and a small home-like senior living setting.",
    amenities: [
      "Delicious Food",
      "Housekeeping Services",
      "24/7 Support Staff",
      "Transportation Services",
      "Activities",
    ],
    resources: [],
  },
  "0c9dc911-287e-46bd-a633-c1659eb8d136": {
    shortDescription: "Assisted Living",
    website: "https://www.ridgeviewgardens.com/",
    phone: "435-656-2700",
    fax: "435-656-1124",
    contactEmail: "info@ridgeviewgardens.com",
    serviceDescription:
      "Ridgeview Gardens Assisted Living provides assisted living in St. George, Utah, with compassionate caregivers, home-like surroundings, engaging activities, nutritious meals, housekeeping, transportation, and personalized resident care.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ridgeviewgardens.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Three Nutritious Meals",
      "Life Enhancing Activities",
      "Weekly Laundering of Towels and Sheets",
      "Weekly Housekeeping",
      "Comfort Services",
      "Entertainment",
      "Cable Television",
      "Activity Spaces",
      "Support Services",
      "Bathing Assistance",
      "Dressing Assistance",
      "Grooming Assistance",
      "Activity Escorting",
      "Mealtime Escorting",
      "Medication Assistance",
      "Beautifully Maintained Common Areas",
      "Salon",
      "Library",
      "Outdoor Spaces",
      "Games Area",
      "Exercise Classes",
      "Cooking Sessions",
      "Game Nights",
      "Workshops",
      "Trips",
      "Home-Like Environment",
      "Clean and Comfortable Community",
      "Warm Caregiver Team",
      "WOW Standard of Care",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Ridgeview Gardens Website",
        url: "https://www.ridgeviewgardens.com/",
        icon: "home",
      },
      {
        id: "resource-care-packages",
        title: "Care Packages",
        url: "https://www.ridgeviewgardens.com/care-packages/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Community & Floor Plans",
        url: "https://www.ridgeviewgardens.com/community-and-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.ridgeviewgardens.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Ridgeview Gardens",
        url: "https://www.ridgeviewgardens.com/about-us/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.ridgeviewgardens.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "67c16fde-ce21-4c42-ba57-550274abe50a": {
    shortDescription: "Assisted Living",
    phone: "801-692-2100",
    fax: "801-692-2111",
    serviceDescription:
      "River Meadows Assisted Living provides assisted living in Alpine, Utah, with personalized support, dining, housekeeping, transportation, activities, and a comfortable senior living environment near the mountains.",
    amenities: [
      "Delicious Food",
      "Housekeeping Services",
      "24/7 Support Staff",
      "Transportation Services",
      "Activities",
    ],
    resources: [],
  },
  "ace4b8b2-8f90-4276-86ac-b4f4d3b7738b": {
    shortDescription: "Assisted Living",
    website: "https://riverpointeal.com/",
    serviceDescription:
      "River Pointe Assisted Living provides assisted living in Provo, Utah, with a small home-like community, Wasatch Front views, chef-prepared dining, activities, transportation, housekeeping, nursing support, and personalized care.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://riverpointeal.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Monthly Activities and Outings",
      "Resident-Run Clubs",
      "Special Interest Groups",
      "Spiritual Programming",
      "Educational Programming",
      "Personal Development Classes",
      "Community Entertainment",
      "Family Supported Entertainment",
      "Scenic Drives",
      "Social Lifestyle",
      "Weekly Scheduled Transportation",
      "Medical Appointment Transportation",
      "Shopping Transportation",
      "Meal Reminders",
      "Activity Reminders",
      "Chef Prepared Dining",
      "Daily Menu Options",
      "Meal Delivery Options",
      "Private Family Dining Room",
      "Cable Included",
      "Wi-Fi Included",
      "Utilities Included",
      "Phone Service Available",
      "Weekly Housekeeping",
      "Weekly Linen Service",
      "Personal Laundry Facility",
      "Personal Laundry Service Option",
      "Building Maintenance",
      "Landscape Maintenance",
      "Private Mailbox",
      "On-Site Beauty Salon",
      "Barber Shop",
      "Suite Emergency Assistance System",
      "Medical Alert System",
      "Personal Temperature Control",
      "Certified Nursing Staff On-Site 24/7",
      "Registered Nurse Available 24/7",
      "Medication Management",
      "Bathing Assistance",
      "Grooming Assistance",
      "Dressing Assistance",
      "Unique Suite Options",
      "Kitchenettes",
      "Private Bathrooms",
      "Private Showers",
      "Spacious Floorplans",
      "Wasatch Front Views",
      "Gardens",
      "Common Areas",
    ],
    resources: [
      {
        id: "resource-community",
        title: "River Pointe Assisted Living Website",
        url: "https://riverpointeal.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services & Amenities",
        url: "https://riverpointeal.com/services/",
        icon: "list",
      },
      {
        id: "resource-about",
        title: "About River Pointe",
        url: "https://riverpointeal.com/about/",
        icon: "document",
      },
    ],
  },
  "a60c7fd3-42c1-491c-8544-6a6029aaa07d": {
    shortDescription: "Assisted Living",
    website: "https://www.riverwayassistedliving.com/",
    phone: "801-282-3711",
    fax: "385-415-5100",
    serviceDescription:
      "Riverway Assisted Living and Memory Care provides assisted living and memory care in South Jordan, Utah, with compassionate caregivers, activities, care packages, floor plan options, transportation, dining, and a home-like community setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.riverwayassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Medical Support",
      "Medication Administration",
      "RN Check-Ups",
      "Ambulation Assistance",
      "Transfer Assistance",
      "Fresh Linen",
      "Housekeeping",
      "Laundry Services",
      "Cable Television",
      "Entertainment",
      "Activities",
      "Activity Escorting",
      "Mealtime Escorting",
      "Bathing Assistance",
      "Dressing Assistance",
      "Grooming Assistance",
      "Special Diets",
      "Scheduled Transportation",
      "Holistic Activities",
      "Physical Activities",
      "Intellectual Activities",
      "Social Activities",
      "Vocational Activities",
      "Educational Activities",
      "Emotional Activities",
      "Spiritual Activities",
      "Quality Programming",
      "Volunteer Engagement",
      "Resident Participation",
      "Personalized Activity Assessments",
      "Community Committees",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Kitchenettes",
      "Emergency Call Systems",
      "Salon",
      "Library",
      "Game Area",
      "Outdoor Recreational Spaces",
      "Secure Memory Care Courtyard",
      "Certified Caregivers",
      "CPR Certified Staff",
      "First Aid Certified Staff",
      "Food Handler Certified Staff",
      "EssentiALZ Dementia Care Training",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Riverway Website",
        url: "https://www.riverwayassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living Care",
        url: "https://www.riverwayassistedliving.com/care-packages/assisted-living-care/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.riverwayassistedliving.com/care-packages/memory-care/",
        icon: "list",
      },
      {
        id: "resource-activities",
        title: "Activities",
        url: "https://www.riverwayassistedliving.com/activities/",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Community & Floor Plans",
        url: "https://www.riverwayassistedliving.com/community-and-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Riverway",
        url: "https://www.riverwayassistedliving.com/about-us/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.riverwayassistedliving.com/#schedule-a-tour",
        icon: "calendar",
      },
    ],
  },
  "8ce17a1a-ecaf-4fdf-a6c3-407d7667584e": {
    shortDescription: "Assisted Living",
    serviceDescription:
      "Rosecrest Assisted Living provides assisted living with personalized support, dining, housekeeping, transportation, activities, and a comfortable senior living environment.",
    amenities: [
      "Delicious Food",
      "Housekeeping Services",
      "24/7 Support Staff",
      "Transportation Services",
      "Activities",
    ],
    resources: [],
  },
  "66289d98-1115-45e5-a4db-12959882a93e": {
    shortDescription: "Assisted Living",
    website: "https://www.rosewoodassistedcare.com/",
    phone: "801-571-1010",
    contactEmail: "ann@rosewoodassistedcare.com",
    serviceDescription:
      "Rosewood Assisted Care provides assisted living and memory care in Utah with personalized daily support, 24/7 caregiving, home-style meals, housekeeping, transportation, wellness services, and meaningful activities.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.rosewoodassistedcare.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized Daily Support",
      "Bathing Assistance",
      "Dressing Assistance",
      "Grooming Assistance",
      "Medication Management",
      "Mobility Support",
      "Scheduled Transportation",
      "24/7 Caregiving Staff",
      "Emergency Call Systems",
      "Individualized Care Plans",
      "Access to Visiting Healthcare Providers",
      "Support for Chronic Conditions",
      "Weekly Personal Laundry Service",
      "Routine Housekeeping",
      "Fresh Home-Cooked Meals",
      "From-Scratch Cooking",
      "Personalized Menus",
      "Dietary Flexibility",
      "Low-Sodium Meal Options",
      "Diabetic-Friendly Meal Options",
      "Spacious Kitchen and Dining Areas",
      "Private Apartments",
      "Individual Heating and Air Conditioning",
      "Built-In Storage",
      "Hardwood-Style Flooring",
      "Natural Light",
      "Well-Maintained Grounds",
      "On-Site Salon",
      "Barbershop",
      "Engaging Daily Activities",
      "Outings",
      "Family and Community Events",
      "Arts and Crafts",
      "Fitness Classes",
      "Music Programs",
      "Games",
      "Holiday Celebrations",
      "In-House Entertainment",
      "Social Lounges",
      "Garden Seating",
    ],
    resources: [
      {
        id: "resource-community",
        title: "Rosewood Assisted Care Website",
        url: "https://www.rosewoodassistedcare.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://www.rosewoodassistedcare.com/services",
        icon: "list",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.rosewoodassistedcare.com/amenities",
        icon: "list",
      },
      {
        id: "resource-about",
        title: "About Rosewood",
        url: "https://www.rosewoodassistedcare.com/about",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.rosewoodassistedcare.com/contact",
        icon: "calendar",
      },
    ],
  },
  "949aa30a-b12a-4838-84d6-f2f54feedb40": {
    shortDescription: "Assisted Living",
    website:
      "https://stellarliving.com/communities/the-grand-at-southern-hills-senior-assisted-living-las-vegas-nv/",
    phone: "702-222-3600",
    serviceDescription:
      "San Martin Assisted Living, now operating as The Grand at Southern Hills, provides assisted living and memory care in Las Vegas, Nevada, with spacious apartments, chef-prepared dining, activities, transportation, personal care support, and memory care programming.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://stellarliving.com/communities/the-grand-at-southern-hills-senior-assisted-living-las-vegas-nv/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Short-Term Respite Care",
      "Weekly Housekeeping",
      "Chef-Prepared Meals",
      "Activities and Outings",
      "Scheduled Transportation",
      "24/7 Personal Care Support",
      "Fitness Center",
      "Salon and Spa",
      "Courtyards and Outdoor Spaces",
      "Pet-Friendly Community",
      "Apollo Memory Care Program",
      "LifeLoop Family Updates",
    ],
    resources: [
      {
        id: "resource-community",
        title: "The Grand at Southern Hills Website",
        url: "https://stellarliving.com/communities/the-grand-at-southern-hills-senior-assisted-living-las-vegas-nv/",
        icon: "home",
      },
      {
        id: "resource-pricing",
        title: "Transparent Pricing",
        url: "https://stellarliving.com/communities/the-grand-at-southern-hills-senior-assisted-living-las-vegas-nv/#gform_wrapper_4",
        icon: "document",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://stellarliving.com/communities/the-grand-at-southern-hills-senior-assisted-living-las-vegas-nv/#assisted-living",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://stellarliving.com/communities/the-grand-at-southern-hills-senior-assisted-living-las-vegas-nv/#memory-care",
        icon: "list",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://stellarliving.com/communities/the-grand-at-southern-hills-senior-assisted-living-las-vegas-nv/#gform_wrapper_4",
        icon: "calendar",
      },
    ],
  },
  "d3e23119-56b0-4ff3-becd-918a34b91e3d": {
    shortDescription: "Assisted Living",
    website: "https://sarahdafthome.org/",
    phone: "801-582-5104",
    contactName: "Paul Ogilvie",
    contactRole: "Executive Director",
    serviceDescription:
      "The Sarah Daft Home is a nonprofit assisted living community in Salt Lake City, Utah, dedicated to affordable, high-quality care in a homelike setting with meals, assistance, activities, transportation, and a close-knit resident community.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://sarahdafthome.org/",
      },
    ],
    amenities: [
      "Three Home-Cooked Meals Daily",
      "Medication Assistance",
      "Bathing Assistance",
      "Weekly Housekeeping",
      "Weekly Laundry and Linen Service",
      "Transportation to Medical Appointments",
      "Personal Alarm Systems",
      "Peaceful Grounds and Gardens",
      "Large Covered Deck",
      "Exercise and Yoga Programs",
      "Hair Salon and Podiatry Services",
      "Field Trips and Social Activities",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Sarah Daft Home Website",
        url: "https://sarahdafthome.org/",
        icon: "home",
      },
      {
        id: "resource-care-services",
        title: "Care & Services",
        url: "https://sarahdafthome.org/care-services/",
        icon: "list",
      },
      {
        id: "resource-resident-life",
        title: "Resident Life",
        url: "https://sarahdafthome.org/resident-life/",
        icon: "heart",
      },
      {
        id: "resource-pricing",
        title: "Floor Plans & Pricing",
        url: "https://sarahdafthome.org/floor-plans-pricing/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Sarah Daft Home",
        url: "https://sarahdafthome.org/contact/",
        icon: "calendar",
      },
    ],
  },
  "2486719d-0509-421c-b09c-f96622604e07": {
    shortDescription: "Assisted Living",
    website: "https://saratogaview.com/",
    phone: "385-430-1020",
    serviceDescription:
      "Saratoga View Assisted Living is a Rocky Mountain Care community in Saratoga Springs, Utah, offering assisted living in a bright senior living setting with lake views, spacious suites, personal care support, activities, and family-centered community life.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://saratogaview.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Studio, One-Bedroom, and Two-Bedroom Apartments",
      "Kitchenettes",
      "Private Bathrooms and Showers",
      "Light Housekeeping",
      "Same-Day Maintenance Responses",
      "Month-to-Month Contracts",
      "Comfortable Community Living Spaces",
      "Activities and Entertainment",
      "Family Participation Encouraged",
      "Views of Utah Lake",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Saratoga View Website",
        url: "https://saratogaview.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://saratogaview.com/services/",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://saratogaview.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-about",
        title: "About Saratoga View",
        url: "https://saratogaview.com/about/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Contact Saratoga View",
        url: "https://saratogaview.com/contact/",
        icon: "calendar",
      },
    ],
  },
  "f095a742-aef3-45aa-a124-a9e6e0d5381c": {
    shortDescription: "Assisted Living",
    website: "https://www.myseasonsseniorliving.com/",
    phone: "801-394-0044",
    fax: "801-383-0029",
    serviceDescription:
      "Seasons of Farr West is a boutique assisted living community in Farr West, Utah, providing personalized care, 24-hour support, homestyle dining, daily activities, transportation, and a comfortable home-like setting for seniors in Weber County.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.myseasonsseniorliving.com/",
      },
    ],
    amenities: [
      "Three Meals Daily",
      "24-Hour Care",
      "RN Wellness Checks",
      "Medication Administration",
      "Bathing, Dressing, and Grooming Assistance",
      "Scheduled Transportation",
      "Housekeeping and Linen Service",
      "Cable Television",
      "Salon and Barbershop",
      "Exercise and Brain Games",
      "Weekly Outings",
      "Movie Room and Library",
      "Pet-Friendly Community",
      "Homestyle Dining",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Seasons Assisted Living Website",
        url: "https://www.myseasonsseniorliving.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Care & Services",
        url: "https://www.myseasonsseniorliving.com/services",
        icon: "list",
      },
      {
        id: "resource-farr-west",
        title: "Assisted Living in Farr West",
        url: "https://www.myseasonsseniorliving.com/areas-we-serve/assisted-living-in-farr-west",
        icon: "home",
      },
      {
        id: "resource-gallery",
        title: "Amenities Gallery",
        url: "https://www.myseasonsseniorliving.com/amenities-gallery",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://www.myseasonsseniorliving.com/contact",
        icon: "calendar",
      },
    ],
  },
  "ac44a825-55a2-44c3-a74a-a5f62e91b4af": {
    shortDescription: "Assisted Living",
    website: "https://www.silverskylasvegas.com/",
    phone: "702-835-9040",
    serviceDescription:
      "Silver Sky Assisted Living is a Nevada HAND affordable assisted living community in Las Vegas for seniors who need support with daily living, offering all-inclusive care, meals, activities, transportation, caregivers on-site, and 24-hour nursing and medical support.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.silverskylasvegas.com/",
      },
    ],
    amenities: [
      "Three Meals Per Day",
      "Weekly Housekeeping",
      "Weekly Laundry",
      "Assistance with Showering and Dressing",
      "Medication Management",
      "Daily Resident Activities",
      "Scheduled Transportation",
      "Cable and Wi-Fi Included",
      "24-Hour Caregivers",
      "Wellness Checks",
      "Emergency Call System",
      "Coordination with Health Care Professionals",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Silver Sky Website",
        url: "https://www.silverskylasvegas.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living Services",
        url: "https://www.silverskylasvegas.com/welcome-home/assisted-living/",
        icon: "list",
      },
      {
        id: "resource-info-sheet",
        title: "Printable Info Sheet",
        url: "https://www.silverskylasvegas.com/wp-content/uploads/2021/09/SS-Onesheetv3.pdf",
        icon: "document",
      },
      {
        id: "resource-faq",
        title: "Assisted Living FAQs",
        url: "https://silverskylasvegas.com/why-silver-sky/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Contact Silver Sky",
        url: "https://www.silverskylasvegas.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "34a2e56b-8572-4177-9064-2061d6bb6c83": {
    shortDescription: "Assisted Living",
    website: "https://www.silverskylasvegas.com/",
    phone: "702-462-7700",
    serviceDescription:
      "Silver Sky at Deer Springs Assisted Living is a Nevada HAND affordable assisted living community in Las Vegas for seniors who need help with activities of daily living, with all-inclusive care, meals, daily activities, scheduled transportation, caregivers on-site, and 24-hour support.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.silverskylasvegas.com/",
      },
    ],
    amenities: [
      "Three Meals Per Day",
      "Weekly Housekeeping",
      "Weekly Laundry",
      "Assistance with Showering and Dressing",
      "Medication Management",
      "Daily Resident Activities",
      "Scheduled Transportation",
      "Cable and Wi-Fi Included",
      "24-Hour Caregivers",
      "Wellness Checks",
      "Emergency Call System",
      "Coordination with Health Care Professionals",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Silver Sky Website",
        url: "https://www.silverskylasvegas.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living Services",
        url: "https://www.silverskylasvegas.com/welcome-home/assisted-living/",
        icon: "list",
      },
      {
        id: "resource-info-sheet",
        title: "Printable Info Sheet",
        url: "https://www.silverskylasvegas.com/wp-content/uploads/2021/09/SS-Onesheetv3.pdf",
        icon: "document",
      },
      {
        id: "resource-faq",
        title: "Assisted Living FAQs",
        url: "https://silverskylasvegas.com/why-silver-sky/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Contact Silver Sky",
        url: "https://www.silverskylasvegas.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "8e99cca3-6465-4e69-915b-4b688169e036": {
    shortDescription: "Assisted Living",
    website: "https://southgateseniorliving.com/",
    phone: "435-215-1560",
    serviceDescription:
      "Southgate Senior Living in Saint George, Utah, offers assisted living and memory care in a warm senior living community with personalized support, 24/7 availability, engaging activities, transportation, dining, and pet-friendly amenities.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://southgateseniorliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Respite Care",
      "24/7 Availability",
      "Personal Care Assistance",
      "Medication Support",
      "Transportation for Appointments",
      "Activities and Social Programming",
      "Private Dining",
      "Nutritious Snacks",
      "Walking Paths",
      "Pet-Friendly Community",
      "Security and Surveillance",
      "Controllable Thermostats",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Southgate Senior Living Website",
        url: "https://southgateseniorliving.com/",
        icon: "home",
      },
      {
        id: "resource-living-options",
        title: "Living Options",
        url: "https://southgateseniorliving.com/living-options",
        icon: "list",
      },
      {
        id: "resource-pricing",
        title: "Pricing Guide",
        url: "https://southgateseniorliving.com/",
        icon: "document",
      },
      {
        id: "resource-community",
        title: "Our Community",
        url: "https://southgateseniorliving.com/our-community",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://southgateseniorliving.com/schedule-a-visit",
        icon: "calendar",
      },
    ],
  },
  "d568c517-7111-4453-99be-1dcc56d4f354": buildSpringGardensEnrichment({
    locationName: "Spring Gardens Draper",
    city: "Draper",
    website: "https://avistaseniorliving.com/draper/",
    phone: "385-446-4195",
    facebookUrl: "https://www.facebook.com/springgardensdraper",
    shortDescription: "Assisted Living / Independent Living / Memory Care",
    services: "assisted living, independent living, and memory care",
  }),
  "5e46a923-827f-403a-ade6-eb3af19614f7": buildSpringGardensEnrichment({
    locationName: "Spring Gardens of Holladay",
    city: "Holladay",
    website: "https://avistaseniorliving.com/holladay/",
    services: "assisted living and memory care",
  }),
  "0adae14e-e924-4270-80d4-c0c041050a2f": buildSpringGardensEnrichment({
    locationName: "Spring Gardens of Lindon",
    city: "Lindon",
    website: "https://avistaseniorliving.com/lindon/",
    services: "assisted living and memory care",
  }),
  "120f0b47-4231-4430-b3a3-ed63b83b9d94": buildSpringGardensEnrichment({
    locationName: "Spring Gardens Mapleton",
    city: "Mapleton",
    website: "https://avistaseniorliving.com/mapleton/",
    phone: "385-265-1090",
    facebookUrl: "https://www.facebook.com/springgardensmapleton",
    shortDescription: "Assisted Living / Memory Care",
    services: "assisted living and memory care",
  }),
  "caf207e4-ac66-4b80-9064-b5f884eae8e1": buildSpringGardensEnrichment({
    locationName: "Spring Gardens Midvale",
    city: "Midvale",
    website: "https://avistaseniorliving.com/midvale/",
    phone: "385-265-1090",
    facebookUrl: "https://www.facebook.com/springgardensmidvale",
    includeMemoryCare: false,
    services: "assisted living",
  }),
  "d4d12f05-371b-492c-b036-46633e5f14e6": buildSpringGardensEnrichment({
    locationName: "Spring Gardens St. George",
    city: "St. George",
    website: "https://springgardens.avistaseniorliving.com/st-george/",
    phone: "435-236-6144",
    shortDescription: "Assisted Living / Memory Care",
    services: "assisted living and memory care",
  }),
  "84fbe577-892d-4f08-8789-a772f06a50f9": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://springhollowassistedliving.com/",
    phone: "385-497-5100",
    serviceDescription:
      "Spring Hollow Assisted Living and Memory Care is a Rocky Mountain Care community in Orem, Utah, offering assisted living and memory care in a warm, family-focused setting with personalized support, activities, gardens, meals, and comfortable community spaces.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://springhollowassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized Support",
      "24/7 Staff Support",
      "Medication Management",
      "Delicious Meals",
      "Activities and Entertainment",
      "Lush Gardens",
      "Wasatch Front Views",
      "Warm Community Spaces",
      "Family Connection",
      "Compassionate Care",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Spring Hollow Website",
        url: "https://springhollowassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-about",
        title: "About Spring Hollow",
        url: "https://springhollowassistedliving.com/about/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://springhollowassistedliving.com/",
        icon: "calendar",
      },
    ],
  },
  "13989996-cd48-44cc-9fd0-beb487c8b37c": {
    shortDescription: "Assisted Living",
    website: "https://sterlingseniorliving.com/",
    serviceDescription:
      "Sterling Court Senior Living is an assisted living community in Saint George, Utah, located near the Red Cliffs of Southern Utah, with professional care staff, active resident programming, dining, and a comfortable retirement lifestyle.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://sterlingseniorliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Activities Director",
      "Restaurant-Style Dining",
      "Comfortable Community Spaces",
      "Professional Care Staff",
      "Support with Activities of Daily Living",
      "Retirement Lifestyle Support",
      "Southern Utah Location",
      "Welcoming Atmosphere",
      "Resident-Centered Care",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Sterling Court Website",
        url: "https://sterlingseniorliving.com/",
        icon: "home",
      },
      {
        id: "resource-about",
        title: "About Sterling Court",
        url: "https://sterlingseniorliving.com/about-us/",
        icon: "heart",
      },
      {
        id: "resource-brochure",
        title: "Sterling Court Brochure",
        url: "https://pebblecdn.sfo3.digitaloceanspaces.com/sites/157/2024/05/02090542/Sterling-Court-Assisted-Living-Brochure.pdf",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Sterling Court",
        url: "https://sterlingseniorliving.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "97155a16-625e-4c6d-afab-d9112d6b870a": {
    shortDescription: "Assisted Living / Independent Living / Memory Care",
    website: "https://sterlingridgeseniorliving.com/",
    serviceDescription:
      "Sterling Ridge Senior Living in Las Vegas, Nevada, offers independent living, assisted living, memory care, and respite care with spacious apartments, 24-hour response systems, medication management, restaurant-style dining, transportation, and resident-centered activities.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://sterlingridgeseniorliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Memory Care",
      "Respite Care",
      "Spacious Apartments",
      "24-Hour Response System",
      "Medication Management Program",
      "Weekly Housekeeping and Linen Services",
      "Pet-Friendly Community",
      "Scheduled Local Transportation",
      "Beauty Salon",
      "Private Dining Room",
      "Fitness Center",
      "Chapel and Theater",
      "Restaurant-Style Dining",
      "Landscaped Courtyard",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Sterling Ridge Website",
        url: "https://sterlingridgeseniorliving.com/",
        icon: "home",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://sterlingridgeseniorliving.com/our-community/amenities/",
        icon: "list",
      },
      {
        id: "resource-living-options",
        title: "Living Options",
        url: "https://sterlingridgeseniorliving.com/home/",
        icon: "heart",
      },
      {
        id: "resource-pricing-info",
        title: "Pricing & Info",
        url: "https://sterlingridgeseniorliving.com/just-getting-started/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Sterling Ridge",
        url: "https://sterlingridgeseniorliving.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "c9a62e8a-19e6-42ca-b4f7-6fd9b42da37b": {
    shortDescription: "Assisted Living",
    website: "https://summerfieldinfo.com/",
    phone: "801-434-7581",
    serviceDescription:
      "Summerfield Assisted Living in Orem, Utah, is part of a locally owned continuous care community offering personalized assisted living support, 24-hour in-house staff, studio and one-bedroom apartments, medication management, chef-crafted meals, activities, and outdoor spaces.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://summerfieldinfo.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "24-Hour In-House Staff",
      "Personalized Care Plans",
      "Medication Management",
      "Bathing, Dressing, and Grooming Assistance",
      "Studio and One-Bedroom Apartments",
      "Kitchenettes",
      "Handicapped-Accessible Bathrooms",
      "Chef-Crafted Meals",
      "Fresh Snacks and Drinks",
      "Outdoor Courtyard and Water Features",
      "Garden Boxes",
      "Full-Time Activities Directors",
      "Independent Living on Campus",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Summerfield Website",
        url: "https://summerfieldinfo.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://summerfieldinfo.com/assisted-living/",
        icon: "list",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://summerfieldinfo.com/independent-living/",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://summerfieldinfo.com/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Summerfield",
        url: "https://summerfieldinfo.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "472acf23-8b3d-4b58-9792-3a90709db4db": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://meadowpeakassistedliving.org/",
    serviceDescription:
      "Meadow Peak Assisted Living & Memory Care at Summit Vista provides compassionate assisted living and specialized memory care in Taylorsville, Utah, with personalized support, a Summit Vista campus setting, wellness-focused care, activities, and family-centered services.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://meadowpeakassistedliving.org/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized Support",
      "Specialized Memory Care",
      "Wellness-Focused Care",
      "Activities and Social Engagement",
      "Summit Vista Campus Setting",
      "Comfortable Community Spaces",
      "Family-Centered Services",
      "Compassionate Care Team",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Meadow Peak Website",
        url: "https://meadowpeakassistedliving.org/",
        icon: "home",
      },
      {
        id: "resource-summit-vista",
        title: "Summit Vista Community",
        url: "https://summitvista.com/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Schedule a Tour",
        url: "https://meadowpeakassistedliving.org/",
        icon: "calendar",
      },
    ],
  },
  "3cda9f79-4e43-41f7-a7d7-9d852a2b1241": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.sunridgeassistedliving.com/",
    phone: "801-280-2244",
    fax: "801-509-7899",
    serviceDescription:
      "Sunridge Assisted Living & Memory Care offers assisted living and memory care in Utah with a focus on safe, home-like communities, personalized support, nutritious dining, engaging activities, secure outdoor spaces, and compassionate caregiver support.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.sunridgeassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Personalized Care",
      "Homelike Atmosphere",
      "Nutritious Dining",
      "Engaging Activities",
      "Secure Outdoor Spaces",
      "Comfortable Accommodations",
      "Safety and Security",
      "Compassionate Caregivers",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Sunridge Website",
        url: "https://www.sunridgeassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.sunridgeassistedliving.com/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-locations",
        title: "Sunridge Locations",
        url: "https://www.sunridgeassistedliving.com/",
        icon: "list",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.sunridgeassistedliving.com/",
        icon: "calendar",
      },
    ],
  },
  "7ac8ce8f-a7c4-468e-b6cb-a803eac53601": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.sunridgeassistedlivingoflayton.com/",
    phone: "801-544-2200",
    fax: "801-546-3711",
    serviceDescription:
      "Sunridge Assisted Living & Memory Care of Layton provides assisted living and memory care in Layton, Utah, with 24-hour care, RN wellness checks, medication administration, dining, scheduled transportation, life-enhancing activities, and the In My Shoes memory care program.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.sunridgeassistedlivingoflayton.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Three Meals Daily",
      "24-Hour Care",
      "Regular Wellness Checks by RN",
      "Medication Administration",
      "Scheduled Transportation",
      "Housekeeping and Linen Service",
      "Full Service Salon",
      "Bistro and Library",
      "Fitness Room",
      "Private Dining Room",
      "Studio and One-Bedroom Apartments",
      "Emergency Call System",
      "Secured Memory Care",
      "Memory Care Private Courtyard",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Sunridge of Layton Website",
        url: "https://www.sunridgeassistedlivingoflayton.com/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.sunridgeassistedlivingoflayton.com/care-packages/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor & Apartment Plans",
        url: "https://www.sunridgeassistedliving.com/sunridge-of-layton/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.sunridgeassistedlivingoflayton.com/",
        icon: "calendar",
      },
    ],
  },
  "06be6e66-ebdb-4c9b-a35a-985c083513db": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.sunridgeassistedlivingofroy.com/",
    phone: "801-731-4444",
    fax: "801-985-0855",
    serviceDescription:
      "Sunridge Assisted Living & Memory Care of Roy is a Northern Wasatch Front assisted living and memory care community in Roy, Utah, offering 24-hour care, RN wellness checks, medication administration, scheduled transportation, life-enhancing activities, and private studio and one-bedroom apartments.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.sunridgeassistedlivingofroy.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Three Meals Daily",
      "24-Hour Care",
      "Regular Wellness Checks by RN",
      "Medication Administration",
      "Scheduled Transportation",
      "Housekeeping and Linen Service",
      "Laundry Service",
      "Life-Enhancing Activities",
      "Assistance with Bathing and Dressing",
      "Assistance with Ambulation and Transfers",
      "Incontinence Care",
      "Special Diets",
      "Studio and One-Bedroom Apartments",
      "Private Bathrooms",
      "Kitchenettes",
      "Memory Care Program",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Sunridge of Roy Website",
        url: "https://www.sunridgeassistedlivingofroy.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living - Roy",
        url: "https://www.sunridgeassistedliving.com/assisted-living-roy/",
        icon: "list",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.sunridgeassistedliving.com/memory-care-at-sunridge-assisted-living/",
        icon: "heart",
      },
      {
        id: "resource-services-fees",
        title: "Services & Fees",
        url: "https://www.sunridgeassistedliving.com/services-fees-roy/",
        icon: "document",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.sunridgeassistedlivingofroy.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.sunridgeassistedlivingofroy.com/",
        icon: "calendar",
      },
    ],
  },
  "68bca977-6253-470a-a4d6-48357bf92ea5": {
    shortDescription: "Assisted Living / Independent Living / Memory Care",
    website: "https://www.sunriseseniorliving.com/communities/ut/sunrise-at-holladay",
    phone: "385-881-6429",
    serviceDescription:
      "Sunrise at Holladay is a senior living community in Salt Lake City, Utah, offering independent living, assisted living, memory care, and short-term stays with personalized care, chef-crafted dining, engaging activities, and amenities such as a gym, hair salon, theater room, bistro, and outdoor spaces.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.sunriseseniorliving.com/communities/ut/sunrise-at-holladay",
      },
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/SunriseSeniorLiving",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/sunrisesrliving/",
      },
      {
        id: "social-linkedin",
        platform: "linkedin",
        url: "https://www.linkedin.com/company/sunrise-senior-living/",
      },
    ],
    amenities: [
      "Independent Living",
      "Assisted Living",
      "Memory Care",
      "Short-Term Stays",
      "Personalized 24-Hour Care",
      "Fresh Chef-Crafted Cuisine",
      "Bistro",
      "Two Dining Rooms",
      "Gym",
      "Hair Salon",
      "Theater Room",
      "Beautiful Outdoor Spaces",
      "Scheduled Transportation",
      "Well-Appointed Common Areas",
      "Emergency Response Systems",
      "Wi-Fi Available",
      "Family Engagement App",
      "Activities and Social Events",
      "Pet Friendly",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Sunrise at Holladay Website",
        url: "https://www.sunriseseniorliving.com/communities/ut/sunrise-at-holladay",
        icon: "home",
      },
      {
        id: "resource-gallery",
        title: "Photos & 3D Spaces",
        url: "https://www.sunriseseniorliving.com/communities/ut/sunrise-at-holladay/tour-and-gallery",
        icon: "image",
      },
      {
        id: "resource-pricing",
        title: "Floor Plans & Pricing",
        url: "https://www.sunriseseniorliving.com/communities/ut/sunrise-at-holladay",
        icon: "document",
      },
      {
        id: "resource-dining",
        title: "Dining at Sunrise",
        url: "https://www.sunriseseniorliving.com/experience-sunrise/signature-dining",
        icon: "restaurant",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living at Sunrise",
        url: "https://www.sunriseseniorliving.com/care-living/assisted-living-at-sunrise",
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care at Sunrise",
        url: "https://www.sunriseseniorliving.com/care-living/alzheimer-dementia-care",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Book a Tour",
        url: "https://www.sunriseseniorliving.com/communities/ut/sunrise-at-holladay",
        icon: "calendar",
      },
    ],
  },
  "788ac237-e02d-45af-b50e-71765b8f097c": buildAbbingtonEnrichment({
    locationName: "The Abbington of Lehi",
    city: "Lehi",
    website: "https://abbingtonseniorliving.com/lehi-ut/",
    phone: "801-768-3900",
    apartmentCount: "85",
    setting: "a convenient location near I-15 and the Silicon Slopes area",
  }),
  "f6f65175-2605-415b-aa2f-8c078a03623f": buildAbbingtonEnrichment({
    locationName: "Abbington Senior Living of Layton",
    city: "Layton",
    website: "https://abbingtonseniorliving.com/layton-utah/",
    phone: "435-281-3500",
    apartmentCount: "113",
    setting: "a Davis County setting close to local shopping, dining, and Layton community amenities",
  }),
  "93886572-073d-4b57-a828-c84b5d9c1cac": buildAbbingtonEnrichment({
    locationName: "The Abbington of Murray",
    city: "Murray",
    website: "https://abbingtonseniorliving.com/murray-utah/",
    phone: "385-289-3700",
    apartmentCount: "103",
    setting: "easy access to the Wasatch Front and Salt Lake City area",
  }),
  "5c24fcc0-d897-411b-8bf9-90a8f2e1356f": buildAbbingtonEnrichment({
    locationName: "The Abbington of St. George",
    city: "St. George",
    website: "https://abbingtonseniorliving.com/st-george-utah/",
    phone: "435-240-8888",
    apartmentCount: "75",
    setting: "warm Southern Utah surroundings near shopping, dining, and outdoor destinations",
  }),
  "4fbc23bc-27d9-4a7b-a78d-3abb0f050b5e": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.thebeaumontassistedliving.com/",
    phone: "801-294-1900",
    fax: "801-298-3265",
    serviceDescription:
      "The Beaumont Assisted Living & Memory Care in Bountiful, Utah, offers assisted living and memory care in a renovated, home-like community with compassionate caregivers, home-cooked meals, engaging activities, entertainment spaces, and comfortable amenities.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/thebeaumontassisted",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/thebeaumontassistedliving/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.thebeaumontassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Home-Cooked Meals",
      "Fitness Facility",
      "Physical Therapy Space",
      "Theater Room",
      "Game Zone",
      "Putting Green",
      "Virtual Golf Course",
      "Pool Table",
      "Indoor Pool",
      "Library",
      "Kid Play Area",
      "Salon",
      "Dog Wash Station",
      "Art Room and Atrium",
      "Bistro",
      "Activities and Social Events",
      "Emergency Preparedness",
      "Certified Caregivers",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Beaumont Website",
        url: "https://www.thebeaumontassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-amenities",
        title: "Amenities",
        url: "https://www.thebeaumontassistedliving.com/amenities/",
        icon: "list",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living Care",
        url: "https://www.thebeaumontassistedliving.com/care-packages/assisted-living-care/",
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.thebeaumontassistedliving.com/care-packages/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.thebeaumontassistedliving.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-floor-plans",
        title: "Community & Floor Plans",
        url: "https://www.thebeaumontassistedliving.com/apartments/community-and-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.thebeaumontassistedliving.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "1e922e47-018a-47c6-a9a8-7cb6c1e86d9a": {
    shortDescription: "Assisted Living / Independent Living",
    website: "https://www.centurypa.com/senior-living/bridge-paradise-valley/",
    phone: "702-369-6964",
    serviceDescription:
      "The Bridge at Paradise Valley in Las Vegas, Nevada, offers independent living and assisted living in a retirement community setting with restaurant-style dining, housekeeping, laundry services, transportation support, activities, and personalized assistance with daily living.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Independent Living",
      "Restaurant-Style Dining",
      "Laundry Services",
      "Housekeeping",
      "Transportation Support",
      "Appointment Assistance",
      "Activities and Social Events",
      "Wellness Programming",
      "Comfortable Common Areas",
      "Personalized Assistance",
      "Support with Activities of Daily Living",
      "Senior Living Apartments",
      "Community Amenities",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Bridge Website",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/assisted-living",
        icon: "heart",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/independent-living",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services & Amenities",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/services-amenities",
        icon: "list",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/floor-plans",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photo Gallery",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/gallery",
        icon: "image",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://www.centurypa.com/senior-living/bridge-paradise-valley/contact-us",
        icon: "calendar",
      },
    ],
  },
  "c07d83aa-681c-4f75-9166-aae518cd4641": {
    shortDescription: "Assisted Living / Short-Term Stays",
    website:
      "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/",
    phone: "801-692-6207",
    serviceDescription:
      "The Charleston at Cedar Hills is an MBK Senior Living assisted living community in Cedar Hills, Utah, offering personalized support, short-term stays, restaurant-style dining, wellness programming, transportation, activities, and comfortable apartment-style living in north-central Utah County.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/MBKSeniorLiving/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/mbkseniorliving/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Short-Term Stays",
      "Restaurant-Style Dining",
      "MBK Cuisine",
      "Mind and Body Wellness",
      "Activities and Classes",
      "Transportation Services",
      "Weekly Housekeeping",
      "Pet Friendly",
      "Beauty Salon and Barber Shop",
      "Theater Room",
      "Bistro",
      "Cozy Library with Fireplace",
      "Raised Flower and Vegetable Boxes",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "24/7 On-Site Care",
      "Low-Maintenance Lifestyle",
      "LDS Living",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Charleston Website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/living-options/assisted-living",
        icon: "heart",
      },
      {
        id: "resource-short-term-stays",
        title: "Short-Term Stays",
        url: "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/living-options/short-term-stays",
        icon: "calendar",
      },
      {
        id: "resource-community",
        title: "Community & Amenities",
        url: "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/our-community",
        icon: "list",
      },
      {
        id: "resource-programs",
        title: "Signature Programs",
        url: "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/signature-programs",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.mbkseniorliving.com/senior-living/ut/cedar-hills/the-charleston-at-cedar-hills/schedule-a-tour",
        icon: "calendar",
      },
    ],
  },
  "af4798a0-a68d-4cf7-968e-f147fdfd0a79": buildGablesEnrichment({
    locationName: "The Gables of Brigham City",
    city: "Brigham City",
    website:
      "https://www.thegablesfamily.com/locations/brigham-city-assisted-living-memory-care/",
    phone: "435-239-8780",
  }),
  "bcc40d8e-6bc9-461f-9e72-ccc2ec22a633": buildGablesEnrichment({
    locationName: "The Gables of North Logan",
    city: "North Logan",
    website: "https://www.thegablesfamily.com/locations/logan-assisted-living/",
    phone: "435-258-8828",
  }),
  "e2026f2d-d990-477a-923e-8d67893661b2": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://thelakesseniorliving.com/",
    phone: "702-904-1322",
    serviceDescription:
      "The Lakes Senior Living is a family-owned senior living residential care home in Las Vegas, Nevada, offering memory care and assisted living support in a licensed 9-bed, family-like setting with 24/7 care, personal assistance, home-cooked meals, housekeeping, laundry, and short- or long-term stay options.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://thelakesseniorliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Licensed 9-Bed Facility",
      "Family-Owned Care Home",
      "Care and Supervision 24/7",
      "Assistance with Activities of Daily Living",
      "Dressing and Bathing Assistance",
      "Medication Management",
      "Medication and Oxygen Assistance",
      "Home-Cooked Meals",
      "Specialized Diets",
      "Housekeeping and Laundry Services",
      "Private Rooms",
      "Semi-Private Rooms",
      "Non-Ambulatory Services",
      "Beauty Services",
      "Specialized Activities and Therapies",
      "Short-Term Stay",
      "Long-Term Stay",
      "Virtual Tour Available",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Lakes Senior Living Website",
        url: "https://thelakesseniorliving.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://thelakesseniorliving.com/#services",
        icon: "list",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://thelakesseniorliving.com/#virtual-tour",
        icon: "video",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://thelakesseniorliving.com/#gallery",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact The Lakes",
        url: "https://thelakesseniorliving.com/#contact",
        icon: "calendar",
      },
    ],
  },
  "548a176d-4e84-4e0e-9043-9b7c20bda0f9": {
    shortDescription: "Assisted Living",
    phone: "801-254-9800",
    serviceDescription:
      "The Lodge at Jordan River Assisted Living is a South Jordan, Utah, assisted living community offering residential senior care, supportive services, meals, activities, and a comfortable community setting near the Jordan River area.",
    amenities: [
      "Assisted Living",
      "Residential Senior Care",
      "Daily Meals",
      "Activities",
      "Housekeeping Services",
      "Support Staff",
      "Medication Support",
      "Personal Care Support",
      "Comfortable Community Setting",
      "South Jordan Location",
    ],
    resources: [
      {
        id: "resource-carelistings",
        title: "Facility Directory Listing",
        url: "https://www.carelistings.com/assisted-living-homes/south-jordan-ut/the-lodge-at-jordan-river/5acd032ca71d8c15cf68c411",
        icon: "document",
      },
    ],
  },
  "56e680dc-5e88-4323-a5d7-ec05752680a1": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.thelodgeatriverton.com/",
    phone: "801-254-8000",
    fax: "801-254-0087",
    serviceDescription:
      "The Lodge at Riverton is an assisted living and memory care community in Riverton, Utah, offering personalized care, spacious apartments, dining, activities, caregiver support, a full-service salon, bistro, fitness spaces, theater room, and the In My Shoes memory care program.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.thelodgeatriverton.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Three Meals Daily",
      "24-Hour Care",
      "Medication Administration",
      "Wellness Checks by RN",
      "Scheduled Transportation",
      "Housekeeping and Linen Service",
      "Laundry Service",
      "Full-Service Salon",
      "Bistro and Library",
      "Exercise Room",
      "Theater Room",
      "Private Dining Room",
      "Outdoor Courtyard",
      "Emergency Call System",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "In My Shoes Memory Care Program",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Lodge at Riverton Website",
        url: "https://www.thelodgeatriverton.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.thelodgeatriverton.com/assisted-living/",
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.thelodgeatriverton.com/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.thelodgeatriverton.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://www.thelodgeatriverton.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.thelodgeatriverton.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "448cd2d0-31ae-47dc-8124-4d4c7e2010ff": {
    shortDescription: "Memory Care",
    website: "https://www.monarchseniorliving.com/monarch-henderson/",
    phone: "702-899-8028",
    serviceDescription:
      "The Monarch at Henderson is a memory care community in Henderson, Nevada, supporting residents with Alzheimer's, dementia, and other memory-related conditions through personalized care, Valeo Memory Care programming, wellness-focused services, scheduled transportation, engaging activities, and supportive apartment living.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.monarchseniorliving.com/monarch-henderson/",
      },
    ],
    amenities: [
      "Memory Care",
      "Alzheimer's and Dementia Care",
      "Valeo Memory Care Program",
      "Personalized Care Plans",
      "Wellness-Centered Programming",
      "Physical Wellness Activities",
      "Social Engagement",
      "Intellectual Activities",
      "Spiritual Support",
      "Scheduled Transportation",
      "Cultural Events and Programs",
      "On-Site Amenities",
      "Personalized Services",
      "Comfortable Apartments",
      "Family Resources",
      "Memory Care Resources",
      "Supportive Environment",
      "Secure Structured Care",
      "Purpose-Driven Days",
      "Henderson Location",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Monarch at Henderson Website",
        url: "https://www.monarchseniorliving.com/monarch-henderson/",
        icon: "home",
      },
      {
        id: "resource-community",
        title: "Our Community",
        url: "https://www.monarchseniorliving.com/monarch-henderson/our-community/",
        icon: "building",
      },
      {
        id: "resource-memory-care",
        title: "Valeo Memory Care",
        url: "https://www.monarchseniorliving.com/monarch-henderson/valeo-memory-care/",
        icon: "heart",
      },
      {
        id: "resource-events",
        title: "Events",
        url: "https://www.monarchseniorliving.com/monarch-henderson/events/",
        icon: "calendar",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://henderson.monarchseniorliving.com/schedule-a-visit/",
        icon: "calendar",
      },
      {
        id: "resource-contact",
        title: "Contact The Monarch",
        url: "https://www.monarchseniorliving.com/monarch-henderson/contact-us/",
        icon: "document",
      },
    ],
  },
  "39a69691-a8c5-4249-9fef-0067949261f7": {
    shortDescription: "Memory Care / Assisted Living",
    website: "https://quailseniorcarehome.com/",
    phone: "702-701-8793",
    serviceDescription:
      "The Quail House is a Las Vegas memory care and assisted living home serving families in the Las Vegas and Henderson areas, offering a boutique 10-bedroom mansion setting with personalized care, meaningful engagement, cognitive enrichment, and a family-style environment for residents with Alzheimer's, dementia, Parkinson's, and related needs.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://quailseniorcarehome.com/",
      },
    ],
    amenities: [
      "Memory Care",
      "Assisted Living",
      "10-Bedroom Mansion Setting",
      "Boutique Residential Care",
      "Personalized Attention",
      "Family-Style Environment",
      "Purposeful Engagement",
      "Cognitive Enrichment",
      "Dementia Support",
      "Alzheimer's Support",
      "Parkinson's Support",
      "Low Caregiver-to-Resident Ratio",
      "Meaningful Connections",
      "Daily Activities",
      "Comfortable Home-Like Setting",
      "Luxury Residential Environment",
      "Private Tour Available",
      "Las Vegas Location",
      "Serves Las Vegas and Henderson Families",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Quail House Website",
        url: "https://quailseniorcarehome.com/",
        icon: "home",
      },
      {
        id: "resource-brochure",
        title: "Quail House Brochure",
        url: "https://quailseniorcarehome.com/wp-content/uploads/2025/04/Quail-Memory-Care-Mansion_Brochure.pdf",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://quailseniorcarehome.com/#contact",
        icon: "calendar",
      },
      {
        id: "resource-map",
        title: "Location",
        url: "https://www.mapquest.com/us/nevada/the-quail-house-425590036",
        icon: "map",
      },
    ],
  },
  "25186de9-94bf-46ef-abcd-9e5abaceb649": buildRetreatEnrichment({
    locationName: "The Retreat at Sunbrook",
    website:
      "https://www.jaybirdseniorliving.com/senior-living/ut/st-george/the-retreat-sunbrook/",
    phone: "435-272-0202",
    neighborhoodDetail: "Sunbrook Neighborhood",
  }),
  "6a715f36-6cc3-4116-bc91-ff4541459b78": buildRetreatEnrichment({
    locationName: "The Retreat at SunRiver",
    website:
      "https://www.jaybirdseniorliving.com/senior-living/ut/st-george/the-retreat-sunriver/",
    phone: "435-256-8900",
    neighborhoodDetail: "SunRiver Neighborhood",
  }),
  "cb4606e2-1884-4b24-b682-8e5210485142": buildRidgeEnrichment({
    locationName: "The Ridge at Cottonwood",
    city: "Holladay",
    website: "https://theridgeseniorliving.com/locations/holladay-ut/",
    phone: "801-947-7400",
  }),
  "3a53a0a2-48ef-484e-b9bb-fe1b7f531126": buildRidgeEnrichment({
    locationName: "The Ridge Foothill",
    city: "Salt Lake City",
    website: "https://theridgeseniorliving.com/locations/salt-lake-city-ut/",
    phone: "801-466-1122",
  }),
  "91871299-adbd-462c-886c-2598871e57e4": {
    shortDescription: "Assisted Living",
    website: "https://thevillasatbaercreek.com/",
    phone: "385-888-9063",
    serviceDescription:
      "The Villas at Baer Creek is an assisted living community in Kaysville, Utah, focused on creating a warm, comfortable, and compassionate home environment with personalized care, supportive staff, meals, services, and a smaller residential setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://thevillasatbaercreek.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Type 2 Assisted Living Facility",
      "16 Licensed Beds",
      "Personal Care Assistance",
      "Medication Management",
      "Supportive Services",
      "Meals",
      "Housekeeping",
      "Laundry Services",
      "Daily Activities",
      "Transportation Arrangement",
      "Comfortable Home Environment",
      "Small Residential Setting",
      "Family-Like Atmosphere",
      "Compassionate Staff",
      "Kaysville Location",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Villas at Baer Creek Website",
        url: "https://thevillasatbaercreek.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://thevillasatbaercreek.com/?page_id=46",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact The Villas",
        url: "https://thevillasatbaercreek.com/?page_id=50",
        icon: "calendar",
      },
      {
        id: "resource-license",
        title: "Facility Listing",
        url: "https://carelistings.com/assisted-living-homes/kaysville-ut/the-villas-at-baer-creek/5acd027ea71d8c15cf694cbe",
        icon: "document",
      },
    ],
  },
  "bab1cdc5-0fa1-426f-b6a8-645f2fdcbd15": {
    shortDescription: "Assisted Living / Short-Term Stays",
    website:
      "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/",
    phone: "801-207-7467",
    serviceDescription:
      "The Wellington is an MBK Senior Living assisted living community in Salt Lake City, Utah, near Holladay and Millcreek, offering personalized support, short-term stays, chef-prepared meals, scheduled transportation, fitness classes, activities, housekeeping, laundry, maintenance, and comfortable studio, one-bedroom, and two-bedroom apartments.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/MBKSeniorLiving/",
      },
      {
        id: "social-instagram",
        platform: "instagram",
        url: "https://www.instagram.com/mbkseniorliving/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Short-Term Stays",
      "Chef-Prepared Meals",
      "Bright Dining Room",
      "Fitness Classes",
      "Social Events",
      "Local Outings",
      "Fitness Center",
      "Art Studio",
      "Bistro",
      "Beauty Salon and Barbershop",
      "Weekly Housekeeping",
      "Laundry and Linen Services",
      "Maintenance Services",
      "Scheduled Transportation",
      "Assistance with Daily Living Tasks",
      "Emergency Response Systems",
      "Pet Friendly",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Wellington Website",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/lifestyle-options/assisted-living",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans & Pricing",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/floor-plans",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Photos & Videos",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/photos-and-videos",
        icon: "image",
      },
      {
        id: "resource-amenities",
        title: "Features & Amenities",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/our-community/features-and-amenities",
        icon: "list",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.mbkseniorliving.com/senior-living/ut/salt-lake-city/the-wellington/contact-us",
        icon: "calendar",
      },
    ],
  },
  "59ff7e40-2949-472d-875c-16ceed1d9f77": {
    shortDescription: "Assisted Living",
    website: "https://www.traditionassistedliving.com/",
    phone: "801-978-2424",
    fax: "801-978-4481",
    serviceDescription:
      "Tradition Assisted Living is a West Valley City, Utah, assisted living community focused on a safe, beautiful, home-like environment with compassionate caregivers, engaging activities, home-style comfort, community events, salon, games area, outdoor spaces, and supportive services for residents and families.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.traditionassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Safe Home-Like Environment",
      "Compassionate Caregivers",
      "WOW Standard of Care",
      "Engaging Activities",
      "Game Nights",
      "Exercise Classes",
      "Cooking Sessions",
      "Workshops",
      "Trips and Outings",
      "Salon",
      "Games Area",
      "Outdoor Spaces",
      "Clean and Comfortable Surroundings",
      "Meals",
      "Supportive Staff",
      "Family Communication",
      "Medication Support",
      "Caregiver Team Culture",
      "West Valley Location",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Tradition Assisted Living Website",
        url: "https://www.traditionassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-apartments",
        title: "Apartments",
        url: "https://www.traditionassistedliving.com/apartments",
        icon: "building",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://www.traditionassistedliving.com/gallery",
        icon: "image",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.traditionassistedliving.com/#schedule-tour",
        icon: "calendar",
      },
      {
        id: "resource-older-site",
        title: "Community Details",
        url: "https://traditionassistedliving.com/",
        icon: "document",
      },
    ],
  },
  "aa52af05-8f5f-4b38-b434-ff4179b5ab75": {
    shortDescription: "Independent Living / Assisted Living / Memory Care",
    website: "https://twinoaksassistedliving.com/",
    phone: "385-500-2090",
    serviceDescription:
      "Twin Oaks Assisted Living and Memory Care is a South Salt Lake, Utah, senior living community offering independent living, assisted living, and memory care with full-service support, daily activities, planned outings, dining, transportation, cleaning, laundry, medication management, and studio, one-bedroom, and two-bedroom apartment options.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://twinoaksassistedliving.com/",
      },
    ],
    amenities: [
      "Independent Living",
      "Assisted Living",
      "Memory Care",
      "24/7 Full-Service Care Staff",
      "Daily Routine Support",
      "Showering Assistance",
      "Dressing and Grooming Assistance",
      "Personal Hygiene Assistance",
      "Medication Management",
      "Cleaning Services",
      "Laundry Services",
      "Transportation",
      "Dining Assistance",
      "Organized Social Outings",
      "Daily Activities",
      "On-Site Dining",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Balcony Options",
      "Apartment Visual Tours",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Twin Oaks Website",
        url: "https://twinoaksassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://twinoaksassistedliving.com/services/assisted-living/",
        icon: "heart",
      },
      {
        id: "resource-independent-living",
        title: "Independent Living",
        url: "https://twinoaksassistedliving.com/services/independent-living/",
        icon: "home",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://twinoaksassistedliving.com/services/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-floor-plans",
        title: "Floor Plans",
        url: "https://twinoaksassistedliving.com/floor-plans/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Book a Tour",
        url: "https://twinoaksassistedliving.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "9d01accc-d9fa-4807-88a0-9dee5fcd7b30": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.valenciacottonwood.com/",
    phone: "801-568-9909",
    serviceDescription:
      "Valencia at Cottonwood Heights is a Cottonwood Heights, Utah, senior living community offering assisted living and memory care services with compassionate care staff, three daily meals, daily activities, dining, body and mind programming, safety systems, and a community setting near Union Park.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.valenciacottonwood.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Compassionate Care Team",
      "60+ Dedicated Staff",
      "8 Daily Activities",
      "3 Daily Meals",
      "Dining Services",
      "Registered Dietician Support",
      "Exercise Programs",
      "Therapy Services",
      "Library",
      "Educational Opportunities",
      "Security and Safety Systems",
      "Round-the-Clock Staffing",
      "Emergency Call Buttons",
      "Beautiful Grounds",
      "Variety of Dining Options",
      "Community Activities",
      "Cottonwood Heights Location",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Valencia Cottonwood Website",
        url: "https://www.valenciacottonwood.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://www.valenciacottonwood.com/#services",
        icon: "list",
      },
      {
        id: "resource-tour",
        title: "Book a Tour",
        url: "https://www.valenciacottonwood.com/service-page/book-a-tour",
        icon: "calendar",
      },
      {
        id: "resource-location",
        title: "Location",
        url: "https://www.valenciacottonwood.com/#location",
        icon: "map",
      },
      {
        id: "resource-license",
        title: "Licensing Details",
        url: "https://assistedlivingmapper.com/utah/cottonwood-heights/the-valencia-at-cottonwood-heights",
        icon: "document",
      },
    ],
  },
  "3aac63b5-f30f-4b75-b915-dbc263d7556f": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.valenciadraper.com/",
    phone: "385-463-3100",
    serviceDescription:
      "Valencia at Draper is a Draper, Utah, assisted living and memory care community offering supportive senior living, tours, care services, dining, transportation, nurse support, private and semi-private rooms, scheduled activities, and a welcoming setting near Lone Peak Hospital.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.valenciadraper.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Private Rooms",
      "Semi-Private Rooms",
      "Nurse on Staff",
      "Scheduled Transportation",
      "Secured Memory Care Unit",
      "Small Pets Welcome",
      "Meals",
      "24-Hour Staff",
      "Incontinence Care",
      "Hospice Support",
      "Medication Support",
      "Activities",
      "Safety and Supportive Environment",
      "Draper Location",
      "Near Lone Peak Hospital",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Valencia Draper Website",
        url: "https://www.valenciadraper.com/",
        icon: "home",
      },
      {
        id: "resource-tour",
        title: "Book a Tour",
        url: "https://www.valenciadraper.com/service-page/book-a-tour",
        icon: "calendar",
      },
      {
        id: "resource-directory",
        title: "Senior Care Details",
        url: "https://www.seniorcare.com/assisted-living/ut/draper/the-valencia-at-draper/41176/",
        icon: "document",
      },
      {
        id: "resource-license-report",
        title: "State Inspection Checklist",
        url: "https://cdn.assistedlivingmagazine.com/wp-content/uploads/UT-reports/106581/20251008-checklist-697407.pdf",
        icon: "document",
      },
    ],
  },
  "28590417-89f0-4d2e-b560-503db7119857": {
    shortDescription: "Assisted Living",
    website: "https://villacourtliving.com/",
    phone: "702-330-4705",
    serviceDescription:
      "Villa Court Assisted Living in Las Vegas, Nevada, offers assisted living and affordable long-term care in a warm, welcoming community with compassionate support, Medicaid guidance, resident activities, pricing information, tours, and Arcadia and Citrine building options.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://villacourtliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Affordable Long-Term Care",
      "Medicaid Support",
      "Arcadia Building",
      "Citrine Building",
      "Pricing Guide",
      "Schedule a Visit",
      "Warm Community Setting",
      "Compassionate Care",
      "Activities",
      "Resident Support",
      "Family Support",
      "Meals",
      "Senior Living Apartments",
      "Convenient Las Vegas Location",
      "Nearby Shopping and Dining",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Villa Court Website",
        url: "https://villacourtliving.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living",
        url: "https://villacourtliving.com/living-options/assisted-living/",
        icon: "heart",
      },
      {
        id: "resource-pricing",
        title: "Pricing Guide",
        url: "https://villacourtliving.com/",
        icon: "document",
      },
      {
        id: "resource-gallery",
        title: "Gallery",
        url: "https://villacourtliving.com/#gallery",
        icon: "image",
      },
      {
        id: "resource-tour",
        title: "Schedule a Visit",
        url: "https://villacourtliving.com/schedule-a-visit/",
        icon: "calendar",
      },
      {
        id: "resource-pennant",
        title: "Pennant Location Page",
        url: "https://pennantgroup.com/locations/villa-court-assisted-living/",
        icon: "document",
      },
    ],
  },
  "b3ecf532-2752-458e-819f-56501a19e687": {
    shortDescription: "Assisted Living",
    website: "https://welcomehomeassistedlivingutah.com/",
    phone: "801-899-2682",
    serviceDescription:
      "Welcome Home Assisted Living in Pleasant Grove, Utah, provides assisted living near American Fork and Utah Lake with a warm home-like setting, 24-hour staff, personalized care, chef-prepared meals, medication assistance, housekeeping, laundry, activities, outings, and support with daily living needs.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://welcomehomeassistedlivingutah.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Type II Assisted Living Facility",
      "50 Resident Capacity",
      "24-Hour Staff",
      "Medication Assistance",
      "Daily Assistance with Bathing and Dressing",
      "Personal Grooming Assistance",
      "Incontinence Care",
      "Chef-Prepared Meals",
      "Housekeeping Services",
      "Laundry Services",
      "Kitchenettes",
      "Hair Salon",
      "Library",
      "Exercise Room",
      "Rehab Facilities",
      "Activities and Outings",
      "Live Entertainment",
      "Outdoor Spaces",
      "Transportation Assistance",
      "Medicaid Accepted",
      "Respite Care Available",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Welcome Home Website",
        url: "https://welcomehomeassistedlivingutah.com/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Contact Welcome Home",
        url: "https://welcomehomeassistedlivingutah.com/contact/",
        icon: "calendar",
      },
      {
        id: "resource-senior-care",
        title: "License & Facility Details",
        url: "https://www.seniorcare.com/assisted-living/ut/pleasant-grove/welcome-home-assisted-living-american-fork/56829/",
        icon: "document",
      },
      {
        id: "resource-amenities",
        title: "Amenities & Payment Options",
        url: "https://www.seniorhomes.com/utah/pleasant-grove/welcome-home-assisted-living",
        icon: "list",
      },
    ],
  },
  "a603612b-0d9e-4c3e-a388-810087035cfa": {
    shortDescription: "Assisted Living / Memory Care",
    website: "https://www.whispercoveassistedliving.com/",
    phone: "801-874-6464",
    fax: "385-278-6025",
    serviceDescription:
      "Whisper Cove Assisted Living and Memory Care in Kaysville, Utah, offers assisted living and memory care in a safe, beautiful, home-like community with SUPER Caregivers, three daily meals, life-enhancing activities, weekly housekeeping, laundry, registered nurse services, wellness checks, scheduled transportation, and emergency call systems.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.whispercoveassistedliving.com/",
      },
    ],
    amenities: [
      "Assisted Living",
      "Memory Care",
      "Three Nutritious Meals",
      "Life-Enhancing Activities",
      "Weekly Laundering of Towels and Sheets",
      "Weekly Housekeeping",
      "Registered Nurse Services",
      "Regular Wellness Checks by Nursing Staff",
      "24-Hour Specially Trained On-Site Staff",
      "Scheduled Transportation",
      "Emergency Call System",
      "All Utilities Paid",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Kitchenettes",
      "Walk-In Closets",
      "Salon",
      "Library",
      "Game Area",
      "Secured Memory Care Courtyard",
      "Pricing Tool",
      "Community and Floor Plans",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Whisper Cove Website",
        url: "https://www.whispercoveassistedliving.com/",
        icon: "home",
      },
      {
        id: "resource-assisted-living",
        title: "Assisted Living Care",
        url: "https://www.whispercoveassistedliving.com/care-packages/assisted-living-care/",
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://www.whispercoveassistedliving.com/care-packages/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-services-fees",
        title: "Services & Fees",
        url: "https://www.whispercoveassistedliving.com/services-and-fees/",
        icon: "document",
      },
      {
        id: "resource-floor-plans",
        title: "Community & Floor Plans",
        url: "https://www.whispercoveassistedliving.com/community-and-floor-plans/",
        icon: "document",
      },
      {
        id: "resource-pricing",
        title: "Pricing Tool",
        url: "https://www.whispercoveassistedliving.com/pricing-tool/",
        icon: "document",
      },
      {
        id: "resource-tour",
        title: "Schedule a Tour",
        url: "https://www.whispercoveassistedliving.com/contact-us/",
        icon: "calendar",
      },
    ],
  },
  "5968bfcb-7f32-4681-bb1b-6cd8771905ea": {
    shortDescription: "Assisted Living / Independent Living",
    website: "https://www.williamsburgretirement.com/",
    phone: "435-753-5502",
    fax: "435-753-5547",
    serviceDescription:
      "Williamsburg Retirement Community in Logan, Utah, offers independent living and assisted living in a home-like community focused on independence, dignity, personal care, quality support, meals, activities, housekeeping, transportation, and affordable studio, one-bedroom, and two-bedroom living options.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.williamsburgretirement.com/",
      },
    ],
    amenities: [
      "Independent Living",
      "Assisted Living",
      "Studio Apartments",
      "One-Bedroom Apartments",
      "Two-Bedroom Apartments",
      "Meals and Meal Options",
      "Housekeeping",
      "Laundry Services",
      "Scheduled Transportation",
      "Activities",
      "Social Programs",
      "Fitness Center",
      "Covered Parking",
      "Guest Parking",
      "Controlled Access",
      "Handicap Access",
      "Wheelchair Accessible",
      "Private Rooms",
      "Respite Care",
      "Short-Term Stay",
      "Small Pets Considered",
      "Medicaid Rates",
      "Medication Reminders",
      "Home-Like Atmosphere",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Williamsburg Website",
        url: "https://www.williamsburgretirement.com/",
        icon: "home",
      },
      {
        id: "resource-seniors-blue-book",
        title: "Amenities & Pricing",
        url: "https://seniorsbluebook.com/senior-housing/williamsburg-retirement-community-logan-ut-2",
        icon: "document",
      },
      {
        id: "resource-contour-care",
        title: "Independent & Assisted Living Details",
        url: "https://contourcare.org/assisted-living/utah/ut-logan-300_n_w-132-williamsburg/",
        icon: "list",
      },
      {
        id: "resource-directions",
        title: "Directions",
        url: "https://www.wellness.com/dir/2955388/nursing-home/ut/logan/williamsburg-retirement-community/directions/132-west-300-north-ofc-logan-ut-84321",
        icon: "map",
      },
    ],
  },
  "f7345bbb-54d7-4438-808f-88a945448d17": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.ahcfacilities.com/las-vegas/",
    phone: "702-967-6100",
    serviceDescription:
      "Advanced Health Care of Las Vegas is a skilled nursing facility specializing in short-term nursing and rehabilitation after a hospital stay, with private deluxe suites, 24-hour nursing care, inpatient rehabilitation, transportation, fine dining, therapy services, and a post-acute recovery environment designed to help patients return home.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ahcfacilities.com/las-vegas/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Post-Acute Recovery",
      "24-Hour Nursing Care",
      "Inpatient Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Deluxe Suites",
      "Private Bathroom and Shower",
      "Adjustable Bed",
      "Pressure-Relieving Mattress",
      "High-Speed Internet Access",
      "Private Phone",
      "Transportation",
      "Fine Dining",
      "On-Staff Chefs and Dieticians",
      "Library",
      "Beauty Salon",
      "Private Dining Room",
      "CMS Rated Facility",
      "Hospital-to-Home Support",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Advanced Health Care of Las Vegas Website",
        url: "https://www.ahcfacilities.com/las-vegas/",
        icon: "home",
      },
      {
        id: "resource-schedule",
        title: "Schedule a Visit",
        url: "https://www.ahcfacilities.com/las-vegas/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-ahc-locations",
        title: "Advanced Health Care Locations",
        url: "https://www.ahcfacilities.com/locations/",
        icon: "building",
      },
    ],
  },
  "2f67db7e-58f8-4a2b-bd74-cf23fbc7816f": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.ahcfacilities.com/salem/",
    phone: "801-754-7200",
    serviceDescription:
      "Advanced Health Care of Salem is a skilled nursing facility specializing in short-term nursing and rehabilitation, offering private suites, 24-hour nursing care, inpatient rehabilitation services, transportation, fine dining, therapy services, and a post-acute recovery setting designed to help patients return home safely.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ahcfacilities.com/salem/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Post-Acute Recovery",
      "16 Certified Beds",
      "Medicare and Medicaid Certified",
      "24-Hour Nursing Care",
      "Inpatient Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Deluxe Suites",
      "Private Bathroom and Shower",
      "Adjustable Bed",
      "Pressure-Relieving Mattress",
      "High-Speed Internet Access",
      "Private Phone",
      "Transportation",
      "Fine Dining",
      "On-Staff Chefs and Dieticians",
      "Library",
      "Beauty Salon",
      "Private Dining Room",
      "Hospital-to-Home Support",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Advanced Health Care of Salem Website",
        url: "https://www.ahcfacilities.com/salem/",
        icon: "home",
      },
      {
        id: "resource-cms-ratings",
        title: "CMS Ratings & Certification",
        url: "https://everlighthealth.org/advanced-health-care-of-salem-salem-ut-465189/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-ahc-locations",
        title: "Advanced Health Care Locations",
        url: "https://www.ahcfacilities.com/locations/",
        icon: "building",
      },
    ],
  },
  "ddb776e5-624d-472a-ad0a-667cc7fdfca5": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.ahcfacilities.com/st-george/",
    phone: "435-522-2100",
    serviceDescription:
      "Advanced Health Care of St. George is a skilled nursing facility specializing in short-term nursing and rehabilitation, offering private suites, licensed nurses on site 24/7, inpatient rehabilitation, transportation, fine dining, therapy services, and a post-acute recovery setting designed to support a return home after hospitalization.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ahcfacilities.com/st-george/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Post-Acute Recovery",
      "24-Hour Nursing Care",
      "Inpatient Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Deluxe Suites",
      "Private Bathroom and Shower",
      "Adjustable Bed",
      "Pressure-Relieving Mattress",
      "Television",
      "Private Phone",
      "High-Speed Internet Access",
      "Transportation",
      "Fine Dining",
      "On-Staff Chefs and Dieticians",
      "Library and Reading Area",
      "Beauty Salon and Barber Shop",
      "Private Dining Room",
      "Courtyard Patio",
      "Hospital-to-Home Support",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Advanced Health Care of St. George Website",
        url: "https://www.ahcfacilities.com/st-george/",
        icon: "home",
      },
      {
        id: "resource-rehab",
        title: "AHC Rehabilitation Services",
        url: "https://www.ahcfacilities.com/rehabilitation/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Contact AHC St. George",
        url: "https://www.ahcfacilities.com/st-george/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-ahc-locations",
        title: "Advanced Health Care Locations",
        url: "https://www.ahcfacilities.com/locations/",
        icon: "building",
      },
    ],
  },
  "d3ee0cc7-6e7f-470e-9364-f07d82e49fac": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.ahcfacilities.com/summerlin/",
    phone: "702-967-6100",
    serviceDescription:
      "Advanced Health Care of Summerlin is a skilled nursing facility specializing in short-term nursing and rehabilitation after a hospital stay, with private suites, 24-hour nursing care, inpatient rehabilitation, transportation, fine dining, therapy services, and post-acute care coordination in the Summerlin area of Las Vegas.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ahcfacilities.com/summerlin/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Post-Acute Recovery",
      "24-Hour Nursing Care",
      "Inpatient Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Deluxe Suites",
      "Private Bathroom and Shower",
      "Adjustable Bed",
      "Pressure-Relieving Mattress",
      "Television",
      "Private Phone",
      "High-Speed Internet Access",
      "Transportation",
      "Fine Dining",
      "On-Staff Chefs and Dieticians",
      "Library",
      "Beauty Salon",
      "Private Dining Room",
      "Insurance Network Partnerships",
      "CMS Rated Facility",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Advanced Health Care of Summerlin Website",
        url: "https://www.ahcfacilities.com/summerlin/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Contact AHC Summerlin",
        url: "https://www.ahcfacilities.com/summerlin/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-insurance-note",
        title: "Hospital & Insurance Network Partners",
        url: "https://www.ahcfacilities.com/summerlin/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-nvhca",
        title: "Nevada Health Care Association Listing",
        url: "https://nvhca.org/find-care/advanced-health-care-of-summerlin/",
        icon: "document",
      },
    ],
  },
  "0265f52f-edea-45ec-8187-97e6d53b93c2": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / 24/7 Skilled Nursing Care",
    website: "https://alpinemeadowrehab.com/",
    phone: "801-972-1050",
    fax: "801-895-7631",
    contactName: "Matt Howard",
    contactRole: "Administrator",
    contactEmail: "taylor@alpinemeadowrehab.com",
    serviceDescription:
      "Alpine Meadow Rehab & Nursing is a Salt Lake City skilled nursing and rehabilitation facility offering short-term care, 24/7 skilled nursing care, private and semi-private suites, physical, occupational, and speech therapy, wound care, hospice care coordination, respite services, daily activities, dining, housekeeping, laundry, salon access, Wi-Fi, gardens, and secure outdoor areas.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://alpinemeadowrehab.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Care",
      "24/7 Skilled Nursing Care",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Specialized Wound Care",
      "Hospice Care Coordination",
      "3 to 5 Day Respite Services",
      "Private Suites",
      "Semi-Private Suites",
      "Private Showers",
      "Daily Recreational and Social Activities",
      "Dining Services",
      "Housekeeping and Laundry",
      "Beauty Salon",
      "Cable and Wi-Fi",
      "Community Garden",
      "Secure Outdoor Space",
      "CMS 5-Star Facility",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Alpine Meadow Website",
        url: "https://alpinemeadowrehab.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Skilled Nursing & Rehab Services",
        url: "https://alpinemeadowrehab.com/services/",
        icon: "heart",
      },
      {
        id: "resource-admissions",
        title: "Admissions Information",
        url: "https://alpinemeadowrehab.com/admissions/",
        icon: "calendar",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://alpinemeadowrehab.com/virtual-tour/",
        icon: "video",
      },
      {
        id: "resource-contact",
        title: "Contact Alpine Meadow",
        url: "https://alpinemeadowrehab.com/contact/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "074942e9-eb14-455f-a1d4-57dd6a122f62": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.ahcfacilities.com/utah-valley/",
    phone: "801-724-6500",
    contactName: "Aspen Ridge of Utah Valley",
    contactRole: "Admissions",
    serviceDescription:
      "Aspen Ridge of Utah Valley is a post-acute skilled nursing and rehabilitation facility in Orem, Utah, specializing in short-term nursing and rehabilitation after a hospital stay. The community offers private deluxe suites, 24-hour nursing care, inpatient rehabilitation, transportation, fine dining, therapy services, private bathrooms, high-speed internet access, a library, beauty salon, private dining room, and a comfort-focused recovery setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ahcfacilities.com/utah-valley/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Post-Acute Recovery",
      "24-Hour Nursing Care",
      "Inpatient Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Deluxe Suites",
      "Private Bathroom and Shower",
      "Adjustable Bed",
      "Pressure-Relieving Mattress",
      "Television",
      "Private Phone",
      "High-Speed Internet Access",
      "Transportation",
      "Fine Dining",
      "On-Staff Chefs and Dieticians",
      "Library",
      "Beauty Salon",
      "Private Dining Room",
      "Cozy Fireplace",
      "Hospital-to-Home Support",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Aspen Ridge of Utah Valley Website",
        url: "https://www.ahcfacilities.com/utah-valley/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Schedule a Visit",
        url: "https://www.ahcfacilities.com/utah-valley/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-payment-methods",
        title: "Payment Methods & Insurance Options",
        url: "https://seniorsbluebook.com/senior-housing/aspen-ridge-of-utah-valley-orem-ut",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-ahc-locations",
        title: "Advanced Health Care Locations",
        url: "https://www.ahcfacilities.com/locations/",
        icon: "building",
      },
    ],
  },
  "5fb371c6-38f2-4f0f-8fa1-30b34d3870d8": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.ahcfacilities.com/aspen-ridge-transitional-rehab/",
    phone: "801-713-3100",
    fax: "801-713-3150",
    contactName: "Aspen Ridge Transitional Rehab",
    contactRole: "Admissions",
    serviceDescription:
      "Aspen Ridge Transitional Rehab is a state-of-the-art skilled nursing and rehabilitation facility in Murray, Utah, specializing in short-term nursing and rehabilitation after a hospital stay. The facility offers private deluxe suites, 24-hour nursing care, inpatient rehabilitation, transportation, fine dining, therapy services, private bathrooms and showers, high-speed internet access, a library, beauty salon, private dining room, cozy fireplace, and a post-acute recovery setting designed to help patients return home.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ahcfacilities.com/aspen-ridge-transitional-rehab/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Post-Acute Recovery",
      "24-Hour Nursing Care",
      "Inpatient Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Deluxe Suites",
      "Private Bathroom and Shower",
      "Adjustable Bed",
      "Pressure-Relieving Mattress",
      "Television",
      "Private Phone",
      "High-Speed Internet Access",
      "Transportation",
      "Fine Dining",
      "On-Staff Chefs and Dieticians",
      "Library",
      "Beauty Salon",
      "Private Dining Room",
      "Cozy Fireplace",
      "38 Certified Beds",
      "CMS 5-Star Facility",
      "Hospital-to-Home Support",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Aspen Ridge Transitional Rehab Website",
        url: "https://www.ahcfacilities.com/aspen-ridge-transitional-rehab/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Schedule a Visit",
        url: "https://www.ahcfacilities.com/aspen-ridge-transitional-rehab/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-cms-rating",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465159",
        icon: "document",
      },
      {
        id: "resource-uthca",
        title: "Utah Health Care Association Listing",
        url: "https://uthca.org/find-a-facility/aspen-ridge-transitional-rehab",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-ahc-locations",
        title: "Advanced Health Care Locations",
        url: "https://www.ahcfacilities.com/locations/",
        icon: "building",
      },
    ],
  },
  "74dae1b4-69ed-4bf5-a28b-1d0e89389ea0": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.ahcfacilities.com/rehabilitation-facilities/aspen-ridge-west/",
    phone: "801-713-3200",
    fax: "801-713-3250",
    contactName: "Melissa Lozano",
    contactRole: "Admissions Coordinator",
    contactEmail: "mlozano@ahcfacilities.com",
    serviceDescription:
      "Aspen Ridge West Transitional Rehab is a state-of-the-art skilled nursing and rehabilitation facility in Murray, Utah, specializing in short-term nursing and rehabilitation after a hospital stay. The facility offers private suites, 24-hour nursing care, inpatient rehabilitation services, transportation, fine dining, therapy services, and a comfortable post-acute recovery atmosphere.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.ahcfacilities.com/rehabilitation-facilities/aspen-ridge-west/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Post-Acute Recovery",
      "24-Hour Nursing Care",
      "Inpatient Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Suites",
      "Private Bathroom and Shower",
      "Adjustable Bed",
      "Pressure-Relieving Mattress",
      "Television",
      "Private Phone",
      "High-Speed Internet Access",
      "Transportation",
      "Fine Dining",
      "On-Staff Chefs and Dieticians",
      "Private Dining Room",
      "Hospital-to-Home Support",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Aspen Ridge West Website",
        url: "https://www.ahcfacilities.com/rehabilitation-facilities/aspen-ridge-west/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Schedule a Visit",
        url: "https://www.ahcfacilities.com/rehabilitation-facilities/aspen-ridge-west/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Select Health, Medicare, BCBS & More",
        url: "https://www.ahcfacilities.com/rehabilitation-facilities/aspen-ridge-west/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
      {
        id: "resource-ahc-locations",
        title: "Advanced Health Care Locations",
        url: "https://www.ahcfacilities.com/locations/",
        icon: "building",
      },
    ],
  },
  "c7591d4d-40bd-4992-8413-50a385c45b84": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    phone: "435-688-1207",
    fax: "435-634-5546",
    contactName: "Carisa Archuleta",
    contactRole: "Admissions Coordinator",
    contactPhone: "435-688-1207",
    contactEmail: "carisa@bellaterranursing.com",
    serviceDescription:
      "Bella Terra of St George is a skilled nursing and rehabilitation facility offering personalized therapy, short-term rehabilitation, long-term care, Neuro-IFRAH and lymphedema therapy, activities, and resident-centered support. The in-house therapy team focuses on healing, recovery, and overall well-being while helping residents stay active, engaged, and supported.",
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "In-House Therapy Team",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Neuro-IFRAH Therapy",
      "Lymphedema Therapy",
      "Personalized Care Plans",
      "Resident Activities",
      "Recovery Support",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
    ],
    resources: [
      {
        id: "resource-seniors-blue-book",
        title: "Bella Terra Senior Care Profile",
        url: "https://seniorsbluebook.com/senior-housing/bella-terra-of-st-george-st-george-ut",
        icon: "home",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare & Utah Medicaid",
        url: "https://seniorsbluebook.com/senior-housing/bella-terra-of-st-george-st-george-ut",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465152",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "161eca89-b099-43f4-a43a-c96b797861ef": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://canyonvistapostacute.com/",
    phone: "702-541-6200",
    fax: "702-209-3122",
    contactName: "Quinton Locklear",
    contactRole: "Admissions",
    contactPhone: "702-541-6200",
    contactEmail: "quinton.locklear@canyonvistapostacute.com",
    serviceDescription:
      "Canyon Vista Post Acute is a Las Vegas skilled nursing and rehabilitation facility offering short-term rehabilitation, long-term care, skilled nursing, respite care, private rooms, rehabilitation services, state-of-the-art equipment, private bathrooms with showers, expansive common areas, and activities that support residents' social and emotional well-being.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://canyonvistapostacute.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Skilled Nursing",
      "Rehabilitation Services",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Respite Care",
      "Private Rooms",
      "Private Bathrooms with Showers",
      "State-of-the-Art Equipment",
      "Expansive Common Areas",
      "Resident Activities",
      "24/7 Admissions Support",
      "Medicare Accepted",
      "Aetna Accepted",
      "Humana Accepted",
      "Select Health Accepted",
      "United HealthCare Accepted",
      "Optum Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Canyon Vista Website",
        url: "https://canyonvistapostacute.com/",
        icon: "home",
      },
      {
        id: "resource-nursing",
        title: "Nursing Services",
        url: "https://canyonvistapostacute.com/nursing-services/",
        icon: "heart",
      },
      {
        id: "resource-rehab",
        title: "Rehabilitation Services",
        url: "https://canyonvistapostacute.com/rehabilitation-services/",
        icon: "list",
      },
      {
        id: "resource-photos",
        title: "Photos",
        url: "https://canyonvistapostacute.com/photos/",
        icon: "image",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Aetna, Humana, Medicare, UHC & More",
        url: "https://canyonvistapostacute.com/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Canyon Vista",
        url: "https://canyonvistapostacute.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "6aad87fe-5a65-42ed-98aa-f1b6b13966fb": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://orchardparkrehab.com/",
    phone: "801-224-0921",
    fax: "801-224-7642",
    contactName: "Nate Hoffman",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-224-0921",
    contactEmail: "admissions@orchardparkrehab.com",
    serviceDescription:
      "Cascades at Orchard Park is an Orem skilled nursing and rehabilitation facility offering state-of-the-art rehabilitation services, short-term rehab after a hospital stay, long-term care for disability or chronic illness, private therapy recovery suites, 24/7 skilled nursing, physical, occupational, and speech therapy, restaurant-style meals, community living spaces, and engaging activities.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://orchardparkrehab.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "24/7 Skilled Nursing",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "1,600 Square Foot Therapy Gym",
      "Intensive Therapy Program",
      "Private Therapy Recovery Suites",
      "Large Private and Semi-Private Rooms",
      "Restaurant-Style Meals",
      "Community Living Spaces",
      "Engaging Community Activities",
      "Post-Orthopedic Surgery Care",
      "Cardiac Care",
      "Diabetes Care",
      "IV Therapy",
      "Wound Care",
      "Medication Management",
      "Tracheostomy Care",
      "Hospice and Respite Care",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Private Insurance Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Cascades at Orchard Park Website",
        url: "https://orchardparkrehab.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Rehabilitation & Nursing Services",
        url: "https://orchardparkrehab.com/",
        icon: "heart",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Aetna, Medicare, Medicaid, UHC & More",
        url: "https://seniorsbluebook.com/senior-housing/the-cascades-at-orchard-park-orem-ut",
        icon: "document",
      },
      {
        id: "resource-payment-methods",
        title: "Payment Methods & Care Details",
        url: "https://seniorsbluebook.com/senior-housing/the-cascades-at-orchard-park-orem-ut",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465090",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "5c3c9ae4-1d07-46cd-8af0-5a9ad8c3bbdb": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://cascadesatriverwalk.com/",
    phone: "801-565-0800",
    fax: "801-566-8300",
    contactName: "Kim Sanchez",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-565-0800",
    contactEmail: "radmissions@cascadesrehab.com",
    serviceDescription:
      "Cascades at Riverwalk is a Midvale nursing and post-acute rehabilitation facility focused on short-term rehab, long-term care, skilled nursing, and quality recovery support. The community offers therapy services, nursing care, comfortable rooms, resident activities, admissions support, and a welcoming rehabilitation setting near the Jordan River.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://cascadesatriverwalk.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Post-Acute Rehabilitation",
      "24/7 Skilled Nursing",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private and Semi-Private Rooms",
      "Resident Activities",
      "Therapy Gym",
      "Restaurant-Style Dining",
      "Admissions Support",
      "CMS Quality-Rated Facility",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Aetna Accepted",
      "Humana Accepted",
      "Select Health Accepted",
      "United HealthCare Accepted",
      "BCBS Accepted",
      "Cigna Accepted",
      "DMBA Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Cascades at Riverwalk Website",
        url: "https://cascadesatriverwalk.com/",
        icon: "home",
      },
      {
        id: "resource-admissions",
        title: "Admissions",
        url: "https://cascadesatriverwalk.com/admissions/",
        icon: "calendar",
      },
      {
        id: "resource-virtual-tour",
        title: "Virtual Tour",
        url: "https://cascadesatriverwalk.com/virtual-tour/",
        icon: "video",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Medicaid, Aetna, UHC & More",
        url: "https://cascadesatriverwalk.com/",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465184",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "ae6cdb64-cb2f-4355-9c1f-fee4e4cb8f67": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://cedarhealthandrehab.com/",
    phone: "435-586-6481",
    fax: "435-586-0363",
    contactName: "Cindee Backus",
    contactRole: "Admissions Coordinator",
    contactPhone: "435-467-3456",
    contactEmail: "cbackus@ensignservices.net",
    serviceDescription:
      "Cedar Health & Rehabilitation is a Cedar City skilled nursing and rehabilitation facility offering short-term rehabilitation, long-term care, in-house therapy, skilled nursing, activities, private and semi-private rooms, nutritious meals, housekeeping, laundry services, and beautifully landscaped grounds. The care team works with residents, families, and healthcare providers to create comprehensive care and treatment plans.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://cedarhealthandrehab.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Skilled Nursing",
      "120 Beds",
      "Private Rooms",
      "Semi-Private Rooms",
      "Resident Activities",
      "Nutritious Menus",
      "Housekeeping Services",
      "Laundry Services",
      "Beautifully Landscaped Grounds",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Major Insurance Accepted",
      "Veterans Affairs Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Cedar Health Website",
        url: "https://cedarhealthandrehab.com/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Contact Cedar Health",
        url: "https://cedarhealthandrehab.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Medicaid, VA & Major Plans",
        url: "https://cedarhealthandrehab.com/contact-us/",
        icon: "document",
      },
      {
        id: "resource-seniors-blue-book",
        title: "Senior Care Profile",
        url: "https://seniorsbluebook.com/senior-housing/cedar-health-and-rehabilitation",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.seniorcare.com/nursing-homes/ut/cedar-city/cedar-health-and-rehabilitation/465143/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "cb905c98-a1c6-4d30-b681-983ed80d0daf": {
    shortDescription: "Skilled Nursing Facility / Rehab / Memory Care",
    website: "https://avalonhealthcare.com/payson/",
    phone: "801-465-5400",
    fax: "801-465-4872",
    contactName: "Central Utah Veterans Home",
    contactRole: "Admissions",
    contactPhone: "801-465-5400",
    contactEmail: "",
    serviceDescription:
      "Mervyn Sharp Bennion Central Utah Veterans Home in Payson provides post-acute rehabilitation, extended skilled nursing care, specialized memory care, and long-term care for eligible U.S. Veterans, spouses of active duty Veterans, and Gold Star Parents. The community offers a home-like setting with private rooms, daily recreational, cultural, and social activities, skilled nursing support, and care designed to honor Veteran residents and their families.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://avalonhealthcare.com/payson/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Post-Acute Rehabilitation",
      "Extended Skilled Nursing Care",
      "Long-Term Care",
      "Specialized Memory Care",
      "Veteran-Focused Care",
      "Private Rooms",
      "Private Bathrooms and Showers",
      "Home-Like Communities",
      "Kitchen and Dining Areas",
      "Living Room Spaces",
      "Daily Recreational Activities",
      "Cultural and Social Activities",
      "Respite Care",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Medicare Accepted",
      "Medicaid Accepted",
      "Veterans Administration Payment Options",
      "CMS 5-Star Facility",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Central Utah Veterans Home Website",
        url: "https://avalonhealthcare.com/payson/",
        icon: "home",
      },
      {
        id: "resource-utah-veterans-home",
        title: "Utah Veterans Homes Information",
        url: "https://veterans.utah.gov/veterans-homes/",
        icon: "document",
      },
      {
        id: "resource-payment-methods",
        title: "Payment Methods: VA, Medicare, Medicaid & More",
        url: "https://seniorsbluebook.com/senior-housing/Mervyn-Sharp-Bennion-central-utah-veterans-home-payson-ut",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465181",
        icon: "document",
      },
      {
        id: "resource-uthca",
        title: "Utah Health Care Association Listing",
        url: "https://uthca.org/find-a-facility/mervyn-sharp-bennion-veterans-home",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "793ed839-4e9e-4c0e-a339-9b7b811939d6": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://citycreekpostacute.com/",
    phone: "801-322-5521",
    fax: "385-323-3446",
    contactName: "Austin Kincaid",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-574-4770",
    contactEmail: "akincaid@ensignservices.net",
    serviceDescription:
      "City Creek Post Acute is a Salt Lake City skilled nursing and post-acute rehabilitation facility focused on short-term rehabilitation and long-term care. The care team works with residents, families, and healthcare providers to create comprehensive treatment plans, with 24-hour nursing care, in-house therapy, skilled nursing, activities, and support designed to help residents regain strength, mobility, and confidence.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://citycreekpostacute.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Post-Acute Rehabilitation",
      "24-Hour Nursing Care",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Skilled Nursing",
      "Wound Care",
      "Diabetic and Dietary Management",
      "Restorative Nursing",
      "Resident Activities",
      "Personalized Care Plans",
      "108 Beds",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Medicare Advantage Accepted",
      "Aetna Accepted",
      "Humana Accepted",
      "Select Health Accepted",
      "United HealthCare Accepted",
      "BCBS Accepted",
      "VA Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "City Creek Post Acute Website",
        url: "https://citycreekpostacute.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Nursing & Therapy Services",
        url: "https://citycreekpostacute.com/",
        icon: "heart",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Medicaid, Aetna, UHC & More",
        url: "https://citycreekpostacute.com/",
        icon: "document",
      },
      {
        id: "resource-uthca",
        title: "Utah Health Care Association Listing",
        url: "https://uthca.org/find-a-facility/city-creek-post-acute",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465072",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "1de3f7ef-fbee-4a56-9820-26562f15d802": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://copperridgehealth.com/",
    phone: "801-280-2273",
    fax: "801-280-2285",
    contactName: "Lindsay Frederickson",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-834-7923",
    contactEmail: "lfreshendricks@ensignservices.net",
    serviceDescription:
      "Copper Ridge Health Care is a West Jordan skilled nursing and rehabilitation facility offering short-term rehabilitation, long-term care, skilled nursing, therapy services, resident activities, outings, games, socials, and a modern care center setting west of Bangerter Highway near Jordan Valley Medical Center.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://copperridgehealth.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Skilled Nursing",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Resident Activities",
      "Resident-Led Cooking Clubs",
      "Outings",
      "Games and Socials",
      "Modern Care Center",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Aetna Accepted",
      "Humana Accepted",
      "Select Health Accepted",
      "United HealthCare Accepted",
      "BCBS Accepted",
      "Cigna Accepted",
      "Molina Accepted",
      "Optum Accepted",
      "PEHP Accepted",
      "DMBA Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Copper Ridge Website",
        url: "https://copperridgehealth.com/",
        icon: "home",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing",
        url: "https://copperridgehealth.com/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-stay-active",
        title: "Resident Activities",
        url: "https://copperridgehealth.com/stay-active/",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact Copper Ridge",
        url: "https://copperridgehealth.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Medicaid, Aetna, UHC & More",
        url: "https://copperridgehealth.com/contact-us/",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465108",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "e7bb58b7-3ca0-4ed6-8ff7-2b1bc998b104": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Respiratory Care",
    website: "https://coraldesertrehabilitation.com/",
    phone: "435-674-5195",
    fax: "855-215-3565",
    contactName: "Cam Gray",
    contactRole: "Admissions Coordinator",
    contactPhone: "435-674-5195",
    contactEmail: "cagray@ensignservices.net",
    serviceDescription:
      "Coral Desert Rehabilitation of St. George is a five-star skilled nursing and rehabilitation facility offering premier short-term rehabilitation, skilled nursing, in-house therapy, respiratory care, tracheotomy and ventilator support, 7-days-per-week therapy, aqua pool therapy, nutritious menus, private rooms, private bathrooms and showers, activities, and care planning with each resident, family, and healthcare provider.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://coraldesertrehabilitation.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Premier Short-Term Rehabilitation",
      "Respiratory Unit",
      "Tracheotomy Care",
      "Ventilator Support",
      "In-House Therapy",
      "7 Days Per Week Therapy",
      "Aqua Pool Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Skilled Nursing",
      "60 Private Rooms",
      "Private Bathrooms and Showers",
      "Nutritious Menus",
      "Resident Activities",
      "Medicare Accepted",
      "Major Insurance Accepted",
      "Aetna Accepted",
      "Medicare Advantage Accepted",
      "Utah Medicaid Accepted",
      "VA Accepted",
      "Workers Comp Accepted",
      "CMS 5-Star Facility",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Coral Desert Website",
        url: "https://coraldesertrehabilitation.com/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Contact Coral Desert",
        url: "https://coraldesertrehabilitation.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare & Major Insurance Plans",
        url: "https://coraldesertrehabilitation.com/contact-us/",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465160",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "70cbf8c4-3455-4e52-b5a2-91c6ee661b85": {
    shortDescription: "Skilled Nursing Facility / Transitional Rehab",
    website: "https://rmcare.com/locations/cottage-on-vine/",
    streetAddress: "835 East Vine Street",
    phone: "801-414-0602",
    fax: "801-693-3892",
    contactName: "Jeffrey Baker",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-414-0602",
    contactEmail: "jeffrey.baker@rmcare.com",
    serviceDescription:
      "Cottage on Vine Transitional Rehab is a Rocky Mountain Care skilled nursing and transitional rehabilitation community in Murray, Utah. The community provides post-acute rehabilitation, skilled nursing care, therapy support, and superior care for patients of all ages and walks of life in a comfortable recovery setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://rmcare.com/locations/cottage-on-vine/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Transitional Rehabilitation",
      "Post-Acute Rehabilitation",
      "Short-Term Rehabilitation",
      "Skilled Nursing Care",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Therapy Support",
      "Comfortable Recovery Setting",
      "126 Beds",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Molina Accepted",
      "Humana Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Cottage on Vine Website",
        url: "https://rmcare.com/locations/cottage-on-vine/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Contact Cottage on Vine",
        url: "https://rmcare.com/locations/cottage-on-vine/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Medicaid, Molina & Humana",
        url: "https://rmcare.com/locations/cottage-on-vine/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "0e2e3cd8-e024-4a85-b15a-405434a72f40": {
    shortDescription: "Skilled Nursing Facility / Rehab / Long-Term Care",
    website: "http://crestwoodcarecenter.com/",
    phone: "801-627-2273",
    fax: "888-392-7461",
    contactName: "Forrest Pearce",
    contactRole: "Admissions",
    contactPhone: "801-627-2273",
    contactEmail: "forrest@crestwoodcarecenter.com",
    serviceDescription:
      "Crestwood Rehabilitation & Nursing in Ogden provides skilled nursing, rehabilitation, personal care, restorative services, medication and pain management, nutritional meals, housekeeping, laundry, transportation, social activities, and therapy services including physical, occupational, and speech therapy. The care team builds individualized plans for short-term rehabilitation and longer-term care needs.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "http://crestwoodcarecenter.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "24-Hour Nursing Services",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Restorative Services",
      "Medication Management",
      "Pain Management",
      "Nutritional Meals",
      "Personal Care Services",
      "Housekeeping",
      "Laundry Services",
      "Transportation",
      "Social Activities",
      "Dentistry",
      "Podiatry",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Crestwood Website",
        url: "http://crestwoodcarecenter.com/",
        icon: "home",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare & Utah Medicaid",
        url: "https://www.healthcare4ppl.com/nursing-home/utah/ogden/crestwood-rehabilitation-and-nursing-465083.html",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Facility Details",
        url: "https://www.healthcare4ppl.com/nursing-home/utah/ogden/crestwood-rehabilitation-and-nursing-465083.html",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "d7596332-9a97-46fe-80f3-910808fc821f": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://drapercare.com/",
    phone: "801-571-2704",
    fax: false,
    contactName: "Draper Rehabilitation & Care Center",
    contactRole: "Admissions",
    contactPhone: "801-571-2704",
    contactEmail: "contact-DraperRehab@ensignservices.net",
    serviceDescription:
      "Draper Rehabilitation & Care Center is a modern skilled nursing facility in Draper, Utah, offering short-term rehabilitation, long-term care, in-house therapy, skilled nursing, private and semi-private rooms, activities, nutritious menus, housekeeping, laundry services, and beautifully landscaped grounds near Draper Historic Park.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://drapercare.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Skilled Nursing",
      "93 Beds",
      "Private Rooms",
      "Semi-Private Rooms",
      "Activities Program",
      "Nutritious Menus",
      "Housekeeping Services",
      "Laundry Services",
      "Beautifully Landscaped Grounds",
      "Medicaid Accepted",
      "Medicare Accepted",
      "Major Insurance Accepted",
      "Medicare.gov 4-Star Overall Rating",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Draper Rehab Website",
        url: "https://drapercare.com/",
        icon: "home",
      },
      {
        id: "resource-contact",
        title: "Contact Draper Rehab",
        url: "https://drapercare.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicaid, Medicare & Major Insurance",
        url: "https://drapercare.com/contact-us/",
        icon: "document",
      },
      {
        id: "resource-uthca",
        title: "Utah Health Care Association Listing",
        url: "https://uthca.org/find-a-facility/draper-rehab-care-center",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465091",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "f3ac1be0-00b4-471a-83d9-9624e278a549": {
    shortDescription: "Skilled Nursing Facility / Post-Acute Care / Short-Term Rehab",
    website: "https://www.generationsllc.com/communities/fairfield-village/post-acute-care/",
    phone: "801-876-1611",
    fax: "801-927-6235",
    contactName: "Robyn Marquez",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-807-0113",
    contactEmail: "rmarquez@fairfieldvillagelayton.com",
    serviceDescription:
      "Fairfield Village Post Acute Care in Layton provides around-the-clock licensed nursing care, post-acute care, short-term rehabilitation, and longer-term stay support in a tranquil senior living community. The specialized rehabilitation team builds individualized treatment plans and supports recovery with on-site therapy, 7-day admissions, IV therapy, wound care, cardiac condition management, orthopedic and joint replacement rehab, post-stroke rehab, respiratory therapy, and diabetic management.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.generationsllc.com/communities/fairfield-village/post-acute-care/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Post-Acute Care",
      "Short-Term Rehabilitation",
      "Longer-Term Stay Support",
      "Around-the-Clock Licensed Nursing Care",
      "Therapy up to 7 Days Per Week",
      "On-Site Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Private Rooms Available",
      "In-Room Dining Option",
      "7 Day Admissions",
      "IV Therapy",
      "Wound Vacs",
      "Cardiac Condition Management",
      "Orthopedic and Joint Replacement Rehabilitation",
      "Post-Stroke Rehabilitation",
      "Respiratory Therapist On-Site",
      "Diabetic Management",
      "Physician Services On-Site",
      "Medicare Accepted",
      "Medicare Advantage Accepted",
      "Aetna Accepted",
      "Select Health Accepted",
      "United HealthCare Accepted",
      "BCBS Accepted",
      "Workers Comp Accepted",
      "TriCare Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Fairfield Post-Acute Care Website",
        url: "https://www.generationsllc.com/communities/fairfield-village/post-acute-care/",
        icon: "home",
      },
      {
        id: "resource-post-acute-services",
        title: "Post-Acute Care Services",
        url: "https://www.generationsllc.com/living-options/post-acute-care/",
        icon: "heart",
      },
      {
        id: "resource-contact",
        title: "Contact Fairfield Village",
        url: "https://www.generationsllc.com/communities/fairfield-village/post-acute-care/#contact",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Aetna, Select, UHC & More",
        url: "https://www.generationsllc.com/communities/fairfield-village/post-acute-care/",
        icon: "document",
      },
      {
        id: "resource-brochure",
        title: "Fairfield Village Brochure",
        url: "https://www.generationsllc.com/wp-content/uploads/2025/02/FairfieldVillage-TrifoldMini-Digital-R1.pdf",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "8f4786a6-6ac5-4ded-9a4f-1b4f790674fa": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://fourcornerscare.com/",
    phone: "435-678-2251",
    fax: "435-678-2326",
    contactName: "Daniel Bradford",
    contactRole: "Admissions",
    contactPhone: "435-678-2251",
    contactEmail: "don@simplefourcornerscare.com",
    serviceDescription:
      "Four Corners Regional Care Center in Blanding is a skilled nursing and rehabilitation facility focused on short-term rehabilitation and long-term care in a comfortable, caring setting. The facility specializes in post-hospital rehabilitation services, including physical, occupational, and speech therapy, and supports residents recovering after a hospital stay or needing long-term care for disability or chronic illness.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://fourcornerscare.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Post-Hospital Rehabilitation",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Customized Therapy Programs",
      "Comfortable Care Setting",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "New Mexico Medicaid Accepted",
      "Aetna Accepted",
      "Cigna Accepted",
      "Select Health Accepted",
      "United HealthCare Accepted",
      "BCBS Accepted",
      "TriCare Accepted",
      "Health Choice Utah Accepted",
      "Mercy Care Medicare Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Four Corners Website",
        url: "https://fourcornerscare.com/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Rehabilitation & Long-Term Care",
        url: "https://fourcornerscare.com/",
        icon: "heart",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Medicaid, Aetna, Cigna & More",
        url: "https://fourcornerscare.com/",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465057",
        icon: "document",
      },
      {
        id: "resource-healthcare4ppl",
        title: "Nursing Home Provider Details",
        url: "https://www.healthcare4ppl.com/nursing-home/utah/blanding/four-corners-regional-care-center-465057.html",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "86050ef8-bdb7-4997-b252-da2ab765070f": {
    shortDescription: "Skilled Nursing Facility / Rehab / Memory Care",
    website: "https://avalonhealthcare.com/ogden/",
    phone: "801-334-4300",
    fax: "801-334-4301",
    contactName: "George E. Wahlen Ogden Veterans Home",
    contactRole: "Admissions",
    contactPhone: "801-334-4300",
    contactEmail: "",
    serviceDescription:
      "George E. Wahlen Ogden Veterans Home is a veteran-focused long-term care and rehabilitation facility in Northern Utah serving eligible U.S. Veterans, spouses of Veterans, and Gold Star Parents. The home provides rehabilitation, extended skilled nursing care, specialized memory care, private suites, home-like interiors, family dining for special occasions, open outdoor areas, private gardens, and personalized treatment and activity plans.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://avalonhealthcare.com/ogden/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Long-Term Care",
      "Rehabilitation",
      "Extended Skilled Nursing Care",
      "Specialized Memory Care",
      "Veteran-Focused Care",
      "Private Suites",
      "Home-Like Open Interiors",
      "Family Dining for Special Occasions",
      "Open Outdoor Areas",
      "Private Gardens",
      "Personalized Treatment Plans",
      "Personalized Activity Plans",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "120 Nursing Care Beds",
      "Medicare Accepted",
      "Medicaid Accepted",
      "Veterans Administration Payment Options",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Ogden Veterans Home Website",
        url: "https://avalonhealthcare.com/ogden/",
        icon: "home",
      },
      {
        id: "resource-utah-veterans-home",
        title: "Utah Veterans Homes Information",
        url: "https://veterans.utah.gov/veterans-homes/",
        icon: "document",
      },
      {
        id: "resource-nasvh",
        title: "State Veterans Home Profile",
        url: "https://nasvh.org/veterans-homes/george-e-wahlen-ogden-veterans-home/",
        icon: "document",
      },
      {
        id: "resource-payment-methods",
        title: "Payment Options: VA, Medicare & Medicaid",
        url: "https://nasvh.org/veterans-homes/george-e-wahlen-ogden-veterans-home/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "deea508c-ae40-47b6-afd0-505a226ed8b2": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://harrisonpointehealthcare.com/",
    phone: "801-612-3949",
    fax: "801-938-5673",
    contactName: "Katelin Hansen",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-458-6041",
    contactEmail: "khansen@ensignservices.net",
    serviceDescription:
      "Harrison Pointe Healthcare & Rehabilitation is an Ogden skilled nursing and rehabilitation facility offering short-term rehabilitation, long-term care, in-house therapy, skilled nursing, activities, private and semi-private rooms, nutritious menus, housekeeping, laundry services, landscaped grounds, and individualized care plans designed to help patients regain strength, mobility, and independence.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://harrisonpointehealthcare.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Skilled Nursing",
      "63 Beds",
      "Private Rooms",
      "Semi-Private Rooms",
      "Activities Program",
      "Nutritious Menus",
      "Housekeeping Services",
      "Laundry Services",
      "Beautifully Landscaped Grounds",
      "Medicaid Accepted",
      "Medicare Accepted",
      "Major Insurance Accepted",
      "Aetna Accepted",
      "Humana Accepted",
      "Molina Accepted",
      "United HealthCare Accepted",
      "VA Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Harrison Pointe Website",
        url: "https://harrisonpointehealthcare.com/",
        icon: "home",
      },
      {
        id: "resource-in-house-therapy",
        title: "In-House Therapy",
        url: "https://harrisonpointehealthcare.com/in-house-therapy/",
        icon: "heart",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing",
        url: "https://harrisonpointehealthcare.com/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-activities",
        title: "Stay Active",
        url: "https://harrisonpointehealthcare.com/stay-active/",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact Harrison Pointe",
        url: "https://harrisonpointehealthcare.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicaid, Medicare & Major Insurance",
        url: "https://harrisonpointehealthcare.com/contact-us/",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465009",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "0519a964-04d7-484e-a2aa-0b76f54f7be2": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://heritageparkrehab.com/",
    phone: "801-825-9731",
    fax: "801-728-4224",
    contactName: "Nichol Miner",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-317-5939",
    contactEmail: "contact-heritagepark@ensignservices.net",
    serviceDescription:
      "Heritage Park Healthcare & Rehabilitative Services in Roy is a modern, state-of-the-art care center offering short-term rehabilitation, long-term care, 24-hour skilled nursing, in-house therapy, private and semi-private rooms, resident activities, nutritious menus, housekeeping, laundry services, landscaped grounds, and a comfortable therapeutic setting.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://heritageparkrehab.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "24-Hour Skilled Nursing",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "176 Beds",
      "Private Rooms",
      "Semi-Private Rooms",
      "Diverse Activities Program",
      "Nutritious Menus",
      "Housekeeping Services",
      "Laundry Services",
      "Beautifully Landscaped Grounds",
      "Medicare Accepted",
      "Major Insurance Accepted",
      "Utah Medicaid Accepted",
      "Multi-State Medicaid Accepted",
      "VA Accepted",
      "Workers Comp Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Heritage Park Website",
        url: "https://heritageparkrehab.com/",
        icon: "home",
      },
      {
        id: "resource-in-house-therapy",
        title: "In-House Therapy",
        url: "https://heritageparkrehab.com/in-house-therapy/",
        icon: "heart",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing",
        url: "https://heritageparkrehab.com/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-activities",
        title: "Stay Active",
        url: "https://heritageparkrehab.com/stay-active/",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact Heritage Park",
        url: "https://heritageparkrehab.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare & Major Insurance Plans",
        url: "https://heritageparkrehab.com/contact-us/",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465003",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "29fcb0df-7b0d-4efb-8c4d-3d08489aea74": {
    shortDescription: "Skilled Nursing Facility / Rehab / Long-Term Care",
    website: "http://www.highlandcarecenter.com/",
    phone: "801-278-2839",
    fax: "801-272-6109",
    contactName: "Dawn Hodges",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-273-4803",
    contactEmail: "dawn.hodges@highlandcarecenter.com",
    serviceDescription:
      "Highland Care Center in Salt Lake City provides individualized rehabilitation and long-term services, skilled nursing care, short-term rehabilitation, hospice care support, therapy services, advanced nursing, specialty programs, and individualized support from a care team that includes therapists, nurses, and other licensed professionals.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "http://www.highlandcarecenter.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Skilled Nursing Care",
      "Advanced Nursing",
      "Specialty Programs",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Hospice Care Support",
      "Individualized Rehabilitation",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Medicare Advantage Accepted",
      "Aetna Accepted",
      "Humana Accepted",
      "Molina Accepted",
      "Select Health Accepted",
      "United HealthCare Accepted",
      "BCBS Accepted",
      "Cigna Accepted",
      "TriCare Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Highland Care Center Website",
        url: "http://www.highlandcarecenter.com/",
        icon: "home",
      },
      {
        id: "resource-accepted-insurances",
        title: "Accepted Insurances: Medicare, Medicaid, Aetna, UHC & More",
        url: "https://uthca.org/find-a-facility/highland-care-center",
        icon: "document",
      },
      {
        id: "resource-uthca",
        title: "Utah Health Care Association Listing",
        url: "https://uthca.org/find-a-facility/highland-care-center",
        icon: "document",
      },
      {
        id: "resource-npi",
        title: "NPI Provider Details",
        url: "https://npiprofile.com/npi/1164651444",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "c72685e1-efb5-4b58-96c2-ac1bf81cb1f9": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://holladayhealthcare.net/",
    phone: "801-277-7002",
    fax: "801-272-0622",
    contactName: "Holladay Healthcare Admissions",
    contactRole: "Admissions",
    contactPhone: "801-277-7002",
    contactEmail: "contact-holladay@ensignservices.net",
    serviceDescription:
      "Holladay Healthcare Center is a modern skilled nursing facility in the historic Holladay neighborhood of the Salt Lake Valley. The center provides short-term rehabilitation, long-term care, 24-hour nursing care, in-house therapy, skilled nursing, private and semi-private rooms, activities, nutritious menus, housekeeping, laundry services, landscaped grounds, respite care, and secured memory care support.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://holladayhealthcare.net/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "24-Hour Nursing Care",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Skilled Nursing",
      "Secured Memory Care Unit",
      "Respite Care",
      "120 Beds",
      "Private Rooms",
      "Semi-Private Rooms",
      "Wanderguard",
      "Activities Program",
      "Nutritious Menus",
      "Housekeeping Services",
      "Laundry Services",
      "Beautifully Landscaped Grounds",
      "Medicare Accepted",
      "Medicaid Accepted",
      "Private Insurance Accepted",
      "Veterans Administration Payment Options",
      "Managed Care Benefits",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Holladay Healthcare Website",
        url: "https://holladayhealthcare.net/",
        icon: "home",
      },
      {
        id: "resource-in-house-therapy",
        title: "In-House Therapy",
        url: "https://holladayhealthcare.net/in-house-therapy/",
        icon: "heart",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing",
        url: "https://holladayhealthcare.net/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-activities",
        title: "Stay Active",
        url: "https://holladayhealthcare.net/stay-active/",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact Holladay Healthcare",
        url: "https://holladayhealthcare.net/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-payment-methods",
        title: "Payment Methods: Private Insurance, VA, Medicaid & Medicare",
        url: "https://seniorsbluebook.com/senior-housing/holladay-healthcare-center-holladay-ut",
        icon: "document",
      },
      {
        id: "resource-cms-details",
        title: "CMS Rating & Facility Details",
        url: "https://www.seniorcare.com/nursing-homes/ut/salt-lake-city/holladay-healthcare-center/465109/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "9bc77208-9fe6-4cc3-8647-92e73e173f04": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://horizonhealthandrehab.com/",
    phone: "702-382-5580",
    fax: "702-382-4453",
    contactName: "Horizon Health & Rehabilitation Admissions",
    contactRole: "Admissions",
    contactPhone: "702-382-5580",
    contactEmail: "horizonhealthrehab@fundltc.com",
    serviceDescription:
      "Horizon Health & Rehabilitation Center in Las Vegas offers individualized short-term and long-term skilled nursing care with 24-hour licensed staff, rehabilitation therapy, restorative care, wound care support, IV medication capabilities, nutritional therapy, hospice care coordination, dialysis transportation, social services, and case management.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://horizonhealthandrehab.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "138-Bed Facility",
      "24-Hour Licensed Care",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Restorative Care Program",
      "Pain Management Team",
      "Intensive Wound Care",
      "Physician Wound Care Rounding",
      "Intravenous Medication Capabilities",
      "Nutritional Therapy",
      "TPN and Gastrostomy Tube Care",
      "Colostomy and Ileostomy Care",
      "Hospice Care Coordination",
      "Dialysis Transportation",
      "Full-Time Dietician",
      "Social Services",
      "Case Management",
      "Admissions Accepted 24/7",
      "Medicare Accepted",
      "Medicaid Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Horizon Health & Rehabilitation Website",
        url: "https://horizonhealthandrehab.com/",
        icon: "home",
      },
      {
        id: "resource-admissions",
        title: "Admissions: Open 24/7",
        url: "https://horizonhealthandrehab.com/",
        icon: "calendar",
      },
      {
        id: "resource-services",
        title: "Skilled Nursing & Rehabilitation Services",
        url: "https://horizonhealthandrehab.com/",
        icon: "heart",
      },
      {
        id: "resource-las-vegas-heals",
        title: "Facility Details: 138-Bed Skilled Nursing",
        url: "https://web.lasvegasheals.org/PostAcute-Care-Facilities/Horizon-Health-and-Rehabilitation-Center-293",
        icon: "document",
      },
      {
        id: "resource-medicare-medicaid",
        title: "Medicare & Medicaid Certification Details",
        url: "https://www.nursinghomedatabase.com/snf/295017",
        icon: "document",
      },
      {
        id: "resource-npi",
        title: "NPI Provider Details",
        url: "https://npiprofile.com/npi/1407057227",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "2cf88158-7fcb-4263-a1f3-c3a41e68d16e": {
    shortDescription: "Skilled Nursing Facility / Transitional Rehab / Long-Term Care",
    website: "https://rockymountaincare.com/locations/hunter-hollow-west-valley-city-ut/",
    phone: "801-397-4400",
    fax: "801-397-4490",
    contactName: "Hunter Hollow Admissions",
    contactRole: "Admissions",
    contactPhone: "801-397-4400",
    serviceDescription:
      "Hunter Hollow Transitional Rehab is a Rocky Mountain Care skilled nursing and rehabilitation community in West Valley City serving residents across Salt Lake County. The facility offers short and long-term care, 24-hour skilled nursing, inpatient transitional rehabilitation, physical therapy, occupational therapy, speech therapy, advanced wound care, respiratory services, pulmonology-supported care, social services, and amenities designed to support recovery and comfort.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://rockymountaincare.com/locations/hunter-hollow-west-valley-city-ut/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Transitional Rehabilitation",
      "Short-Term Care",
      "Long-Term Care",
      "24-Hour Skilled Nursing",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Outpatient Therapy Services",
      "Lymphedema Therapy",
      "Advanced Wound Care",
      "Orthopedic Recovery",
      "Neurology and CVA Care",
      "Respiratory Therapy",
      "Ventilator Management",
      "Tracheostomy Care",
      "Oxygen Therapy",
      "CPAP/BiPAP Support",
      "Pulmonologist-Supported Care",
      "Registered Nurses Available 24/7",
      "Social Services",
      "Registered Dietician",
      "Recreational Therapy",
      "Spacious Fitness Center",
      "Private Suites with Bathroom and Shower",
      "Fine Dining",
      "Wi-Fi Internet Access",
      "Movie Theater",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Hunter Hollow Website",
        url: "https://rockymountaincare.com/locations/hunter-hollow-west-valley-city-ut/",
        icon: "home",
      },
      {
        id: "resource-skilled-nursing",
        title: "Rocky Mountain Care Skilled Nursing",
        url: "https://rockymountaincare.com/services/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-rehabilitation",
        title: "Rehabilitation Services",
        url: "https://rockymountaincare.com/services/rehabilitation/",
        icon: "heart",
      },
      {
        id: "resource-outpatient-therapy",
        title: "Outpatient Therapy",
        url: "https://rockymountaincare.com/services/out-patient-therapy/",
        icon: "document",
      },
      {
        id: "resource-pay-online",
        title: "Rocky Mountain Care Pay Online",
        url: "https://rockymountaincare.com/pay/",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "3f600f19-1639-41f9-8857-e5cae2952302": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://hurricanehealthandrehab.com/",
    phone: "435-635-9833",
    fax: "435-635-9848",
    contactName: "Hurricane Health & Rehabilitation Admissions",
    contactRole: "Admissions",
    contactPhone: "435-635-9833",
    serviceDescription:
      "Hurricane Health & Rehabilitation provides short-term rehabilitation and long-term skilled nursing care in Hurricane, Utah. The facility supports recovery and ongoing care with skilled nursing, in-house therapy, physical therapy, occupational therapy, speech therapy, activities, nursing support, individualized care planning, admissions support, and a comfortable setting for post-acute and longer-term residents.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://hurricanehealthandrehab.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Post-Acute Care",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Skilled Nursing",
      "Nursing Support",
      "Care Planning",
      "Medication Management",
      "Activities Program",
      "Admissions Support",
      "Nutritious Meals",
      "Housekeeping Services",
      "Laundry Services",
      "Comfortable Resident Rooms",
      "Medicare Accepted",
      "Medicaid Accepted",
      "Private Insurance Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Hurricane Health & Rehabilitation Website",
        url: "https://hurricanehealthandrehab.com/",
        icon: "home",
      },
      {
        id: "resource-in-house-therapy",
        title: "In-House Therapy",
        url: "https://hurricanehealthandrehab.com/in-house-therapy/",
        icon: "heart",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing",
        url: "https://hurricanehealthandrehab.com/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-activities",
        title: "Stay Active",
        url: "https://hurricanehealthandrehab.com/stay-active/",
        icon: "list",
      },
      {
        id: "resource-video-photos",
        title: "Videos & Photos",
        url: "https://hurricanehealthandrehab.com/videos-photos/",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact Hurricane Health & Rehabilitation",
        url: "https://hurricanehealthandrehab.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "8e313cdf-3b39-4d68-8f8c-00f4b3b88423": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab",
    website: "https://www.legacyretire.com/communities/legacy-village-rehabilitation/",
    phone: "801-613-4600",
    contactName: "Legacy Village Rehabilitation Admissions",
    contactRole: "Admissions",
    contactPhone: "801-613-4600",
    serviceDescription:
      "Legacy Village Rehabilitation in Taylorsville provides premier short-term nursing and rehabilitation services for guests recovering from surgery, injuries, illness, or other hospitalizations. The state-of-the-art rehabilitation center uses a hospitality-based approach with skilled nursing, physical therapy, occupational therapy, speech language pathology, outpatient therapy, dietician-approved meals, therapeutic activities, scheduled medical transportation, and case management.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.legacyretire.com/communities/legacy-village-rehabilitation/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Nursing and Rehabilitation",
      "Hospitality-Based Recovery",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Language Pathology",
      "Outpatient Therapy",
      "Dietician-Approved Meals",
      "Therapeutic Diets",
      "Therapeutic and Recreational Activities",
      "Scheduled Transportation to Medical Appointments",
      "Case Management Services",
      "Private Room and Private Bath",
      "Fully Adjustable Electric High/Low Bed",
      "Flat Screen Television",
      "Satellite Television",
      "High-Speed Wireless Internet",
      "Telephone",
      "Microwave",
      "Refrigerator",
      "Beauty and Barber Shop",
      "Cozy Library",
      "Game Room",
      "Private Dining Room",
      "State-of-the-Art Rehabilitation Gym",
      "Medicare Certified",
      "40 Federally Certified Beds",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Legacy Village Rehabilitation Website",
        url: "https://www.legacyretire.com/communities/legacy-village-rehabilitation/",
        icon: "home",
      },
      {
        id: "resource-nursing-rehabilitation",
        title: "Nursing & Rehabilitation Services",
        url: "https://www.legacyretire.com/care/nursing-and-rehabilitation/",
        icon: "heart",
      },
      {
        id: "resource-gallery",
        title: "Gallery and Virtual Tour",
        url: "https://www.legacyretire.com/communities/legacy-village-rehabilitation/#gallery",
        icon: "image",
      },
      {
        id: "resource-location",
        title: "Location and Directions",
        url: "https://www.legacyretire.com/communities/legacy-village-rehabilitation/#location",
        icon: "map",
      },
      {
        id: "resource-medicare",
        title: "Medicare Certified Nursing Home Details",
        url: "https://www.medicarelist.com/nursing-home/legacy-village-rehabilitation-taylorsville-ut/",
        icon: "document",
      },
      {
        id: "resource-cms-rating",
        title: "CMS Rating and Facility Details",
        url: "https://www.nursinghomedatabase.com/snf/465171",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "39def811-35ba-45eb-83ac-3262ad111c4d": {
    shortDescription: "Skilled Nursing Facility / Long-Term Care",
    phone: "801-485-9007",
    contactName: "Little Cottonwood Rehab & Nursing Admissions",
    contactRole: "Admissions",
    contactPhone: "801-485-9007",
    serviceDescription:
      "Little Cottonwood Rehab & Nursing is a South Salt Lake skilled nursing facility providing nursing care, rehabilitation support, long-term care, care coordination, medication management, therapy support, discharge planning, and daily assistance for residents who need a higher level of care.",
    amenities: [
      "Skilled Nursing Facility",
      "Long-Term Care",
      "Nursing Care",
      "Rehabilitation Support",
      "Post-Acute Care",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Physical Therapy Support",
      "Occupational Therapy Support",
      "Speech Therapy Support",
      "Resident Activities",
      "Housekeeping Services",
      "Dining Services",
      "37 Certified Beds",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-facility-details",
        title: "Facility Details and CMS Data",
        url: "https://www.nursinghomedatabase.com/snf/465225",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "5c704fce-9249-4153-a0d2-d994595aeb1e": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://www.lomondrehab.com/",
    phone: "801-782-3740",
    contactName: "Lomond Peak Admissions",
    contactRole: "Admissions",
    contactPhone: "801-782-3740",
    serviceDescription:
      "Lomond Peak Nursing & Rehab in Ogden provides skilled nursing, rehabilitation, and longer-term care with 24-hour nursing support, state-of-the-art therapy, social services, semi-private suites, in-house physical therapy, occupational therapy, speech therapy, daily recreational and social activities, wound care support, hospice care coordination, and admissions services.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://www.lomondrehab.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "24-Hour Nursing Care",
      "State-of-the-Art Therapy",
      "In-House Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Daily Recreational Activities",
      "Social Activities",
      "Wound Care Support",
      "Hospice Care Coordination",
      "Semi-Private Suites",
      "Social Services",
      "Admissions Support",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Nutritious Meals",
      "Medicare Accepted",
      "Private Pay Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Lomond Peak Nursing & Rehab Website",
        url: "https://www.lomondrehab.com/",
        icon: "home",
      },
      {
        id: "resource-admissions",
        title: "Admissions",
        url: "https://www.lomondrehab.com/admissions/",
        icon: "calendar",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://www.lomondrehab.com/services/",
        icon: "heart",
      },
      {
        id: "resource-tour",
        title: "Virtual Tour",
        url: "https://www.lomondrehab.com/tour/",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact Lomond Peak",
        url: "https://www.lomondrehab.com/contact/",
        icon: "calendar",
      },
      {
        id: "resource-payment-methods",
        title: "Payment Methods: Private Pay and Medicare",
        url: "https://seniorsbluebook.com/senior-housing/lomond-peak-nursing-rehab-ogden-ut",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "4719a8a0-a61a-48b0-9563-ff76f7156357": {
    shortDescription: "Skilled Nursing Facility / Long-Term Care",
    phone: "801-355-6891",
    contactName: "Maple Ridge Rehab & Nursing Admissions",
    contactRole: "Admissions",
    contactPhone: "801-355-6891",
    serviceDescription:
      "Maple Ridge Rehab & Nursing in Salt Lake City is a skilled nursing facility providing nursing care, long-term care, rehabilitation support, care coordination, medication management, discharge planning, and day-to-day support for residents who need a higher level of clinical care.",
    amenities: [
      "Skilled Nursing Facility",
      "Long-Term Care",
      "Nursing Care",
      "Rehabilitation Support",
      "Post-Acute Care",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Physical Therapy Support",
      "Occupational Therapy Support",
      "Speech Therapy Support",
      "Resident Activities",
      "Dining Services",
      "Housekeeping Services",
      "36 Certified Beds",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-medicare",
        title: "Medicare Care Compare Details",
        url: "https://www.medicare.gov/care-compare/details/nursing-home/46A058/?city=Salt%20Lake%20City&state=UT",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "55d4d84a-b767-4382-829d-bb89c93fc042": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://maplespringsliving.com/brigham-city/",
    phone: "435-723-9100",
    contactName: "Maple Springs Brigham City Admissions",
    contactRole: "Admissions",
    contactPhone: "435-723-9100",
    serviceDescription:
      "Maple Springs Nursing and Rehabilitation in Brigham City is part of the Maple Springs of Brigham City campus, offering skilled nursing and rehabilitation with post-hospital short-term rehab, long-term care, respite services, complex medical care, personalized support, restaurant-style dining, activities, and access to assisted living, independent living, and memory care services on the broader community campus.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://maplespringsliving.com/brigham-city/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Skilled Nursing and Rehabilitation",
      "Post-Hospital Short-Term Rehab",
      "Long-Term Care",
      "Respite Services",
      "Complex Medical Care",
      "Personalized Care",
      "Restaurant-Style Dining",
      "Activities and Social Events",
      "Group Outings",
      "Movie Nights",
      "Art Activities",
      "Light Care Services",
      "Memory Care on Campus",
      "Assisted Living on Campus",
      "Independent Living on Campus",
      "24/7 Support Staff",
      "Care Coordination",
      "Medication Management",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Maple Springs Brigham City Website",
        url: "https://maplespringsliving.com/brigham-city/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://maplespringsliving.com/brigham-city/#services",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Lifestyle Amenities",
        url: "https://maplespringsliving.com/brigham-city/#amenities",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact Maple Springs Brigham City",
        url: "https://maplespringsliving.com/brigham-city/#contact",
        icon: "calendar",
      },
      {
        id: "resource-calendar",
        title: "Community Calendar",
        url: "https://maplespringsliving.com/brigham-city/calendar/",
        icon: "calendar",
      },
      {
        id: "resource-uthca",
        title: "Utah Health Care Association Listing",
        url: "https://uthca.org/find-a-facility/maple-springs-brigham-city",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "026e0f98-9411-4281-b8bb-30ebb9a41bbd": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://maplespringsliving.com/north-logan/",
    phone: "435-753-9400",
    contactName: "Maple Springs North Logan Admissions",
    contactRole: "Admissions",
    contactPhone: "435-753-9400",
    serviceDescription:
      "Maple Springs Nursing & Rehab of Logan is part of the Maple Springs of North Logan community, offering skilled nursing and rehabilitation with post-hospital short-term rehab, long-term care, respite services, complex medical care, personalized support, restaurant-style dining, activities, and access to assisted living and memory care services on the broader campus.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://maplespringsliving.com/north-logan/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Skilled Nursing and Rehabilitation",
      "Post-Hospital Short-Term Rehab",
      "Long-Term Care",
      "Respite Services",
      "Complex Medical Care",
      "Personalized Care",
      "Restaurant-Style Dining",
      "Activities and Outings",
      "Classes and Social Programming",
      "Barber and Beauty Salon",
      "Fitness Equipment",
      "Movie Theater",
      "Church Services",
      "Shuttle Services",
      "Resident Kitchen",
      "Ice Cream Parlor",
      "Library",
      "Memory Care on Campus",
      "Assisted Living on Campus",
      "Care Coordination",
      "Medication Management",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Maple Springs North Logan Website",
        url: "https://maplespringsliving.com/north-logan/",
        icon: "home",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://maplespringsliving.com/north-logan/#services",
        icon: "heart",
      },
      {
        id: "resource-amenities",
        title: "Lifestyle Amenities",
        url: "https://maplespringsliving.com/north-logan/#amenities",
        icon: "list",
      },
      {
        id: "resource-contact",
        title: "Contact Maple Springs North Logan",
        url: "https://maplespringsliving.com/north-logan/#contact",
        icon: "calendar",
      },
      {
        id: "resource-cms-details",
        title: "Medicare Care Compare Details",
        url: "https://www.medicare.gov/care-compare/details/nursing-home/465186",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "39bfa7d8-eb74-42b0-9577-582f6fc4355b": {
    shortDescription: "Skilled Nursing Facility / Long-Term Care",
    phone: "801-487-2248",
    contactName: "Meadow Brook Rehab & Nursing Admissions",
    contactRole: "Admissions",
    contactPhone: "801-487-2248",
    serviceDescription:
      "Meadow Brook Rehab & Nursing in Salt Lake City is a skilled nursing facility offering skilled rehabilitation, long-term care, nursing support, medication management, care coordination, discharge planning, and resident support services for individuals needing a higher level of clinical care.",
    amenities: [
      "Skilled Nursing Facility",
      "Skilled Rehabilitation",
      "Long-Term Care",
      "Nursing Support",
      "Post-Acute Care",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Physical Therapy Support",
      "Occupational Therapy Support",
      "Speech Therapy Support",
      "Resident Activities",
      "Dining Services",
      "Housekeeping Services",
      "41 Certified Beds",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-medicare",
        title: "Medicare Care Compare Details",
        url: "https://www.medicare.gov/care-compare/details/nursing-home/465158/view-all/?state=UT",
        icon: "document",
      },
      {
        id: "resource-uthca",
        title: "Utah Health Care Association Listing",
        url: "https://uthca.org/find-a-facility/meadow-brook-rehab-nursing",
        icon: "document",
      },
      {
        id: "resource-service-details",
        title: "Skilled Rehabilitation Details",
        url: "https://seniorcarefinder.com/providers/29045/ut/salt-lake-city/meadow-brook-rehabilitation-and-nursing",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "06ea0ea5-0bfa-4cc7-bf7c-b316a14b2408": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://missionhealthservices.org/communities/meadow-peak-at-summit-vista-living/",
    phone: "385-255-1105",
    contactName: "Meadow Peak Rehabilitation Admissions",
    contactRole: "Admissions",
    contactPhone: "385-255-1105",
    serviceDescription:
      "Meadow Peak Rehabilitation in Taylorsville is a Mission Health Services community at Summit Vista offering short-term therapy, skilled nursing, long-term care, rehabilitative care, memory care, assisted living support, activities, beautician and barber services, chef-quality dining, and coordinated admissions support.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://missionhealthservices.org/communities/meadow-peak-at-summit-vista-living/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Care",
      "Short-Term Therapy",
      "Long-Term Care",
      "Rehabilitative Care",
      "Therapy Programs",
      "Skilled Nursing",
      "Memory Care",
      "Assisted Living Support",
      "Meaningful Activities",
      "Life-Enriching Activities and Programs",
      "Beautician and Barber Services",
      "Chef-Quality Dining",
      "Admissions Support",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Summit Vista Campus Location",
      "Medicare Education Resources",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Meadow Peak Rehabilitation Website",
        url: "https://missionhealthservices.org/communities/meadow-peak-at-summit-vista-living/",
        icon: "home",
      },
      {
        id: "resource-long-term-care",
        title: "Long-Term Care",
        url: "https://missionhealthservices.org/care-services/long-term-care/",
        icon: "heart",
      },
      {
        id: "resource-short-term-care",
        title: "Short-Term Care",
        url: "https://missionhealthservices.org/care-services/short-term-care/",
        icon: "heart",
      },
      {
        id: "resource-therapy-programs",
        title: "Therapy Programs",
        url: "https://missionhealthservices.org/care-services/therapy-programs/",
        icon: "heart",
      },
      {
        id: "resource-medicare",
        title: "Medicare Education",
        url: "https://missionhealthservices.org/care-services/medicare/",
        icon: "document",
      },
      {
        id: "resource-summit-vista",
        title: "Meadow Peak at Summit Vista",
        url: "https://www.summitvista.com/meadow-peak",
        icon: "building",
      },
      {
        id: "resource-contact",
        title: "Contact Mission Health Services",
        url: "https://missionhealthservices.org/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "a1a54d0d-18cd-4e6c-a20f-dc9c9686ab06": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    phone: "801-363-6340",
    fax: "801-355-2006",
    contactName: "Midtown Manor Admissions",
    contactRole: "Admissions",
    contactPhone: "801-363-6340",
    serviceDescription:
      "Midtown Manor in Salt Lake City is a long-term skilled nursing facility with 82 licensed beds, short-term rehabilitation support, 24-hour medical and nursing care, physical therapy, occupational therapy, speech therapy, recreational activities, social services, and specialized support for residents with Alzheimer's disease or dementia.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/p/Midtown-Manor-Care-Center-100063801811842/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Long-Term Skilled Nursing",
      "Short-Term Rehabilitation",
      "82 Licensed Beds",
      "24-Hour Medical and Nursing Care",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Recreational Activities",
      "Social Services",
      "Alzheimer's and Dementia Care",
      "Secured Unit",
      "Resident Activities and Programs",
      "Outdoor Garden",
      "Community-Based Care",
      "Medicare Accepted",
      "Medicaid Accepted",
      "VA Contracted Facility",
      "Private Pay Accepted",
      "Hospice Support",
    ],
    resources: [
      {
        id: "resource-facebook",
        title: "Midtown Manor Facebook",
        url: "https://www.facebook.com/p/Midtown-Manor-Care-Center-100063801811842/",
        icon: "link",
      },
      {
        id: "resource-nursa",
        title: "Facility Overview: Skilled Nursing and 82 Beds",
        url: "https://nursa.com/facilities/midtown-manor",
        icon: "document",
      },
      {
        id: "resource-senior-housing",
        title: "Living Options: Nursing Care",
        url: "https://www.seniorhousingnet.com/seniorliving-detail/midtown-manor_125-s-900-w_salt-lake-city_ut_84104-520230",
        icon: "document",
      },
      {
        id: "resource-vai-health",
        title: "VA Contracted Facility Listing",
        url: "https://healthcare.utah.edu/neilsen-physical-rehab-hospital/patient-resources",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "03213ec4-66e4-42e6-8c75-cfce65d90b23": {
    shortDescription: "Skilled Nursing Facility / Long-Term Care",
    phone: "801-484-7638",
    contactName: "Millcreek Rehabilitation & Nursing Admissions",
    contactRole: "Admissions",
    contactPhone: "801-484-7638",
    serviceDescription:
      "Millcreek Rehabilitation & Nursing in Salt Lake City is a skilled nursing facility providing long-term care, skilled rehabilitation, nursing care, care coordination, medication management, discharge planning, and resident support services near St. Mark's Hospital and the broader Salt Lake City medical community.",
    amenities: [
      "Skilled Nursing Facility",
      "Long-Term Care",
      "Skilled Rehabilitation",
      "Nursing Care",
      "Post-Acute Care",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Physical Therapy Support",
      "Occupational Therapy Support",
      "Speech Therapy Support",
      "Resident Activities",
      "Dining Services",
      "Housekeeping Services",
      "61 Certified Beds",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-medicare",
        title: "Medicare Care Compare Details",
        url: "https://www.medicare.gov/care-compare/details/nursing-home/465185/view-all/?state=UT",
        icon: "document",
      },
      {
        id: "resource-nursa",
        title: "Facility Overview: Skilled Nursing and 61 Beds",
        url: "https://nursa.com/facilities/millcreek-rehabilitation-and-nursing-llc",
        icon: "document",
      },
      {
        id: "resource-careavailability",
        title: "CareAvailability Skilled Nursing Listing",
        url: "https://careavailability.com/provider/millcreek-rehabilitation-and-nursing-llc/",
        icon: "document",
      },
      {
        id: "resource-service-details",
        title: "Long-Term Care / Skilled Nursing Details",
        url: "https://seniorcarefinder.com/providers/29068/ut/salt-lake-city/millcreek-rehabilitation-and-nursing-llc",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "92d45711-a0dc-40a2-916c-5b788624ac0a": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Memory Care",
    website: "https://missionhealthservices.org/communities/mission-at-alpine-valley/",
    phone: "801-785-3568",
    contactName: "Mission at Alpine Admissions",
    contactRole: "Admissions",
    contactPhone: "801-785-3568",
    serviceDescription:
      "Mission at Alpine Rehab Center, also known as Mission at Alpine Valley Care Center, provides short-term therapy, skilled nursing, and dementia care in a secured unit in Pleasant Grove. The community offers private suites, physical therapy, occupational therapy, speech therapy, post-stroke recovery, orthopedic recovery, restorative care, wound care, IV services, enteral feedings, PICC insertion and management, transportation to medical appointments, and meaningful activities with a licensed recreational therapist.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://missionhealthservices.org/communities/mission-at-alpine-valley/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Therapy",
      "Skilled Nursing",
      "Dementia Care in Secured Unit",
      "Private Suites",
      "Flat Screen TVs and Cable",
      "Made-to-Order Menu",
      "Flexible Meal Times",
      "24-Hour Access to Snacks and Beverages",
      "Daily Housekeeping",
      "Laundry Services",
      "Small Home Setting",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Post-Stroke Recovery",
      "Orthopedic Care After Hip and Knee Replacement",
      "Restorative Care",
      "Comprehensive Pain Management Program",
      "Licensed Recreational Therapy",
      "Transportation to Medical Appointments",
      "Memory Care",
      "Long-Term Care",
      "Wound Care",
      "Vestibular Therapy",
      "IV Services",
      "Enteral Feedings",
      "PICC Insertion",
      "PICC Management",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Mission at Alpine Rehabilitation Website",
        url: "https://missionhealthservices.org/communities/mission-at-alpine-valley/",
        icon: "home",
      },
      {
        id: "resource-short-term-care",
        title: "Short-Term Care",
        url: "https://missionhealthservices.org/care-services/short-term-care/",
        icon: "heart",
      },
      {
        id: "resource-therapy-programs",
        title: "Therapy Programs",
        url: "https://missionhealthservices.org/care-services/therapy-programs/",
        icon: "heart",
      },
      {
        id: "resource-long-term-care",
        title: "Long-Term Care",
        url: "https://missionhealthservices.org/care-services/long-term-care/",
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://missionhealthservices.org/care-services/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-medicare",
        title: "Medicare Education",
        url: "https://missionhealthservices.org/care-services/medicare/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Mission Health Services",
        url: "https://missionhealthservices.org/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "7c253a96-80e1-4730-a1a5-d72782ca962e": {
    shortDescription: "Skilled Nursing Facility / Short-Term Therapy / Long-Term Care",
    website: "https://missionhealthservices.org/communities/mission-at-community-rehabilitation-center/",
    phone: "435-528-2800",
    contactName: "Mission at Community Admissions",
    contactRole: "Admissions",
    contactPhone: "435-528-2800",
    serviceDescription:
      "Mission at Community Rehab Center in Centerfield provides skilled nursing and short-term therapy through a Therapy to Home program built around each resident's goals. The community offers private suites, flexible meal times and choices, physical therapy, occupational therapy, speech therapy, post-stroke recovery, orthopedic recovery after hip and knee replacement, social services to help transition home, memory care, long-term care, activities, cable TV, and free Wi-Fi.",
    socialLinks: [
      {
        id: "social-website",
        platform: "website",
        url: "https://missionhealthservices.org/communities/mission-at-community-rehabilitation-center/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Therapy",
      "Therapy to Home Program",
      "Skilled Nursing",
      "Long-Term Care",
      "Memory Care",
      "Private Suites",
      "Flexible Meal Times and Choices",
      "Cable TV",
      "Free Wi-Fi",
      "Comfortable Lounge Areas",
      "Nutrition Services",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Post-Stroke Recovery",
      "Orthopedic Care After Hip and Knee Replacement",
      "Activities",
      "Social Services",
      "Home Health and Community Service Transition Support",
      "Interdisciplinary Care Team",
      "Medicare Certified",
      "Medicaid Certified",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Mission at Community Rehabilitation Website",
        url: "https://missionhealthservices.org/communities/mission-at-community-rehabilitation-center/",
        icon: "home",
      },
      {
        id: "resource-short-term-care",
        title: "Short-Term Care",
        url: "https://missionhealthservices.org/care-services/short-term-care/",
        icon: "heart",
      },
      {
        id: "resource-therapy-programs",
        title: "Therapy Programs",
        url: "https://missionhealthservices.org/care-services/therapy-programs/",
        icon: "heart",
      },
      {
        id: "resource-long-term-care",
        title: "Long-Term Care",
        url: "https://missionhealthservices.org/care-services/long-term-care/",
        icon: "heart",
      },
      {
        id: "resource-memory-care",
        title: "Memory Care",
        url: "https://missionhealthservices.org/care-services/memory-care/",
        icon: "heart",
      },
      {
        id: "resource-medicare",
        title: "Medicare Education",
        url: "https://missionhealthservices.org/care-services/medicare/",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Mission Health Services",
        url: "https://missionhealthservices.org/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
  "9cb8481f-54a7-416d-9143-bfd56a32e7c5": {
    displayName: "The Terrace at Mt. Ogden",
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://theterracetransitional.com/",
    phone: "801-479-9855",
    fax: "801-938-5672",
    contactName: "Tavia Pentz",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-706-4822",
    contactEmail: "tpentz@ensignservices.com",
    serviceDescription:
      "The Terrace at Mt. Ogden, also known as The Terrace Transitional, is a Washington Terrace skilled nursing and rehabilitation facility offering long-term care, short-term rehabilitation, in-house therapy, skilled nursing, activity programming, nutritious dining, housekeeping, laundry services, and recovery-focused support near Ogden Regional Medical Center.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/Mt.OgdenTerrace/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://theterracetransitional.com/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "In-House Therapy",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "State-of-the-Art Therapy",
      "Private Suites",
      "Semi-Private Suites",
      "Nutritious Menus",
      "Restaurant-Style Dining",
      "Activities and Excursions",
      "Media / Activities Room",
      "Outdoor Space",
      "Library",
      "Housekeeping and Linen Services",
      "Laundry Services",
      "Wi-Fi",
      "Medicare Accepted",
      "Utah Medicaid Accepted",
      "Major Insurance Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "The Terrace Transitional Website",
        url: "https://theterracetransitional.com/",
        icon: "home",
      },
      {
        id: "resource-in-house-therapy",
        title: "In-House Therapy",
        url: "https://theterracetransitional.com/in-house-therapy/",
        icon: "heart",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing",
        url: "https://theterracetransitional.com/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-stay-active",
        title: "Stay Active",
        url: "https://theterracetransitional.com/stay-active/",
        icon: "list",
      },
      {
        id: "resource-photos",
        title: "Photos",
        url: "https://theterracetransitional.com/photos/",
        icon: "image",
      },
      {
        id: "resource-contact",
        title: "Contact The Terrace Transitional",
        url: "https://theterracetransitional.com/contact-us/",
        icon: "calendar",
      },
      {
        id: "resource-senior-care-finder",
        title: "Senior Care Finder Provider Profile",
        url: "https://seniorcarefinder.com/providers/29023/ut/ogden/the-terrace-transitional",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/details/nursing-home/465115/view-all/?state=UT",
        icon: "document",
      },
    ],
  },
  "8393bb9d-e0c6-4166-9303-fb38d2b82aad": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of American Fork",
    city: "American Fork",
    website: "https://monumenthg.com/location/american-fork/american-fork/",
    phone: "801-756-5293",
    formerName: "Sandstone of American Fork",
  }),
  "9a3de03d-0a61-4f66-b32f-baa74bcdc95f": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of Stonecreek",
    city: "Bountiful",
    website: "https://monumenthg.com/location/bountiful/stonecreek/",
    phone: "801-951-2273",
    formerName: "Sandstone of Bountiful",
  }),
  "6b524fdd-7a85-4dd9-a338-8a549c4ccc7d": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of Brigham City",
    city: "Brigham City",
    website: "https://monumenthg.com/location/brigham-city/brigham-city/",
    phone: "435-723-7777",
    formerName: "Sandstone of Brigham City",
    heroUrl:
      "phn-import/6b524fdd-7a85-4dd9-a338-8a549c4ccc7d/hero-monument-brigham-city.jpg",
  }),
  "46e41173-7b70-45dd-ab8d-488ab91799b8": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of Canyon Rim",
    city: "Salt Lake City",
    website: "https://monumenthg.com/location/salt-lake-city/canyon-rim/",
    phone: "801-487-0896",
    formerName: "Sandstone of Canyon Rim",
    heroUrl:
      "phn-import/46e41173-7b70-45dd-ab8d-488ab91799b8/hero-monument-canyon-rim.jpg",
  }),
  "22aa1859-e2cf-4089-afb2-b723be71b54b": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of Cottonwood Creek",
    city: "Salt Lake City",
    website: "https://monumenthg.com/location/salt-lake-city/cottonwood-creek/",
    phone: "801-262-2908",
    formerName: "Sandstone of Holladay",
    heroUrl:
      "phn-import/22aa1859-e2cf-4089-afb2-b723be71b54b/hero-monument-cottonwood-creek.jpg",
  }),
  "4b5798ad-7d03-46bc-a737-491072f63b4e": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of Murray Creek",
    city: "Salt Lake City",
    website: "https://monumenthg.com/location/salt-lake-city/murray-creek/",
    phone: "801-268-4766",
    formerName: "Sandstone of Millcreek",
  }),
  "bd54eea1-4ced-4c75-b6c9-e6017a260e41": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of Pioneer Trail",
    city: "Brigham City",
    website: "https://monumenthg.com/location/brigham-city/pioneer-trail/",
    phone: "435-723-5289",
    formerName: "Sandstone of Pioneer Trail",
  }),
  "bac75128-7ac5-460f-896f-b05b86a3ad41": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of South Salt Lake",
    city: "Salt Lake City",
    website: "https://monumenthg.com/location/salt-lake-city/south-salt-lake/",
    phone: "801-466-2211",
    formerName: "Sandstone of South Lake",
  }),
  "be06f98d-1130-475c-b031-5607620b8b60": buildFormerSandstoneMonumentEnrichment({
    displayName: "Monument Health of Taylorsville",
    city: "Taylorsville",
    website: "https://monumenthg.com/location/salt-lake-city/taylorsville/",
    phone: "801-969-1420",
    formerName: "Sandstone of Taylorsville",
  }),
  "9c59950c-e7a3-4ac6-8e5b-40fc1316a4cd": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    website: "https://monumenthg.com/location/salt-lake-city/millcreek/",
    phone: "801-261-3664",
    contactName: "Sharon Papalii",
    contactRole: "Admissions Coordinator",
    contactPhone: "801-833-8093",
    contactEmail: "sharon.papalii@monumenthg.com",
    serviceDescription:
      "Monument Health Group Millcreek in Salt Lake City is a skilled nursing and rehabilitation center offering 24-hour care, short-term rehabilitation, long-term care, physical therapy, occupational therapy, speech therapy, post-hospital care, and personalized clinical support for patients recovering after hospitalization, surgery, injury, or illness.",
    socialLinks: [
      {
        id: "social-facebook",
        platform: "facebook",
        url: "https://www.facebook.com/p/Monument-Health-Millcreek-61565427923427/",
      },
      {
        id: "social-website",
        platform: "website",
        url: "https://monumenthg.com/location/salt-lake-city/millcreek/",
      },
    ],
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Post-Acute Care",
      "24-Hour Operation",
      "Skilled Nursing",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy",
      "Post-Hospital Care",
      "Post-Traumatic Injury Care",
      "Tracheotomy and Tracheostomy Support",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Medicare Accepted",
      "UnitedHealthcare Accepted",
      "Optum Accepted",
      "Private Pay Accepted",
      "Long-Term Care Insurance Accepted",
    ],
    resources: [
      {
        id: "resource-website",
        title: "Monument Health Group Millcreek Website",
        url: "https://monumenthg.com/location/salt-lake-city/millcreek/",
        icon: "home",
      },
      {
        id: "resource-skilled-nursing",
        title: "Skilled Nursing in Millcreek",
        url: "https://monumenthg.com/millcreek/skilled-nursing/",
        icon: "heart",
      },
      {
        id: "resource-services",
        title: "Services",
        url: "https://monumenthg.com/services/",
        icon: "list",
      },
      {
        id: "resource-payment-methods",
        title: "Services and Payment Methods",
        url: "https://seniorsbluebook.com/senior-housing/Monument-Health-Group-Millcreek-ut",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/details/nursing-home/465139/view-all?state=UT",
        icon: "document",
      },
      {
        id: "resource-contact",
        title: "Contact Monument Health",
        url: "https://monumenthg.com/location/salt-lake-city/millcreek/#contact",
        icon: "calendar",
      },
    ],
  },
  "605e40f7-6f0f-4ae7-a8d4-56bf7a151edf": {
    shortDescription: "Skilled Nursing Facility / Short-Term Rehab / Long-Term Care",
    phone: "801-295-3135",
    contactName: "Monument Health of Bountiful Admissions",
    contactRole: "Admissions",
    contactPhone: "801-295-3135",
    serviceDescription:
      "Monument Health of Bountiful Skilled Nursing in Woods Cross provides skilled nursing, short-term rehabilitation, long-term care, post-acute support, physical therapy, occupational therapy, nursing care, medication management, care coordination, discharge planning, and 24-hour support for residents recovering after hospitalization or needing ongoing clinical care.",
    amenities: [
      "Skilled Nursing Facility",
      "Short-Term Rehabilitation",
      "Long-Term Care",
      "Post-Acute Care",
      "24-Hour Operation",
      "Skilled Nursing",
      "Physical Therapy",
      "Occupational Therapy",
      "Speech Therapy Support",
      "Care Coordination",
      "Medication Management",
      "Discharge Planning",
      "Resident Activities",
      "Dining Services",
      "Housekeeping Services",
      "Medicare Accepted",
      "Medicaid Accepted",
      "Private Pay Accepted",
      "Long-Term Care Insurance Accepted",
    ],
    resources: [
      {
        id: "resource-payment-methods",
        title: "Services and Payment Methods",
        url: "https://seniorsbluebook.com/senior-housing/monument-health-of-bountiful-woods-cross-ut",
        icon: "document",
      },
      {
        id: "resource-service-details",
        title: "Senior Care Finder Provider Profile",
        url: "https://seniorcarefinder.com/providers/29070/ut/woods-cross/monument-health-of-bountiful",
        icon: "document",
      },
      {
        id: "resource-cms",
        title: "CMS Care Compare",
        url: "https://www.medicare.gov/care-compare/",
        icon: "document",
      },
    ],
  },
};

const FACILITY_SELECT = [
  "id",
  "facility",
  "original_address",
  "street_address",
  "unit",
  "city",
  "state",
  "zip_code",
  "phone",
  "fax",
  "service_description",
  "has_assisted_living",
  "has_dme",
  "has_home_health",
  "has_hospice",
  "has_in_home_care",
  "has_independent_living",
  "has_memory_care",
  "has_skilled_nursing",
  "has_transportation",
  "insurance_list",
  "price_low",
  "price_high",
  "admission_coordinator",
  "admission_coordinator_phone",
  "admission_coordinator_email",
  "cities_served",
  "serviced_zipcodes",
  "uala_certified",
  "active",
].join(",");

const SERVICE_FLAGS = [
  ["has_assisted_living", "Assisted Living", "home-outline"],
  ["has_independent_living", "Independent Living", "home-outline"],
  ["has_memory_care", "Memory Care", "heart-outline"],
  ["has_skilled_nursing", "Skilled Nursing", "medical-outline"],
  ["has_home_health", "Home Health", "medkit-outline"],
  ["has_hospice", "Hospice", "heart-outline"],
  ["has_in_home_care", "In-Home Care", "people-outline"],
  ["has_dme", "Durable Medical Equipment", "construct-outline"],
  ["has_transportation", "Transportation", "car-outline"],
];

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm"]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(argv) {
  const options = {
    ownerEmail: DEFAULT_OWNER_EMAIL,
    limit: 10,
    offset: 0,
    facilityId: null,
    facilityIds: [],
    write: false,
    publish: true,
    updateExisting: false,
    activeOnly: true,
    all: false,
    inactiveOnly: false,
    mediaRows: true,
    coverMediaOnly: false,
    networkMetadataOnly: false,
    json: false,
    explicitScope: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      return value;
    };

    if (arg === "--write") options.write = true;
    else if (arg === "--publish") options.publish = true;
    else if (arg === "--draft") options.publish = false;
    else if (arg === "--update-existing") options.updateExisting = true;
    else if (arg === "--all") {
      options.all = true;
      options.explicitScope = true;
    } else if (arg === "--include-inactive") options.activeOnly = false;
    else if (arg === "--inactive-only") {
      options.activeOnly = false;
      options.inactiveOnly = true;
    }
    else if (arg === "--no-media-rows") options.mediaRows = false;
    else if (arg === "--cover-media-only") options.coverMediaOnly = true;
    else if (arg === "--network-metadata-only") options.networkMetadataOnly = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--owner-email") options.ownerEmail = next();
    else if (arg === "--facility-ids") {
      options.facilityIds = next()
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      options.explicitScope = true;
    }
    else if (arg === "--limit") {
      options.limit = Number.parseInt(next(), 10);
      options.explicitScope = true;
    } else if (arg === "--offset") options.offset = Number.parseInt(next(), 10);
    else if (arg === "--facility-id") {
      options.facilityId = next();
      options.explicitScope = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isInteger(options.offset) || options.offset < 0) {
    throw new Error("--offset must be a non-negative integer");
  }
  if (options.all && options.facilityId) {
    throw new Error("Use either --all or --facility-id, not both");
  }
  if (options.all && options.facilityIds.length) {
    throw new Error("Use either --all or --facility-ids, not both");
  }
  if (options.facilityId && options.facilityIds.length) {
    throw new Error("Use either --facility-id or --facility-ids, not both");
  }
  if (options.write && !options.explicitScope) {
    throw new Error("Write mode requires an explicit scope: --facility-id, --limit, or --all");
  }
  if (options.write && options.networkMetadataOnly && !options.updateExisting) {
    throw new Error("--network-metadata-only writes require --update-existing");
  }
  if (options.inactiveOnly && options.facilityId) {
    throw new Error("Use --include-inactive, not --inactive-only, with --facility-id");
  }
  if (options.inactiveOnly && options.facilityIds.length) {
    throw new Error("Use --include-inactive, not --inactive-only, with --facility-ids");
  }

  return options;
}

function printHelp() {
  console.log(`
Import PHN facilities into CrownPages.

Dry run, first 10 active facilities:
  node pages/tools/import-phn-facilities.mjs

Dry run one facility:
  node pages/tools/import-phn-facilities.mjs --facility-id <phn_facility_id>

Write a small batch as drafts:
  node pages/tools/import-phn-facilities.mjs --write --draft --limit 5

Write and publish all active facilities:
  node pages/tools/import-phn-facilities.mjs --write --all

Update one previously imported facility:
  node pages/tools/import-phn-facilities.mjs --write --update-existing --facility-id <phn_facility_id>

Options:
  --owner-email <email>   CrownPages owner email. Default: ${DEFAULT_OWNER_EMAIL}
  --facility-id <uuid>    Import one PHN facility.
  --facility-ids <ids>    Import a comma-separated list of PHN facilities.
  --limit <n>             Batch size. Default: 10.
  --offset <n>            Batch offset. Default: 0.
  --all                   Import all matching facilities.
  --include-inactive      Include inactive PHN facilities.
  --inactive-only         Import only inactive PHN facilities.
  --write                 Create rows. Default is dry-run only.
  --publish               Publish created/updated pages. This is the default.
  --draft                 Keep created/updated pages as drafts.
  --update-existing       Update an existing owner-owned page instead of skipping it.
  --no-media-rows         Do not create CrownPages media library rows.
  --cover-media-only      Copy only the hero and logo; omit galleries and videos.
  --network-metadata-only Update only existing pages' Network coordinates, pricing, and insurance metadata.
  --json                  Print full planned records as JSON.
`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function createSupabaseClients() {
  loadEnvFile(path.resolve(repoRoot, ".phn-import.env"));
  loadEnvFile(path.resolve(pagesDir, ".env.local"));

  const phnUrl = requireEnv("PHN_SUPABASE_URL");
  const phnKey =
    process.env.PHN_SUPABASE_SERVICE_ROLE_KEY || requireEnv("PHN_SUPABASE_ANON_KEY");
  const crownUrl =
    process.env.CROWNPAGES_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    requireEnv("SUPABASE_URL");
  const crownKey =
    process.env.CROWNPAGES_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    requireEnv("SUPABASE_SERVICE_KEY");

  return {
    phn: createClient(phnUrl, phnKey, { auth: { persistSession: false } }),
    crown: createClient(crownUrl, crownKey, { auth: { persistSession: false } }),
  };
}

function compactSlug(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

  return slug || "facility";
}

function firstPresent(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function cleanupText(value) {
  const text = firstPresent(value);
  if (!text) return "";

  return text
    .replace(/\b(can)\s+t\b/gi, "$1't")
    .replace(/\b(won)\s+t\b/gi, "$1't")
    .replace(/\b([A-Za-z]+)\s+(ll|re|ve|d|m|s)\b/g, "$1'$2")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPhoneNumber(value) {
  const text = firstPresent(value);
  if (!text) return "";

  const digits = text.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return text;
}

function formatAddress(facility, enrichment = {}) {
  const cityStateZip = [
    firstPresent(enrichment.city, facility.city),
    [firstPresent(enrichment.state, facility.state), firstPresent(enrichment.zipCode, facility.zip_code)]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [
    firstPresent(enrichment.streetAddress, facility.street_address, facility.original_address),
    firstPresent(enrichment.unit, facility.unit),
    cityStateZip,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseGenericList(value, objectKeys = ["name", "label", "value"]) {
  if (!value) return [];

  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  const rawItems = Array.isArray(parsed) ? parsed : [parsed];
  return [
    ...new Set(
      rawItems
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            for (const key of objectKeys) {
              if (item[key]) return item[key];
            }
          }
          return "";
        })
        .map((name) => String(name).trim())
        .filter(Boolean),
    ),
  ];
}

function parseInsuranceList(value) {
  const names = parseGenericList(value, ["name", "provider", "insurance", "label", "value"]);

  return names.map((name, index) => ({
    id: `insurance-${index + 1}`,
    name,
  }));
}

function getServedCityNames(facility) {
  return parseGenericList(facility.cities_served, [
    "name",
    "city",
    "label",
    "value",
  ])
    .map((item) => {
      const withoutState = String(item).replace(/,\s*[A-Z]{2}\b.*$/, "");
      return withoutState.trim();
    })
    .filter(Boolean);
}

function buildServiceAreaResourceLinks(facility, existingLinks = []) {
  const serviceNames = getServiceNames(facility);
  const hasServiceAreaLink = existingLinks.some((link) => link.id === "resource-service-area");
  if (hasServiceAreaLink) return [];
  if (
    !serviceNames.some((name) =>
      ["Home Health", "Hospice", "In-Home Care", "Durable Medical Equipment", "Transportation"].includes(name),
    )
  ) {
    return [];
  }

  const cityNames = getServedCityNames(facility);
  if (!cityNames.length) return [];

  const summaryNames = cityNames.slice(0, 5).join(", ");
  const title =
    cityNames.length > 5
      ? `Service Area: ${summaryNames} & More`
      : `Service Area: ${summaryNames}`;
  const enrichment = getProfileEnrichment(facility);

  return [
    {
      id: "resource-service-area",
      title,
      url: firstPresent(enrichment.website) || "https://www.medicare.gov/care-compare/",
      icon: "map",
    },
  ];
}

function getDefaultAmenitiesForServices(serviceNames) {
  if (serviceNames.includes("Skilled Nursing")) return SKILLED_NURSING_DEFAULT_AMENITIES;
  if (serviceNames.includes("Hospice")) return HOSPICE_DEFAULT_AMENITIES;
  if (serviceNames.includes("Home Health")) return HOME_HEALTH_DEFAULT_AMENITIES;
  if (serviceNames.includes("In-Home Care")) return IN_HOME_CARE_DEFAULT_AMENITIES;
  if (serviceNames.includes("Assisted Living")) return ASSISTED_LIVING_DEFAULT_AMENITIES;
  if (serviceNames.includes("Independent Living")) return INDEPENDENT_LIVING_DEFAULT_AMENITIES;
  if (serviceNames.includes("Memory Care")) return MEMORY_CARE_DEFAULT_AMENITIES;
  if (serviceNames.includes("Durable Medical Equipment")) return DME_DEFAULT_AMENITIES;
  if (serviceNames.includes("Transportation")) return TRANSPORTATION_DEFAULT_AMENITIES;
  return serviceNames;
}

function getShortDescriptionForServices(serviceNames) {
  if (serviceNames.includes("Skilled Nursing")) return "Skilled Nursing Facility";
  if (serviceNames.includes("Home Health") && serviceNames.includes("Hospice")) {
    return "Home Health and Hospice";
  }
  if (serviceNames.includes("Home Health")) return "Home Health";
  if (serviceNames.includes("Hospice")) return "Hospice";
  if (serviceNames.includes("In-Home Care")) return "In-Home Care";
  if (serviceNames.includes("Durable Medical Equipment")) return "Durable Medical Equipment";
  if (serviceNames.includes("Transportation")) return "Medical Transportation";
  if (serviceNames.includes("Assisted Living") && serviceNames.includes("Memory Care")) {
    return "Assisted Living / Memory Care";
  }
  if (serviceNames.includes("Assisted Living")) return "Assisted Living";
  if (serviceNames.includes("Independent Living")) return "Independent Living";
  if (serviceNames.includes("Memory Care")) return "Memory Care";
  if (serviceNames.length > 0) return serviceNames.join(" / ");
  return "Senior Living";
}

function inferPrimaryServiceFromName(facility) {
  const name = getFacilityDisplayName(facility).toLowerCase();
  if (name.includes("memory care")) return "Memory Care";
  if (name.includes("independent living")) return "Independent Living";
  if (name.includes("assisted living")) return "Assisted Living";
  if (name.includes("home health")) return "Home Health";
  if (name.includes("hospice")) return "Hospice";
  if (name.includes("homecare") || name.includes("home care")) return "In-Home Care";
  return "";
}

function buildAcceptedInsuranceResourceLinks(facility, existingLinks = []) {
  const hasExistingInsuranceLink = existingLinks.some(
    (link) => link.id === "resource-accepted-insurances",
  );
  if (hasExistingInsuranceLink) return [];

  const insuranceNames = parseInsuranceList(facility.insurance_list).map((item) => item.name);
  if (!insuranceNames.length) return [];

  const summaryNames = insuranceNames.slice(0, 4).join(", ");
  const title =
    insuranceNames.length > 4
      ? `Accepted Insurances: ${summaryNames} & More`
      : `Accepted Insurances: ${summaryNames}`;
  const enrichment = getProfileEnrichment(facility);

  return [
    {
      id: "resource-accepted-insurances",
      title,
      url: firstPresent(enrichment.website) || "https://www.medicare.gov/care-compare/",
      icon: "document",
    },
  ];
}

function mapServices(facility) {
  return SERVICE_FLAGS.filter(([flag]) => Boolean(facility[flag])).map(
    ([, name, icon], index) => ({
      id: `service-${index + 1}`,
      name,
      icon,
      available: "true",
    }),
  );
}

function getServiceNames(facility) {
  return SERVICE_FLAGS.filter(([flag]) => Boolean(facility[flag])).map(([, name]) => name);
}

function getShortDescription(facility) {
  const serviceNames = getServiceNames(facility);
  const inferredService = inferPrimaryServiceFromName(facility);
  if (inferredService && !serviceNames.includes("Skilled Nursing")) {
    return getShortDescriptionForServices([inferredService]);
  }
  return getShortDescriptionForServices(serviceNames);
}

function getContactName(facility) {
  return firstPresent(facility.admission_coordinator);
}

function getProfileEnrichment(facility) {
  return PROFILE_ENRICHMENTS[facility.id] || {};
}

function getFacilityDisplayName(facility) {
  const enrichment = getProfileEnrichment(facility);
  return firstPresent(enrichment.displayName, enrichment.facilityName, facility.facility);
}

function applyMediaEnrichmentOverrides(media, enrichment = {}) {
  if (enrichment.logoUrl) {
    media.logoUrl = enrichment.logoUrl;
    media.allAssets = media.allAssets.filter(
      (asset) => !/^logo\.(jpe?g|png|webp)$/i.test(asset.fileName || ""),
    );
  }

  if (enrichment.heroUrl) {
    media.heroUrl = enrichment.heroUrl;
  }

  return media;
}

function keepCoverMediaOnly(media) {
  const coverUrls = new Set([media.heroUrl, media.logoUrl].filter(Boolean));
  media.galleryImages = [];
  media.videos = [];
  media.allAssets = media.allAssets.filter((asset) => coverUrls.has(asset.url));
  return media;
}

function mapCertifications(facility) {
  const certifications = [];
  if (facility.uala_certified) {
    certifications.push({
      id: "certification-uala",
      name: "UALA Certified",
      icon: "ribbon-outline",
    });
  }
  return certifications;
}

function getExtension(fileName) {
  const extension = path.extname(fileName || "").replace(".", "").toLowerCase();
  return extension;
}

function getExtensionFromUrl(url) {
  try {
    const parsed = new URL(url);
    return getExtension(parsed.pathname);
  } catch {
    return getExtension(url);
  }
}

function imageExtensionForContentType(contentType) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

function mimeTypeForFile(fileName, fallbackType) {
  const extension = getExtension(fileName);
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "heic") return "image/heic";
  if (extension === "mp4" || extension === "m4v") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return fallbackType === "video" ? "video/mp4" : "image/jpeg";
}

function plannedOgImagePath(facilityId, heroUrl) {
  if (!heroUrl) return "";
  const extension = getExtensionFromUrl(heroUrl);
  const safeExtension = IMAGE_EXTENSIONS.has(extension) ? extension : "jpg";
  return `${CROWN_MEDIA_FOLDER_PREFIX}/${facilityId}/hero.${safeExtension}`;
}

async function uploadOgHeroImage(crown, facilityId, heroUrl) {
  if (!heroUrl) return "";

  const response = await fetch(heroUrl);
  if (!response.ok) {
    throw new Error(`Failed to download hero image for OG image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const extension = imageExtensionForContentType(contentType);
  const objectPath = `${CROWN_MEDIA_FOLDER_PREFIX}/${facilityId}/og/hero.${extension}`;
  const bytes = new Uint8Array(await response.arrayBuffer());
  const { error } = await crown.storage.from("uploads").upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
  return objectPath;
}

function crownMediaObjectPath(facilityId, sourcePath, fileName) {
  let relativePath = firstPresent(sourcePath, fileName);
  const facilityPrefix = `${facilityId}/`;

  if (relativePath.startsWith(facilityPrefix)) {
    relativePath = relativePath.slice(facilityPrefix.length);
  }

  relativePath = relativePath
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");

  if (!relativePath) {
    relativePath = `asset-${Date.now()}`;
  }

  return `${CROWN_MEDIA_FOLDER_PREFIX}/${facilityId}/${relativePath}`;
}

async function uploadRemoteAssetToCrown(crown, facilityId, asset) {
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(`Failed to download media ${asset.url}: ${response.status}`);
  }

  const contentType =
    response.headers.get("content-type") || mimeTypeForFile(asset.fileName, asset.type);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const objectPath = crownMediaObjectPath(facilityId, asset.path, asset.fileName);
  const { error } = await crown.storage.from("uploads").upload(objectPath, bytes, {
    contentType,
    upsert: true,
  });

  if (error) throw error;

  return {
    ...asset,
    sourceUrl: asset.url,
    url: objectPath,
    crownPath: objectPath,
    fileSize: bytes.byteLength,
    contentType,
  };
}

async function mirrorMediaToCrown(crown, facilityId, media) {
  const sourceToCrownPath = new Map();
  const mirroredAssets = [];

  for (const asset of media.allAssets) {
    if (sourceToCrownPath.has(asset.url)) {
      mirroredAssets.push({
        ...asset,
        sourceUrl: asset.url,
        url: sourceToCrownPath.get(asset.url),
        crownPath: sourceToCrownPath.get(asset.url),
      });
      continue;
    }

    const mirrored = await uploadRemoteAssetToCrown(crown, facilityId, asset);
    sourceToCrownPath.set(asset.url, mirrored.url);
    mirroredAssets.push(mirrored);
  }

  const resolveUrl = (url) => sourceToCrownPath.get(url) || url;

  media.heroUrl = resolveUrl(media.heroUrl);
  media.logoUrl = resolveUrl(media.logoUrl);
  media.galleryImages = media.galleryImages.map((image) => ({
    ...image,
    url: resolveUrl(image.url),
  }));
  media.videos = media.videos.map((video) => ({
    ...video,
    url: resolveUrl(video.url),
  }));
  media.allAssets = mirroredAssets;

  return media;
}

function isStorageFile(item) {
  return Boolean(item?.name) && item.name !== ".emptyFolderPlaceholder" && Boolean(item.id);
}

async function listStorageFolder(supabase, folderPath) {
  const { data, error } = await supabase.storage
    .from(PHN_MEDIA_BUCKET)
    .list(folderPath, { limit: 1000, sortBy: { column: "name", order: "asc" } });

  if (error) {
    return { items: [], warning: `${folderPath}: ${error.message}` };
  }

  return { items: data || [], warning: null };
}

function publicPhnUrl(supabase, objectPath) {
  return supabase.storage.from(PHN_MEDIA_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

async function resolveFacilityMedia(supabase, facilityId) {
  const warnings = [];
  const media = {
    heroUrl: "",
    logoUrl: "",
    galleryImages: [],
    videos: [],
    allAssets: [],
  };

  const root = await listStorageFolder(supabase, facilityId);
  if (root.warning) warnings.push(root.warning);

  for (const item of root.items.filter(isStorageFile)) {
    const lowerName = item.name.toLowerCase();
    const objectPath = `${facilityId}/${item.name}`;
    const extension = getExtension(item.name);
    const url = publicPhnUrl(supabase, objectPath);

    if (lowerName === "hero.jpg" || lowerName === "hero.jpeg" || lowerName === "hero.png") {
      media.heroUrl = url;
      media.allAssets.push({ path: objectPath, url, fileName: item.name, type: "image" });
    } else if (
      lowerName === "logo.jpg" ||
      lowerName === "logo.jpeg" ||
      lowerName === "logo.png"
    ) {
      media.logoUrl = url;
      media.allAssets.push({ path: objectPath, url, fileName: item.name, type: "image" });
    } else if (IMAGE_EXTENSIONS.has(extension)) {
      media.galleryImages.push({
        id: `gallery-${media.galleryImages.length + 1}`,
        url,
        caption: "",
      });
      media.allAssets.push({ path: objectPath, url, fileName: item.name, type: "image" });
    } else if (VIDEO_EXTENSIONS.has(extension)) {
      media.videos.push({ path: objectPath, url, fileName: item.name, type: "video" });
      media.allAssets.push({ path: objectPath, url, fileName: item.name, type: "video" });
    }
  }

  const imageFolder = await listStorageFolder(supabase, `${facilityId}/images`);
  if (imageFolder.warning) warnings.push(imageFolder.warning);
  for (const item of imageFolder.items.filter(isStorageFile)) {
    const extension = getExtension(item.name);
    if (!IMAGE_EXTENSIONS.has(extension)) continue;
    const objectPath = `${facilityId}/images/${item.name}`;
    const url = publicPhnUrl(supabase, objectPath);
    media.galleryImages.push({
      id: `gallery-${media.galleryImages.length + 1}`,
      url,
      caption: "",
    });
    media.allAssets.push({ path: objectPath, url, fileName: item.name, type: "image" });
  }

  const videoFolder = await listStorageFolder(supabase, `${facilityId}/videos`);
  if (videoFolder.warning) warnings.push(videoFolder.warning);
  for (const item of videoFolder.items.filter(isStorageFile)) {
    const extension = getExtension(item.name);
    if (!VIDEO_EXTENSIONS.has(extension)) continue;
    const objectPath = `${facilityId}/videos/${item.name}`;
    const url = publicPhnUrl(supabase, objectPath);
    media.videos.push({ path: objectPath, url, fileName: item.name, type: "video" });
    media.allAssets.push({ path: objectPath, url, fileName: item.name, type: "video" });
  }

  return { media, warnings };
}

function mapGalleryImages(media) {
  return media.galleryImages.map((image, index) => ({
    id: image.id || `image-${index + 1}`,
    url: image.url,
    alt: "",
    caption: cleanupText(image.caption),
  }));
}

function mapGalleryVideos(media) {
  return media.videos.map((video, index) => ({
    id: `video-${index + 1}`,
    url: video.url,
    thumbnail: media.heroUrl || media.logoUrl || "",
    caption: "",
  }));
}

function mapAmenities(facility) {
  const enrichment = getProfileEnrichment(facility);
  const serviceNames = getServiceNames(facility);
  const inferredService = inferPrimaryServiceFromName(facility);
  const names =
    enrichment.amenities?.length > 0
      ? enrichment.amenities
      : inferredService && !serviceNames.includes("Skilled Nursing")
        ? getDefaultAmenitiesForServices([inferredService])
      : getDefaultAmenitiesForServices(serviceNames);

  return names.map((name, index) => ({
    id: `amenity-${index + 1}`,
    name,
  }));
}

function buildStandardSections(facility, media) {
  const enrichment = getProfileEnrichment(facility);
  const displayName = getFacilityDisplayName(facility);
  const address = formatAddress(facility, enrichment);
  const serviceDescription = cleanupText(firstPresent(enrichment.serviceDescription, facility.service_description));
  const contactName = firstPresent(enrichment.contactName, getContactName(facility));
  const contactRole = contactName ? firstPresent(enrichment.contactRole, "Admissions Coordinator") : "";
  const mainPhone = formatPhoneNumber(firstPresent(enrichment.phone, facility.phone));
  const contactPhone = formatPhoneNumber(
    firstPresent(enrichment.contactPhone, facility.admission_coordinator_phone),
  );
  const contactCell = contactPhone && contactPhone !== mainPhone ? contactPhone : "";
  const contactEmail = firstPresent(enrichment.contactEmail, facility.admission_coordinator_email);
  const fax =
    enrichment.fax === false
      ? ""
      : formatPhoneNumber(firstPresent(enrichment.fax, facility.fax));
  const contactImageUrl = DEFAULT_CONTACT_IMAGE_URL;
  const website = firstPresent(enrichment.website);
  const socialLinks =
    enrichment.socialLinks?.length > 0
      ? enrichment.socialLinks
      : website
        ? [{ id: "social-website", platform: "website", url: website }]
        : [];
  const baseResourceLinks = enrichment.resources || [];
  const resourceLinks = [
    ...baseResourceLinks,
    ...buildServiceAreaResourceLinks(facility, baseResourceLinks),
    ...buildAcceptedInsuranceResourceLinks(facility, baseResourceLinks),
  ];
  const galleryImages = mapGalleryImages(media);
  const galleryVideos = mapGalleryVideos(media);
  const amenities = mapAmenities(facility);

  return [
    ...(media.heroUrl || media.logoUrl
      ? [
          {
            id: `hero-${facility.id}`,
            type: "hero",
            data: {
              backgroundImage: media.heroUrl || "",
              logoUrl: media.logoUrl || "",
            },
            styles: {},
          },
        ]
      : []),
    {
      id: `company-header-${facility.id}`,
      type: "companyHeader",
      data: {
        companyName: displayName,
        address,
      },
      styles: {},
    },
    {
      id: `contact-card-${facility.id}`,
      type: "contactCard",
      data: {
        name: contactName || displayName,
        role: contactRole,
        imageUrl: contactImageUrl,
        phone: contactPhone || mainPhone,
        email: contactEmail,
      },
      styles: {},
    },
    {
      id: `social-links-${facility.id}`,
      type: "socialLinks",
      data: {
        title: "Social Media",
        links: socialLinks,
      },
      styles: {},
    },
    ...(galleryImages.length > 0 || galleryVideos.length > 0
      ? [
          {
            id: `gallery-${facility.id}`,
            type: "gallery",
            data: {
              title: "Photos / Videos",
              images: galleryImages,
              videos: galleryVideos,
            },
            styles: {},
          },
        ]
      : []),
    {
      id: `about-${facility.id}`,
      type: "about",
      data: {
        title: "About Us",
        content: serviceDescription,
      },
      styles: {},
    },
    {
      id: `amenities-${facility.id}`,
      type: "amenities",
      data: {
        title: "Amenities",
        amenities,
      },
      styles: {},
    },
    {
      id: `pages-contact-${facility.id}`,
      type: "linksWithContact",
      data: {
        title: "Resources & Links",
        links: resourceLinks,
        contactName,
        contactRole,
        contactPhone: mainPhone,
        contactPhone2: contactCell,
        contactEmail,
        contactFax: fax,
        contactWebsite: website,
        contactImageUrl,
        contactStatus: "",
      },
      styles: {},
    },
  ];
}

function parsePrice(value) {
  if (value === null || value === undefined || value === "") return null;
  const number =
    typeof value === "number" ? value : Number(String(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getNetworkDiscoveryMetadata(facility) {
  const enrichment = getProfileEnrichment(facility);
  const zipCode = firstPresent(enrichment.zipCode, facility.zip_code).match(/[0-9]{5}/)?.[0];
  const coordinates = zipCode ? zipcodesUs.findCoordinates(zipCode) : null;
  const sourcePriceLow = parsePrice(facility.price_low);
  const sourcePriceHigh = parsePrice(facility.price_high);
  const priceLow =
    sourcePriceLow !== null && sourcePriceHigh !== null
      ? Math.min(sourcePriceLow, sourcePriceHigh)
      : sourcePriceLow;
  const priceHigh =
    sourcePriceLow !== null && sourcePriceHigh !== null
      ? Math.max(sourcePriceLow, sourcePriceHigh)
      : sourcePriceHigh;
  const acceptedInsurances = parseInsuranceList(facility.insurance_list).map(
    (insurance) => insurance.name,
  );

  return {
    latitude: coordinates?.isValid ? coordinates.latitude : null,
    longitude: coordinates?.isValid ? coordinates.longitude : null,
    priceLow,
    priceHigh,
    pricePeriod: priceLow !== null || priceHigh !== null ? "month" : null,
    acceptedInsurances,
  };
}

function buildPageRecords({ facility, ownerId, businessSlug, pageSlug, media, publish }) {
  const now = new Date().toISOString();
  const enrichment = getProfileEnrichment(facility);
  const displayName = getFacilityDisplayName(facility);
  const description = firstPresent(enrichment.shortDescription, getShortDescription(facility));
  const serviceDescription = cleanupText(firstPresent(enrichment.serviceDescription, facility.service_description));
  const sections = buildStandardSections(facility, media);
  const network = getNetworkDiscoveryMetadata(facility);

  const business = {
    name: displayName,
    owner_id: ownerId,
    slug: businessSlug,
    description: serviceDescription || description || null,
    logo_url: media.logoUrl || null,
    phone: formatPhoneNumber(firstPresent(enrichment.phone, facility.phone)) || null,
    street_address:
      firstPresent(enrichment.streetAddress, facility.street_address, facility.original_address) || null,
    city: firstPresent(enrichment.city, facility.city) || null,
    state: firstPresent(enrichment.state, facility.state) || null,
    zip_code: firstPresent(enrichment.zipCode, facility.zip_code) || null,
    country: "United States",
    website: firstPresent(enrichment.website) || null,
    is_active: true,
  };

  const page = {
    title: displayName,
    description: description || null,
    slug: pageSlug,
    business_id: null,
    created_by: ownerId,
    content: {
      sections,
      importSource: {
        source: "phn",
        facilityId: facility.id,
        network,
      },
    },
    media_urls: media.allAssets.map((asset) => asset.url),
    og_image_url: media.ogImagePath || media.heroUrl || media.logoUrl || null,
    favicon_image_url: media.logoUrl || null,
    meta_title: displayName,
    meta_description: description || null,
    og_title: displayName,
    og_description: description || null,
    is_published: publish,
    is_active: true,
    published_at: publish ? now : null,
    publish_settings: {
      pageFeatures: {
        includeInstaConnect: true,
        includeScheduleMeeting: true,
      },
      importSource: {
        source: "phn",
        facilityId: facility.id,
        importedAt: now,
      },
    },
  };

  const mediaRows = media.allAssets.map((asset) => ({
    business_id: null,
    uploaded_by: ownerId,
    file_name: asset.fileName,
    file_type: mimeTypeForFile(asset.fileName, asset.type),
    file_url: asset.url,
    folder: `phn-import/${facility.id}`,
    tags: ["phn-import", facility.id],
  }));

  return { business, page, mediaRows };
}

async function getOwner(crown, email) {
  const { data, error } = await crown
    .from("users")
    .select("id,email")
    .ilike("email", email)
    .limit(1);

  if (error) throw error;
  if (!data?.length) throw new Error(`No CrownPages user found for ${email}`);
  return data[0];
}

async function fetchFacilities(phn, options) {
  let query = phn.from("facilities").select(FACILITY_SELECT).order("facility", {
    ascending: true,
  });

  if (options.activeOnly) query = query.eq("active", true);
  if (options.inactiveOnly) query = query.eq("active", false);
  if (options.facilityId) {
    query = query.eq("id", options.facilityId).limit(1);
  } else if (options.facilityIds.length) {
    query = query.in("id", options.facilityIds);
  } else if (!options.all) {
    query = query.range(options.offset, options.offset + options.limit - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findBusinessBySlug(crown, slug) {
  const { data, error } = await crown
    .from("businesses")
    .select("id,owner_id,name,slug")
    .eq("slug", slug)
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function findBusinessById(crown, businessId) {
  const { data, error } = await crown
    .from("businesses")
    .select("id,owner_id,name,slug")
    .eq("id", businessId)
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function findPageByBusinessAndSlug(crown, businessId, slug) {
  const { data, error } = await crown
    .from("pages")
    .select("id,title,slug,business_id")
    .eq("business_id", businessId)
    .eq("slug", slug)
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

async function findPageByImportSource(crown, ownerId, facilityId) {
  const { data, error } = await crown
    .from("pages")
    .select("id,title,slug,business_id,content")
    .eq("created_by", ownerId)
    .eq("content->importSource->>facilityId", facilityId)
    .eq("is_active", true)
    .eq("is_published", true)
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function syncNetworkMetadataOnly(crown, owner, facilities, options) {
  const plans = [];

  for (const facility of facilities) {
    const page = await findPageByImportSource(crown, owner.id, facility.id);
    const network = getNetworkDiscoveryMetadata(facility);
    const plan = {
      facilityId: facility.id,
      facility: getFacilityDisplayName(facility),
      pageId: page?.id || null,
      coordinates: network.latitude !== null && network.longitude !== null,
      price: network.priceLow !== null || network.priceHigh !== null,
      insurancePlans: network.acceptedInsurances.length,
      network,
      skipped: !page,
      reason: page ? null : "No matching imported CrownPages profile",
    };

    if (options.write && page) {
      const content = objectValue(page.content);
      const importSource = objectValue(content.importSource);
      const { error } = await crown
        .from("pages")
        .update({
          content: {
            ...content,
            importSource: {
              ...importSource,
              source: "phn",
              facilityId: facility.id,
              network,
            },
          },
        })
        .eq("id", page.id);

      if (error) throw error;
    }

    plans.push(plan);
  }

  const summary = {
    mode: options.write ? "WRITE" : "DRY RUN",
    operation: "NETWORK METADATA ONLY",
    ownerEmail: owner.email,
    facilities: facilities.length,
    matched: plans.filter((plan) => !plan.skipped).length,
    skipped: plans.filter((plan) => plan.skipped).length,
    withCoordinates: plans.filter((plan) => !plan.skipped && plan.coordinates).length,
    withPrice: plans.filter((plan) => !plan.skipped && plan.price).length,
    withInsurance: plans.filter((plan) => !plan.skipped && plan.insurancePlans > 0).length,
    plans,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Mode: ${summary.mode}`);
  console.log(`Operation: ${summary.operation}`);
  console.log(`Owner: ${summary.ownerEmail}`);
  console.log(`Facilities loaded: ${summary.facilities}`);
  console.log(`Matched profiles: ${summary.matched}`);
  console.log(`With coordinates: ${summary.withCoordinates}`);
  console.log(`With pricing: ${summary.withPrice}`);
  console.log(`With insurance: ${summary.withInsurance}`);
  console.log(`Skipped: ${summary.skipped}`);
}

async function resolveBusinessPlan(crown, ownerId, facilityName, reservedSlugs, options) {
  const baseSlug = compactSlug(facilityName);

  for (let index = 0; index < 200; index += 1) {
    const slug = index === 0 ? baseSlug : `${baseSlug}${index + 1}`;
    if (reservedSlugs.has(slug)) continue;

    const existing = await findBusinessBySlug(crown, slug);
    if (!existing) {
      reservedSlugs.add(slug);
      return {
        slug,
        existingBusiness: null,
        skipReason: null,
        slugNote: index > 0 ? `base slug ${baseSlug} was unavailable` : null,
      };
    }

    if (existing.owner_id === ownerId) {
      reservedSlugs.add(slug);
      return {
        slug,
        existingBusiness: existing,
        skipReason: options.updateExisting ? null : `business slug already exists for owner: ${slug}`,
        slugNote: null,
      };
    }
  }

  throw new Error(`Could not find an available slug for ${facilityName}`);
}

async function insertImport(crown, plan, options) {
  const { records } = plan;
  let business = plan.existingBusiness;

  if (business && options.updateExisting) {
    const { data: updatedBusiness, error: businessError } = await crown
      .from("businesses")
      .update(records.business)
      .eq("id", business.id)
      .select("id,slug")
      .single();

    if (businessError) throw businessError;
    business = updatedBusiness;
  } else {
    const { data: insertedBusiness, error: businessError } = await crown
      .from("businesses")
      .insert(records.business)
      .select("id,slug")
      .single();

    if (businessError) throw businessError;
    business = insertedBusiness;
  }

  const pagePayload = {
    ...records.page,
    business_id: business.id,
  };

  let page = plan.existingPage;
  if (page && options.updateExisting) {
    const { data: updatedPage, error: pageError } = await crown
      .from("pages")
      .update(pagePayload)
      .eq("id", page.id)
      .select("id,slug")
      .single();

    if (pageError) throw pageError;
    page = updatedPage;
  } else {
    const { data: insertedPage, error: pageError } = await crown
      .from("pages")
      .insert(pagePayload)
      .select("id,slug")
      .single();

    if (pageError) throw pageError;
    page = insertedPage;
  }

  let mediaInserted = 0;
  if (options.mediaRows && records.mediaRows.length > 0) {
    if (options.updateExisting) {
      const { error: deleteMediaError } = await crown
        .from("media")
        .delete()
        .eq("business_id", business.id)
        .eq("folder", `phn-import/${plan.facility.id}`);

      if (deleteMediaError) throw deleteMediaError;
    }

    const mediaPayload = records.mediaRows.map((row) => ({
      ...row,
      business_id: business.id,
    }));
    const { data: mediaRows, error: mediaError } = await crown
      .from("media")
      .insert(mediaPayload)
      .select("id");

    if (mediaError) throw mediaError;
    mediaInserted = mediaRows?.length || 0;
  }

  return {
    businessId: business.id,
    pageId: page.id,
    mediaInserted,
  };
}

function summarizePlan(plan) {
  const sectionTypes = plan.records.page.content.sections.map((section) => section.type);
  const gallerySection = plan.records.page.content.sections.find((section) => section.type === "gallery");

  return {
    facilityId: plan.facility.id,
    facility: getFacilityDisplayName(plan.facility),
    sourceFacility: plan.facility.facility,
    address:
      firstPresent(plan.facility.street_address, plan.facility.original_address) || null,
    city: firstPresent(plan.facility.city) || null,
    state: firstPresent(plan.facility.state) || null,
    phone: formatPhoneNumber(firstPresent(getProfileEnrichment(plan.facility).phone, plan.facility.phone)) || null,
    website: firstPresent(getProfileEnrichment(plan.facility).website, plan.facility.website) || null,
    action: plan.skipReason ? "skip" : plan.existingPage ? "update" : "create",
    reason: plan.skipReason || null,
    slugNote: plan.slugNote || null,
    url: `/${plan.businessSlug}/${plan.pageSlug}`,
    shortDescription: plan.records.page.description,
    sectionTypes,
    hero: Boolean(plan.media.heroUrl),
    logo: Boolean(plan.media.logoUrl),
    galleryImages: gallerySection?.data?.images?.length || 0,
    videos: gallerySection?.data?.videos?.length || 0,
    mediaAssets: plan.media.allAssets.length,
    amenities:
      plan.records.page.content.sections.find((section) => section.type === "amenities")?.data
        ?.amenities?.length || 0,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { phn, crown } = createSupabaseClients();
  const owner = await getOwner(crown, options.ownerEmail);
  const facilities = await fetchFacilities(phn, options);

  if (options.networkMetadataOnly) {
    await syncNetworkMetadataOnly(crown, owner, facilities, options);
    return;
  }

  const reservedSlugs = new Set();
  const warnings = [];
  const plans = [];

  for (const facility of facilities) {
    const enrichment = getProfileEnrichment(facility);
    const displayName = getFacilityDisplayName(facility);
    const importedPage = await findPageByImportSource(crown, owner.id, facility.id);
    const importedBusiness = importedPage
      ? await findBusinessById(crown, importedPage.business_id)
      : null;
    const slugPlan = importedBusiness
      ? {
          slug: importedBusiness.slug,
          existingBusiness: importedBusiness,
          skipReason: options.updateExisting
            ? null
            : `page already imported for owner: /${importedBusiness.slug}/${importedPage.slug}`,
          slugNote: null,
        }
      : await resolveBusinessPlan(
          crown,
          owner.id,
          displayName,
          reservedSlugs,
          options,
        );
    const { media, warnings: mediaWarnings } = await resolveFacilityMedia(phn, facility.id);
    warnings.push(...mediaWarnings);
    if (options.coverMediaOnly) keepCoverMediaOnly(media);
    if (options.write) {
      await mirrorMediaToCrown(crown, facility.id, media);
    } else {
      media.ogImagePath = plannedOgImagePath(facility.id, media.heroUrl);
    }
    applyMediaEnrichmentOverrides(media, enrichment);
    if (options.write) {
      media.ogImagePath = media.heroUrl || media.logoUrl || "";
    }

    let skipReason = slugPlan.skipReason;
    let existingPage = importedPage || null;
    if (slugPlan.existingBusiness) {
      existingPage ||= await findPageByBusinessAndSlug(
          crown,
          slugPlan.existingBusiness.id,
          slugPlan.slug,
        );
      if (existingPage && !options.updateExisting) {
        skipReason ||= `page already exists for owner: /${slugPlan.slug}/${existingPage.slug}`;
      }
    }

    const records = buildPageRecords({
      facility,
      ownerId: owner.id,
      businessSlug: slugPlan.slug,
      pageSlug: slugPlan.slug,
      media,
      publish: options.publish,
    });

    plans.push({
      facility,
      businessSlug: slugPlan.slug,
      pageSlug: slugPlan.slug,
      media,
      records,
      existingBusiness: slugPlan.existingBusiness,
      existingPage,
      skipReason,
      slugNote: slugPlan.slugNote,
    });
  }

  const results = [];
  if (options.write) {
    for (const plan of plans) {
      if (plan.skipReason) {
        results.push({ facility: getFacilityDisplayName(plan.facility), skipped: true, reason: plan.skipReason });
        continue;
      }
      const inserted = await insertImport(crown, plan, options);
      results.push({ facility: getFacilityDisplayName(plan.facility), skipped: false, ...inserted });
    }
  }

  const summary = {
    mode: options.write ? "WRITE" : "DRY RUN",
    ownerEmail: owner.email,
    ownerId: owner.id,
    publish: options.publish,
    activeOnly: options.activeOnly,
    facilities: facilities.length,
    createCount: plans.filter((plan) => !plan.skipReason && !plan.existingPage).length,
    updateCount: plans.filter((plan) => !plan.skipReason && plan.existingPage).length,
    skipCount: plans.filter((plan) => plan.skipReason).length,
    warnings: warnings.filter(Boolean),
    plans: plans.map(summarizePlan),
    results,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Mode: ${summary.mode}`);
  console.log(`Owner: ${summary.ownerEmail} (${summary.ownerId})`);
  console.log(`Facilities loaded: ${summary.facilities}`);
  console.log(`Will create: ${summary.createCount}`);
  console.log(`Will update: ${summary.updateCount}`);
  console.log(`Will skip: ${summary.skipCount}`);
  console.log(`Publish pages: ${summary.publish ? "yes" : "no, drafts only"}`);
  if (summary.warnings.length) {
    console.log(`Storage warnings: ${summary.warnings.length}`);
  }

  for (const item of summary.plans) {
    const prefix =
      item.action === "skip"
        ? "SKIP"
        : item.action === "update" && options.write
          ? "UPDATED"
          : item.action === "update"
            ? "WOULD UPDATE"
            : options.write
              ? "CREATED"
              : "WOULD CREATE";
    console.log(
      `${prefix}: ${item.facility} -> ${item.url} ` +
        `(hero:${item.hero ? "yes" : "no"}, logo:${item.logo ? "yes" : "no"}, ` +
        `images:${item.galleryImages}, videos:${item.videos}, amenities:${item.amenities}, ` +
        `short:${item.shortDescription || "none"})`,
    );
    if (item.reason) console.log(`  reason: ${item.reason}`);
    if (item.slugNote) console.log(`  note: ${item.slugNote}`);
  }

  for (const result of results) {
    if (result.skipped) continue;
    console.log(
      `Wrote ${result.facility}: business=${result.businessId}, page=${result.pageId}, media=${result.mediaInserted}`,
    );
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
