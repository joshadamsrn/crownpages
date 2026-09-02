# Obtain Media Implementation Plan

## Goal

Turn `Obtain Media` into an internal hybrid tool that:

- discovers media and relevant links from a target website
- stores only job metadata and results in Supabase
- avoids filling Supabase Storage with bulk scraped files
- hands off a downloadable manifest to a local Mac worker
- lets engineers review local Desktop folders and only upload what they actually want to use

## Product Principles

- The browser launches jobs and reviews results.
- The backend crawler discovers pages, assets, and social links.
- Supabase stores metadata only.
- Bulk files are downloaded locally by an internal desktop worker.
- Engineers stay in control of what ultimately gets imported into a page.

## Delivery Model

### Web app responsibilities

- launch and track media collection jobs
- crawl target websites on the server
- store discovered pages, assets, and social URLs in Supabase
- rank and preview results in the builder
- let engineers import chosen assets into the page builder
- generate a desktop-worker manifest JSON

### Desktop worker responsibilities

- read the downloaded manifest JSON
- create a company folder on the Desktop
- create subfolders for photos, PDFs, videos, and reports
- download the listed assets into those folders
- write `social-links.csv`
- write `discovery-report.txt`
- write `failed-downloads.txt` when needed

### Supabase responsibilities

- job state
- crawl progress
- discovered pages
- discovered asset metadata
- social links
- summary report metadata

Supabase should **not** be the archive for all scraped files.

## Current Phase 1 Scope

- job launcher UI in the web builder
- server-side crawl job creation
- internal link discovery
- image, PDF/document, video, and social-link extraction
- in-app results review
- one-click import helpers:
  - `Use as Hero`
  - `Add to Gallery`
  - `Add to Pages`
  - `Assign Social Link`
- downloadable desktop-worker manifest
- local Mac worker scaffold

## User Workflow

1. Admin opens `Obtain Media`.
2. Enters company name and source URL.
3. Launches the crawl job.
4. Watches progress in the builder.
5. Reviews discovered assets in-app.
6. Downloads the desktop-worker manifest.
7. Runs the local worker.
8. Reviews files in `~/Desktop/[Company Name]/...`.
9. Imports only the useful assets into the page.
10. Deletes the local folder whenever it is no longer needed.

## Supabase Data Model

### `media_collection_jobs`

Purpose:
- top-level crawl/discovery record

Important fields:
- `created_by`
- `page_id`
- `business_id`
- `company_name`
- `source_url`
- `status`
- `current_stage`
- `options`
- `pages_scanned`
- `assets_found`
- `assets_downloaded`
  - used here as the count of assets prepared for desktop download
- `duplicates_skipped`
- `failures_count`
- `report`
- `last_error`
- `completed_at`

### `media_collection_pages`

Purpose:
- discovered/visited site pages

### `media_collection_assets`

Purpose:
- discovered asset metadata only

Important note:
- no bulk file payloads
- no storage upload path is required for the desktop-worker architecture

### `media_collection_social_links`

Purpose:
- normalized social URLs and confidence scores

## Desktop Worker Contract

The web app emits a JSON manifest with:

- job details
- crawl options
- folder naming plan
- categorized asset URLs
- social links
- summary report metadata

The worker reads that manifest and downloads:

- `images` -> `[Company Name] Photos`
- `pdfs` and `documents` -> `[Company Name] PDFs`
- `videos` -> `[Company Name] Videos`

It also writes:

- `social-links.csv`
- `discovery-report.txt`

## What Makes It Good

- engineers can preview and rank media in-app before downloading
- unused assets never bloat Supabase storage
- local files are easy to inspect and delete
- import actions let the best assets go straight into the builder

## Next Steps

### Phase 2

- better asset scoring and hero/logo detection
- targeted YouTube discovery
- ProfessionalHealthNetwork discovery
- improved social profile confidence

### Phase 3

- richer preview cards with inline thumbnails
- replace-vs-append import choices
- best-guess auto-import suggestions
- optional tighter desktop helper integration for internal admins
