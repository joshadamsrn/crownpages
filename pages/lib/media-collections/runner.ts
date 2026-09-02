import { createAdminClient } from "@/lib/supabase/admin";
import { discoverAssetsAndLinksFromHtml } from "@/lib/media-collections/site-discovery";
import { guessFilenameFromUrl } from "@/lib/media-collections/url-utils";
import type {
  MediaCollectionAssetType,
  MediaCollectionOptions,
} from "@/lib/media-collections/types";

type JobRow = {
  id: string;
  created_by: string;
  page_id: string | null;
  business_id: string | null;
  company_name: string;
  source_url: string;
  options: MediaCollectionOptions;
};

type PageVisit = {
  url: string;
  depth: number;
};

type StoredAssetRow = {
  asset_type: MediaCollectionAssetType;
};

const MAX_MEDIA_COLLECTION_RUN_MS = 120_000;

function buildRunnerUserAgent() {
  return "CrownPagesMediaCollector/1.0 (+https://crownpages.com)";
}

function isAssetTypeEnabled(assetType: MediaCollectionAssetType, options: MediaCollectionOptions) {
  switch (assetType) {
    case "image":
      return options.collectImages;
    case "pdf":
    case "document":
      return options.collectPdfs;
    case "video":
      return options.collectVideos;
    default:
      return false;
  }
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || null;
}

function deriveCleanFilename(assetUrl: string) {
  const guessed = guessFilenameFromUrl(assetUrl, "asset");
  return guessed.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "_");
}

function shouldKeepSocialPlatform(platform: string, options: MediaCollectionOptions) {
  if (platform === "youtube") {
    return options.searchYoutube || options.searchSocialProfiles;
  }

  if (platform === "professionalhealthnetwork") {
    return options.searchProfessionalHealthNetwork;
  }

  return options.searchSocialProfiles;
}

function summarizeStageMessage(summary: string, patch?: Record<string, unknown>) {
  return {
    summary,
    ...(patch || {}),
  };
}

