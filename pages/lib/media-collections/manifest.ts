import type {
  MediaCollectionAsset,
  MediaCollectionDesktopManifest,
  MediaCollectionDesktopManifestAsset,
  MediaCollectionJobSummary,
  MediaCollectionSocialLink,
} from "@/lib/media-collections/types";

function sanitizeFolderSegment(value: string) {
  return (value || "Company")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapAsset(asset: MediaCollectionAsset): MediaCollectionDesktopManifestAsset {
  return {
    id: asset.id,
    assetType: asset.assetType,
    assetUrl: asset.assetUrl,
    sourcePageUrl: asset.sourcePageUrl,
    filename: asset.filename,
    cleanFilename: asset.cleanFilename,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    byteSize: asset.byteSize,
    qualityScore: asset.qualityScore,
    metadata: asset.metadata,
  };
}

export function buildDesktopMediaManifest(params: {
  job: MediaCollectionJobSummary;
  assets: MediaCollectionAsset[];
  socialLinks: MediaCollectionSocialLink[];
}) {
  const { job, assets, socialLinks } = params;
  const companyName = sanitizeFolderSegment(job.companyName);

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    deliveryMode: "desktop-worker",
    job: {
      id: job.id,
      pageId: job.pageId,
      businessId: job.businessId,
      companyName,
      sourceUrl: job.sourceUrl,
      options: job.options,
      pagesScanned: job.pagesScanned,
      assetsFound: job.assetsFound,
      duplicatesSkipped: job.duplicatesSkipped,
      failuresCount: job.failuresCount,
    },
    folders: {
      rootFolderName: companyName,
      photosFolderName: `${companyName} Photos`,
      pdfsFolderName: `${companyName} PDFs`,
      videosFolderName: `${companyName} Videos`,
      reportsFolderName: `${companyName} Reports`,
    },
    assets: {
      images: assets.filter((asset) => asset.assetType === "image" && !asset.isDuplicate).map(mapAsset),
      pdfs: assets.filter((asset) => asset.assetType === "pdf" && !asset.isDuplicate).map(mapAsset),
      videos: assets.filter((asset) => asset.assetType === "video" && !asset.isDuplicate).map(mapAsset),
      documents: assets
        .filter((asset) => asset.assetType === "document" && !asset.isDuplicate)
        .map(mapAsset),
    },
    socialLinks,
    report: {
      summary:
        typeof job.report.summary === "string"
          ? job.report.summary
          : "Desktop manifest generated for Obtain Media.",
      pagesScanned: job.pagesScanned,
      assetsFound: job.assetsFound,
      duplicatesSkipped: job.duplicatesSkipped,
      failuresCount: job.failuresCount,
      sourceUrl: job.sourceUrl,
      notes: [
        "This manifest is intended for the Crown Pages local desktop worker.",
        "The worker downloads files to organized Desktop folders and does not upload bulk media to Supabase.",
      ],
      ...job.report,
    },
  } satisfies MediaCollectionDesktopManifest;
}
