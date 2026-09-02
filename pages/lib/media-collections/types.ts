export type MediaCollectionStage =
  | "queued"
  | "discovering-pages"
  | "extracting-assets"
  | "downloading-assets"
  | "organizing-export"
  | "completed"
  | "failed";

export type MediaCollectionStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type MediaCollectionAssetType =
  | "image"
  | "pdf"
  | "video"
  | "document"
  | "social_url"
  | "youtube_url"
  | "phn_url";

export type MediaCollectionOptions = {
  searchSubpages: boolean;
  collectImages: boolean;
  collectPdfs: boolean;
  collectVideos: boolean;
  searchSocialProfiles: boolean;
  searchYoutube: boolean;
  searchProfessionalHealthNetwork: boolean;
  maxDepth: number;
  maxPages: number;
};

export type MediaCollectionJobSummary = {
  id: string;
  pageId: string | null;
  businessId: string | null;
  companyName: string;
  sourceUrl: string;
  status: MediaCollectionStatus;
  currentStage: MediaCollectionStage;
  options: MediaCollectionOptions;
  pagesScanned: number;
  assetsFound: number;
  assetsDownloaded: number;
  duplicatesSkipped: number;
  failuresCount: number;
  report: Record<string, unknown>;
  desktopManifestReady: boolean;
  deliveryMode: "desktop-worker";
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
};

export type MediaCollectionAsset = {
  id: string;
  assetType: MediaCollectionAssetType;
  sourcePageUrl: string | null;
  assetUrl: string;
  normalizedAssetUrl: string;
  filename: string | null;
  cleanFilename: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  storagePath: string | null;
  contentHash: string | null;
  qualityScore: number | null;
  isDuplicate: boolean;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

export type MediaCollectionSocialLink = {
  id: string;
  platform: string;
  url: string;
  confidenceScore: number | null;
  discoveredFrom: string | null;
  createdAt: string | null;
};

export type MediaCollectionResults = {
  images: MediaCollectionAsset[];
  pdfs: MediaCollectionAsset[];
  videos: MediaCollectionAsset[];
  documents: MediaCollectionAsset[];
  socialLinks: MediaCollectionSocialLink[];
};

export type MediaCollectionDesktopManifestAsset = {
  id: string;
  assetType: MediaCollectionAssetType;
  assetUrl: string;
  sourcePageUrl: string | null;
  filename: string | null;
  cleanFilename: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  qualityScore: number | null;
  metadata: Record<string, unknown>;
};

export type MediaCollectionDesktopManifest = {
  version: "1.0";
  generatedAt: string;
  deliveryMode: "desktop-worker";
  job: {
    id: string;
    pageId: string | null;
    businessId: string | null;
    companyName: string;
    sourceUrl: string;
    options: MediaCollectionOptions;
    pagesScanned: number;
    assetsFound: number;
    duplicatesSkipped: number;
    failuresCount: number;
  };
  folders: {
    rootFolderName: string;
    photosFolderName: string;
    pdfsFolderName: string;
    videosFolderName: string;
    reportsFolderName: string;
  };
  assets: {
    images: MediaCollectionDesktopManifestAsset[];
    pdfs: MediaCollectionDesktopManifestAsset[];
    videos: MediaCollectionDesktopManifestAsset[];
    documents: MediaCollectionDesktopManifestAsset[];
  };
  socialLinks: MediaCollectionSocialLink[];
  report: Record<string, unknown>;
};

export const DEFAULT_MEDIA_COLLECTION_OPTIONS: MediaCollectionOptions = {
  searchSubpages: true,
  collectImages: true,
  collectPdfs: true,
  collectVideos: true,
  searchSocialProfiles: true,
  searchYoutube: false,
  searchProfessionalHealthNetwork: false,
  maxDepth: 2,
  maxPages: 50,
};