async function fetchPageHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": buildRunnerUserAgent(),
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type");
    const html = contentType?.includes("text/html") ? await response.text() : "";

    return {
      ok: response.ok,
      status: response.status,
      contentType,
      html,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function touchJob(
  adminSupabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  patch: Record<string, unknown>,
) {
  await adminSupabase
    .from("media_collection_jobs")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function collectDiscoveredAssets(
  adminSupabase: ReturnType<typeof createAdminClient>,
  typedJob: JobRow,
) {
  const startedAt = Date.now();
  const deadlineAt = startedAt + MAX_MEDIA_COLLECTION_RUN_MS;
  const visitedUrls = new Set<string>();
  const queuedUrls = new Set<string>();
  const assetUrls = new Set<string>();
  const socialUrls = new Set<string>();
  const queue: PageVisit[] = [{ url: typedJob.source_url, depth: 0 }];
  queuedUrls.add(typedJob.source_url);

  let pagesScanned = 0;
  let assetsFound = 0;
  let duplicatesSkipped = 0;
  let failuresCount = 0;

  while (
    queue.length &&
    pagesScanned < typedJob.options.maxPages &&
    Date.now() < deadlineAt
  ) {
    const current = queue.shift();
    if (!current || visitedUrls.has(current.url)) {
      continue;
    }

    visitedUrls.add(current.url);

    const { data: pageRecord } = await adminSupabase
      .from("media_collection_pages")
      .insert({
        job_id: typedJob.id,
        url: current.url,
        normalized_url: current.url,
        depth: current.depth,
        status: "visiting",
      })
      .select("id")
      .single();

    const pageRecordId = pageRecord?.id ?? null;

    try {
      const pageResponse = await fetchPageHtml(current.url);
      const pageTitle = pageResponse.html ? extractTitle(pageResponse.html) : null;

      await adminSupabase
        .from("media_collection_pages")
        .update({
          status: pageResponse.ok ? "visited" : "failed",
          visited_at: new Date().toISOString(),
          http_status: pageResponse.status,
          content_type: pageResponse.contentType,
          title: pageTitle,
          error_message: pageResponse.ok ? null : `HTTP ${pageResponse.status}`,
        })
        .eq("id", pageRecordId);

      if (!pageResponse.ok || !pageResponse.html) {
        failuresCount += 1;
        await touchJob(adminSupabase, typedJob.id, {
          pages_scanned: pagesScanned,
          failures_count: failuresCount,
          report: summarizeStageMessage("A page failed to load during discovery.", {
            lastVisitedUrl: current.url,
          }),
        });
        continue;
      }

      const discovered = discoverAssetsAndLinksFromHtml({
        html: pageResponse.html,
        pageUrl: current.url,
        startUrl: typedJob.source_url,
        searchSubpages: typedJob.options.searchSubpages,
      });

      await touchJob(adminSupabase, typedJob.id, {
        current_stage: "extracting-assets",
      });

      for (const asset of discovered.assets) {
        if (!isAssetTypeEnabled(asset.assetType, typedJob.options)) {
          continue;
        }

        if (assetUrls.has(asset.assetUrl)) {
          duplicatesSkipped += 1;
          continue;
        }

        assetUrls.add(asset.assetUrl);
        assetsFound += 1;

        await adminSupabase.from("media_collection_assets").insert({
          job_id: typedJob.id,
          page_record_id: pageRecordId,
          asset_type: asset.assetType,
          source_page_url: asset.sourcePageUrl,
          asset_url: asset.assetUrl,
          normalized_asset_url: asset.assetUrl,
          filename: guessFilenameFromUrl(asset.assetUrl, "asset"),
          clean_filename: deriveCleanFilename(asset.assetUrl),
          metadata: {
            ...(asset.metadata ?? {}),
            discovered_from: "html",
            page_title: pageTitle,
            depth: current.depth,
          },
        });
      }

      for (const socialLink of discovered.socialLinks) {
        if (!shouldKeepSocialPlatform(socialLink.platform, typedJob.options)) {
          continue;
        }

        if (socialUrls.has(socialLink.url)) {
          continue;
        }

        socialUrls.add(socialLink.url);
        await adminSupabase.from("media_collection_social_links").insert({
          job_id: typedJob.id,
          platform: socialLink.platform,
          url: socialLink.url,
          confidence_score: socialLink.confidenceScore,
          discovered_from: socialLink.discoveredFrom,
        });
      }

      if (typedJob.options.searchSubpages && current.depth < typedJob.options.maxDepth) {
        for (const nextPageUrl of discovered.nextPageUrls) {
          if (visitedUrls.has(nextPageUrl) || queuedUrls.has(nextPageUrl)) {
            continue;
          }

          if (visitedUrls.size + queue.length >= typedJob.options.maxPages) {
            break;
          }

          queue.push({
            url: nextPageUrl,
            depth: current.depth + 1,
          });
          queuedUrls.add(nextPageUrl);
        }
      }

      pagesScanned += 1;
      await touchJob(adminSupabase, typedJob.id, {
        current_stage: queue.length ? "discovering-pages" : "organizing-export",
        pages_scanned: pagesScanned,
        assets_found: assetsFound,
        duplicates_skipped: duplicatesSkipped,
        failures_count: failuresCount,
        report: summarizeStageMessage("Media crawl in progress.", {
          lastVisitedUrl: current.url,
          queuedPages: queue.length,
          socialLinksFound: socialUrls.size,
        }),
      });
    } catch (pageError) {
      failuresCount += 1;
      await adminSupabase
        .from("media_collection_pages")
        .update({
          status: "failed",
          visited_at: new Date().toISOString(),
          error_message:
            pageError instanceof Error ? pageError.message : "Failed to fetch page.",
        })
        .eq("id", pageRecordId);

      await touchJob(adminSupabase, typedJob.id, {
        failures_count: failuresCount,
        report: summarizeStageMessage("Media crawl encountered a page-level error.", {
          lastVisitedUrl: current.url,
        }),
      });
    }
  }

  return {
    pagesScanned,
    assetsFound,
    duplicatesSkipped,
    failuresCount,
    socialLinksFound: socialUrls.size,
    stoppedByTimeLimit: queue.length > 0 && Date.now() >= deadlineAt,
    remainingQueuedPages: queue.length,
  };
}

async function summarizeDiscoveredAssets(
  adminSupabase: ReturnType<typeof createAdminClient>,
  typedJob: JobRow,
  counters: {
    pagesScanned: number;
    assetsFound: number;
    duplicatesSkipped: number;
    failuresCount: number;
    socialLinksFound: number;
    stoppedByTimeLimit: boolean;
    remainingQueuedPages: number;
  },
) {
  const { data: assets, error: assetsError } = await adminSupabase
    .from("media_collection_assets")
    .select("asset_type")
    .eq("job_id", typedJob.id)
    .order("created_at", { ascending: true });

  if (assetsError) {
    throw new Error(assetsError.message);
  }

  const { data: socialLinks, error: socialError } = await adminSupabase
    .from("media_collection_social_links")
    .select("platform, url, discovered_from, confidence_score")
    .eq("job_id", typedJob.id)
    .order("created_at", { ascending: true });

  if (socialError) {
    throw new Error(socialError.message);
  }

  const typedAssets = (assets ?? []) as unknown as StoredAssetRow[];
  const imageCount = typedAssets.filter((asset) => asset.asset_type === "image").length;
  const pdfCount = typedAssets.filter((asset) => asset.asset_type === "pdf").length;
  const documentCount = typedAssets.filter((asset) => asset.asset_type === "document").length;
  const videoCount = typedAssets.filter((asset) => asset.asset_type === "video").length;
  const assetManifestCount = imageCount + pdfCount + documentCount + videoCount;
  const failuresCount = counters.failuresCount;
  const duplicatesSkipped = counters.duplicatesSkipped;

  await touchJob(adminSupabase, typedJob.id, {
    current_stage: "organizing-export",
    assets_downloaded: assetManifestCount,
    duplicates_skipped: duplicatesSkipped,
    failures_count: failuresCount,
    report: summarizeStageMessage("Preparing desktop worker manifest.", {
      assetManifestCount,
      socialLinksFound: (socialLinks ?? []).length,
      stoppedByTimeLimit: counters.stoppedByTimeLimit,
      remainingQueuedPages: counters.remainingQueuedPages,
    }),
  });

  return {
    assetsDownloaded: assetManifestCount,
    duplicatesSkipped,
    failuresCount,
    imageCount,
    pdfCount,
    documentCount,
    videoCount,
    socialLinksFound: (socialLinks ?? []).length,
  };
}

export async function runMediaCollectionJob(jobId: string) {
  const adminSupabase = createAdminClient();

  const { data: job, error: jobError } = await adminSupabase
    .from("media_collection_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    throw new Error(jobError?.message || "Media collection job not found.");
  }

  const typedJob = job as unknown as JobRow;

  await adminSupabase.from("media_collection_pages").delete().eq("job_id", jobId);
  await adminSupabase.from("media_collection_assets").delete().eq("job_id", jobId);
  await adminSupabase.from("media_collection_social_links").delete().eq("job_id", jobId);

  await touchJob(adminSupabase, jobId, {
    status: "running",
    current_stage: "discovering-pages",
    pages_scanned: 0,
    assets_found: 0,
    assets_downloaded: 0,
    duplicates_skipped: 0,
    failures_count: 0,
    last_error: null,
    completed_at: null,
    report: summarizeStageMessage("Crawl started. Crown Pages will prepare a desktop worker manifest when discovery is complete."),
  });

  try {
    const crawlCounters = await collectDiscoveredAssets(adminSupabase, typedJob);
    const manifestCounters = await summarizeDiscoveredAssets(
      adminSupabase,
      typedJob,
      crawlCounters,
    );

    await touchJob(adminSupabase, jobId, {
      status: "completed",
      current_stage: "completed",
      completed_at: new Date().toISOString(),
      pages_scanned: crawlCounters.pagesScanned,
      assets_found: crawlCounters.assetsFound,
      assets_downloaded: manifestCounters.assetsDownloaded,
      duplicates_skipped: manifestCounters.duplicatesSkipped,
      failures_count: manifestCounters.failuresCount,
      report: summarizeStageMessage("Media crawl completed.", {
        pagesScanned: crawlCounters.pagesScanned,
        assetsFound: crawlCounters.assetsFound,
        assetsReadyForDesktopDownload: manifestCounters.assetsDownloaded,
        socialLinksFound: crawlCounters.socialLinksFound,
        duplicatesSkipped: manifestCounters.duplicatesSkipped,
        failuresCount: manifestCounters.failuresCount,
        desktopManifestReady: true,
        deliveryMode: "desktop-worker",
        imageCount: manifestCounters.imageCount,
        pdfCount: manifestCounters.pdfCount,
        documentCount: manifestCounters.documentCount,
        videoCount: manifestCounters.videoCount,
        stoppedByTimeLimit: crawlCounters.stoppedByTimeLimit,
        remainingQueuedPages: crawlCounters.remainingQueuedPages,
      }),
    });
  } catch (error) {
    await touchJob(adminSupabase, jobId, {
      status: "failed",
      current_stage: "failed",
      completed_at: new Date().toISOString(),
      last_error: error instanceof Error ? error.message : "Media collection failed.",
      report: summarizeStageMessage("Media crawl failed."),
    });

    throw error;
  }
}
