#!/usr/bin/env python3

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen


USER_AGENT = "CrownPagesObtainMediaWorker/1.0 (+https://crownpages.com)"
CHUNK_SIZE = 65536
TIMEOUT_SECONDS = 45


def clean_segment(value: str, fallback: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\u0000-\u001F]+', " ", (value or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or fallback


def clean_filename(value: str, fallback: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\u0000-\u001F]+', "_", (value or "").strip())
    return cleaned or fallback


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    counter = 2
    while True:
        candidate = path.with_name(f"{stem}-{counter}{suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def guess_extension(url: str, mime_type: str | None) -> str:
    suffix = Path(urlparse(url).path).suffix
    if suffix:
        return suffix

    mime = (mime_type or "").lower()
    if "jpeg" in mime:
        return ".jpg"
    if "png" in mime:
        return ".png"
    if "webp" in mime:
        return ".webp"
    if "gif" in mime:
        return ".gif"
    if "pdf" in mime:
        return ".pdf"
    if "mp4" in mime:
        return ".mp4"
    return ""


def download_file(url: str, destination: Path) -> None:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response, open(destination, "wb") as handle:
        while True:
            chunk = response.read(CHUNK_SIZE)
            if not chunk:
                break
            handle.write(chunk)


def load_manifest(path: Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure_dirs(root: Path, folders: dict[str, str]) -> dict[str, Path]:
    reports_dir = root / folders["reportsFolderName"]
    dirs = {
        "root": root,
        "photos": root / folders["photosFolderName"],
        "pdfs": root / folders["pdfsFolderName"],
        "videos": root / folders["videosFolderName"],
        "reports": reports_dir,
    }
    for directory in dirs.values():
        directory.mkdir(parents=True, exist_ok=True)
    return dirs


def write_social_links_csv(path: Path, social_links: list[dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["platform", "url", "discovered_from", "confidence_score"])
        for item in social_links:
            writer.writerow(
                [
                    item.get("platform", ""),
                    item.get("url", ""),
                    item.get("discoveredFrom", ""),
                    item.get("confidenceScore", ""),
                ]
            )


def write_report(path: Path, manifest: dict[str, Any], summary: dict[str, Any], failures: list[str]) -> None:
    lines = [
        f"Company: {manifest['job']['companyName']}",
        f"Source URL: {manifest['job']['sourceUrl']}",
        f"Pages scanned: {manifest['job']['pagesScanned']}",
        f"Assets found: {manifest['job']['assetsFound']}",
        f"Duplicates skipped: {manifest['job']['duplicatesSkipped']}",
        f"Failures recorded by crawl: {manifest['job']['failuresCount']}",
        "",
        "Desktop worker summary:",
        f"Files downloaded: {summary['downloaded']}",
        f"Download failures: {len(failures)}",
        "",
    ]

    notes = manifest.get("report", {}).get("notes", [])
    if notes:
        lines.append("Notes:")
        for note in notes:
            lines.append(f"- {note}")
        lines.append("")

    if failures:
        lines.append("Failures:")
        lines.extend(f"- {failure}" for failure in failures)

    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))


def choose_target_dir(asset_type: str, dirs: dict[str, Path]) -> Path:
    if asset_type == "image":
        return dirs["photos"]
    if asset_type in {"pdf", "document"}:
        return dirs["pdfs"]
    if asset_type == "video":
        return dirs["videos"]
    return dirs["root"]


def download_asset_group(
    assets: list[dict[str, Any]],
    dirs: dict[str, Path],
    failures: list[str],
) -> int:
    downloaded = 0
    for asset in assets:
        asset_url = str(asset.get("assetUrl") or "").strip()
        if not asset_url:
            continue

        asset_type = str(asset.get("assetType") or "document")
        base_name = clean_filename(
            str(asset.get("cleanFilename") or asset.get("filename") or "file"),
            "file",
        )

        extension = Path(base_name).suffix or guess_extension(asset_url, asset.get("mimeType"))
        if extension and not base_name.endswith(extension):
            base_name = f"{base_name}{extension}"

        target_dir = choose_target_dir(asset_type, dirs)
        output_path = unique_path(target_dir / base_name)

        try:
            download_file(asset_url, output_path)
            downloaded += 1
            print(f"Downloaded: {output_path}", flush=True)
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{asset_url} -> {exc}")
            print(f"Failed: {asset_url} -> {exc}", file=sys.stderr, flush=True)

    return downloaded


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, help="Path to a Crown Pages desktop manifest JSON file.")
    parser.add_argument(
        "--desktop-root",
        default="~/Desktop",
        help="Root folder where the company folder should be created. Defaults to ~/Desktop.",
    )
    args = parser.parse_args()

    manifest_path = Path(args.manifest).expanduser()
    desktop_root = Path(args.desktop_root).expanduser()

    if not manifest_path.exists():
        raise SystemExit(f"Manifest not found: {manifest_path}")

    manifest = load_manifest(manifest_path)
    company_root_name = clean_segment(
        manifest.get("folders", {}).get("rootFolderName", manifest.get("job", {}).get("companyName", "Company")),
        "Company",
    )
    root_dir = desktop_root / company_root_name
    dirs = ensure_dirs(root_dir, manifest["folders"])

    failures: list[str] = []
    downloaded_count = 0
    assets = manifest.get("assets", {})

    for bucket_name in ("images", "pdfs", "documents", "videos"):
        downloaded_count += download_asset_group(
            list(assets.get(bucket_name, [])),
            dirs,
            failures,
        )

    write_social_links_csv(dirs["reports"] / "social-links.csv", list(manifest.get("socialLinks", [])))
    write_report(
        dirs["reports"] / "discovery-report.txt",
        manifest,
        {"downloaded": downloaded_count},
        failures,
    )

    if failures:
        with open(dirs["reports"] / "failed-downloads.txt", "w", encoding="utf-8") as handle:
            handle.write("\n".join(failures))

    print("===== OBTAIN MEDIA DESKTOP WORKER =====", flush=True)
    print(f"Company folder: {root_dir}", flush=True)
    print(f"Downloaded files: {downloaded_count}", flush=True)
    print(f"Failures: {len(failures)}", flush=True)


if __name__ == "__main__":
    main()
