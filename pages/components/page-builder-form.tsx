"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { jsPDF } from "jspdf";
import { CheckCircle2, Download, Eye, FileSearch, Loader2, Minimize2, Paperclip, Plus, QrCode, Save, Sparkles, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import { type BusinessData } from "@crown-pages/types";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/database.types";
import { MobileNativePreview } from "@/components/mobile-native-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getBuilderSectionDefinition,
  type BuilderFieldDefinition as FieldDefinition,
} from "@/lib/builder-section-definitions";
import {
  buildPageBuilderCreatePayload,
  buildPageBuilderUpdatePayload,
} from "@/lib/page-source-of-truth";
import {
  DEFAULT_MEDIA_COLLECTION_OPTIONS,
  type MediaCollectionJobSummary,
  type MediaCollectionOptions,
  type MediaCollectionResults,
} from "@/lib/media-collections/types";
import { uploadImageFile } from "@/lib/heic-upload-client";

const MEDIA_ACTIVITY_MESSAGES = [
  "Fetching the next page...",
  "Checking image and video sources...",
  "Filtering icons and duplicate assets...",
  "Organizing saved media...",
];

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type PageRow = Database["public"]["Tables"]["pages"]["Row"];

type PageSection = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles?: Record<string, unknown>;
};

type BuilderPage = Pick<
  PageRow,
  | "id"
  | "title"
  | "description"
  | "slug"
  | "business_id"
  | "content"
  | "og_image_url"
  | "favicon_image_url"
  | "publish_settings"
  | "is_published"
  | "is_active"
  | "updated_at"
>;

type MediaImageAsset = MediaCollectionResults["images"][number];
type MediaDocumentAsset = MediaCollectionResults["pdfs"][number] | MediaCollectionResults["documents"][number];
type MediaVideoAsset = MediaCollectionResults["videos"][number];
type MediaSocialLink = MediaCollectionResults["socialLinks"][number];

interface PageBuilderFormProps {
  businesses: BusinessRow[];
  initialPage?: BuilderPage | null;
  canObtainMedia?: boolean;
}

const DEFAULT_NEW_PAGE_SECTION_TYPES = [
  "hero",
  "companyHeader",
  "contactCard",
  "gallery",
  "about",
  "amenities",
  "linksWithContact",
] as const;

const IPHONE_17_PRO_VIEWPORT_WIDTH = 402;
const IPHONE_17_PRO_VIEWPORT_HEIGHT = 874;
const IPHONE_17_PRO_SHELL_WIDTH = 430;
const IPHONE_17_PRO_SHELL_HEIGHT = 932;
const IPHONE_17_PRO_OUTER_PADDING = 10;
const IPHONE_17_PRO_INNER_PADDING = 9;
const IPHONE_17_PRO_CONTENT_SCALE = 0.885;
const IPHONE_17_PRO_STATUS_TOP = 18;
const IPHONE_17_PRO_STATUS_SIDE = 28;
const IPHONE_17_PRO_ISLAND_WIDTH = 126;
const IPHONE_17_PRO_ISLAND_HEIGHT = 36;
const IPHONE_17_PRO_BROWSER_TOPBAR_HEIGHT = 44;
const IPHONE_17_PRO_BROWSER_BOTTOMBAR_HEIGHT = 52;
const IPHONE_17_PRO_BROWSER_CONTENT_MAX_HEIGHT =
  IPHONE_17_PRO_VIEWPORT_HEIGHT -
  IPHONE_17_PRO_BROWSER_TOPBAR_HEIGHT -
  IPHONE_17_PRO_BROWSER_BOTTOMBAR_HEIGHT;

function isLikelyLogoAsset(asset: Pick<MediaImageAsset, "assetUrl" | "filename" | "cleanFilename" | "metadata">) {
  const haystack = [
    asset.assetUrl,
    asset.filename,
    asset.cleanFilename,
    typeof asset.metadata?.altText === "string" ? asset.metadata.altText : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /logo|brand|mark|favicon|icon/.test(haystack);
}

function getImageRecommendationScore(asset: Pick<MediaImageAsset, "qualityScore" | "width" | "height" | "assetUrl" | "filename" | "cleanFilename" | "metadata">) {
  let score = asset.qualityScore ?? 0;
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const ratio = height > 0 ? width / height : 1;

  if (width >= 1200) score += 24;
  if (width >= 1800) score += 18;
  if (ratio >= 1.2 && ratio <= 2.2) score += 30;
  if (ratio < 0.9) score -= 20;
  if (isLikelyLogoAsset(asset)) score -= 40;

  return score;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeDefaultData<T>(value: T): T {
  if (typeof value === "string") {
    return "" as T;
  }

  if (Array.isArray(value)) {
    return [] as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeDefaultData(nestedValue)]),
    ) as T;
  }

  return value;
}

function buildStableSectionId(type: string, key: string | number) {
  return `${type}-${key}`;
}

function createSection(type: string, options?: { id?: string }): PageSection {
  const definition = getBuilderSectionDefinition(type);

  return {
    id:
      options?.id ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${type}-${Date.now()}`),
    type,
    data: deepClone(sanitizeDefaultData(definition?.defaultData || {})),
    styles: {},
  };
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeStoragePath(value?: string | null) {
  if (!value) return "";

  let normalized = value.trim();
  if (!normalized) return "";

  if (normalized.startsWith("http")) {
    const marker = "/object/public/uploads/";
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex !== -1) {
      normalized = normalized.substring(markerIndex + marker.length);
    }
  }

  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }

  return normalized;
}

function buildPublicUploadUrl(path?: string | null) {
  const normalized = normalizeStoragePath(path);
  if (!normalized) return "";
  if (path?.startsWith("http://") || path?.startsWith("https://")) {
    return path;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/uploads/${normalized}` : normalized;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to data URL."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(blob);
  });
}

async function fetchImageDataUrl(url?: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

function getImageFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.includes("image/png") || dataUrl.includes("image/webp") ? "PNG" : "JPEG";
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  if (!/^[\da-fA-F]{6}$/.test(value)) {
    return { r: 47, g: 72, b: 88 };
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function mixHexColors(baseHex: string, targetHex: string, ratio: number) {
  const base = hexToRgb(baseHex);
  const target = hexToRgb(targetHex);
  const mix = Math.max(0, Math.min(1, ratio));

  return rgbToHex(
    base.r + (target.r - base.r) * mix,
    base.g + (target.g - base.g) * mix,
    base.b + (target.b - base.b) * mix,
  );
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function dataUrlToImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image."));
    image.src = dataUrl;
  });
}

function fitWithinBox(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  if (!sourceWidth || !sourceHeight) {
    return { width: maxWidth, height: maxHeight };
  }

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
  };
}

async function getDominantLogoColor(dataUrl?: string | null) {
  if (!dataUrl || typeof document === "undefined") {
    return "#2f4858";
  }

  try {
    const image = await dataUrlToImage(dataUrl);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return "#2f4858";

    const sampleSize = 60;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    context.drawImage(image, 0, 0, sampleSize, sampleSize);
    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);

    let red = 0;
    let green = 0;
    let blue = 0;
    let total = 0;

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha < 32) continue;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 242) continue;

      red += r;
      green += g;
      blue += b;
      total += 1;
    }

    if (!total) return "#2f4858";

    const toHex = (value: number) => value.toString(16).padStart(2, "0");
    return `#${toHex(Math.round(red / total))}${toHex(Math.round(green / total))}${toHex(Math.round(blue / total))}`;
  } catch {
    return "#2f4858";
  }
}

async function createQrStandArtwork(options: {
  companyName: string;
  heroDataUrl?: string | null;
  logoDataUrl: string;
  qrDataUrl: string;
  primaryColor: string;
}) {
  const canvas = document.createElement("canvas");
  const width = 1500;
  const height = 2100;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to create QR stand artwork.");
  }

  const primaryColor = options.primaryColor || "#24426a";
  const accentGold = mixHexColors(primaryColor, "#d4a03d", 0.72);
  const accentBlue = mixHexColors(primaryColor, "#15396b", 0.28);
  const softCream = "#f7f3eb";
  const borderGold = mixHexColors(accentGold, "#f5dd96", 0.35);

  const [logoImage, qrImage, heroImage] = await Promise.all([
    dataUrlToImage(options.logoDataUrl),
    dataUrlToImage(options.qrDataUrl),
    options.heroDataUrl ? dataUrlToImage(options.heroDataUrl).catch(() => null) : Promise.resolve(null),
  ]);

  context.fillStyle = softCream;
  context.fillRect(0, 0, width, height);

  if (heroImage) {
    const scale = Math.max(width / heroImage.width, height / heroImage.height);
    const drawWidth = heroImage.width * scale;
    const drawHeight = heroImage.height * scale;
    const drawX = (width - drawWidth) / 2;
    const drawY = (height - drawHeight) / 2;

    context.save();
    context.filter = "blur(18px) saturate(1.1)";
    context.globalAlpha = 0.88;
    context.drawImage(heroImage, drawX - 18, drawY - 18, drawWidth + 36, drawHeight + 36);
    context.restore();

    const fadeGradient = context.createLinearGradient(0, 0, 0, height);
    fadeGradient.addColorStop(0, "rgba(255,255,255,0.58)");
    fadeGradient.addColorStop(0.35, "rgba(255,255,255,0.42)");
    fadeGradient.addColorStop(1, "rgba(247,243,235,0.84)");
    context.fillStyle = fadeGradient;
    context.fillRect(0, 0, width, height);
  } else {
    const backgroundGradient = context.createLinearGradient(0, 0, 0, height);
    backgroundGradient.addColorStop(0, mixHexColors("#ffffff", accentBlue, 0.12));
    backgroundGradient.addColorStop(1, softCream);
    context.fillStyle = backgroundGradient;
    context.fillRect(0, 0, width, height);
  }

  const sunlight = context.createRadialGradient(width / 2, 160, 60, width / 2, 360, 820);
  sunlight.addColorStop(0, "rgba(255,255,255,0.92)");
  sunlight.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = sunlight;
  context.fillRect(0, 0, width, height);

  const logoBox = fitWithinBox(logoImage.width, logoImage.height, 460, 220);
  context.drawImage(logoImage, width / 2 - logoBox.width / 2, 86, logoBox.width, logoBox.height);

  const companyName = options.companyName.trim();
  const nameWords = companyName.split(/\s+/).filter(Boolean);
  const firstLine = companyName.length > 20 && nameWords.length > 1
    ? nameWords.slice(0, Math.ceil(nameWords.length / 2)).join(" ")
    : companyName;
  const secondLine = firstLine === companyName ? "" : nameWords.slice(Math.ceil(nameWords.length / 2)).join(" ");

  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillStyle = primaryColor;
  context.font = "600 86px Georgia, 'Times New Roman', serif";
  context.fillText(firstLine, width / 2, 338);
  if (secondLine) {
    context.fillText(secondLine, width / 2, 430);
  }

  context.fillStyle = accentGold;
  context.font = "600 44px Georgia, 'Times New Roman', serif";
  context.fillText("Virtual Tour", width / 2, secondLine ? 536 : 468);
  context.strokeStyle = rgbaFromHex(accentGold, 0.75);
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(width / 2 - 280, secondLine ? 552 : 484);
  context.lineTo(width / 2 + 280, secondLine ? 552 : 484);
  context.stroke();

  const frameX = 290;
  const frameY = secondLine ? 650 : 580;
  const frameSize = 920;
  const qrSize = 600;
  const qrCardSize = 690;
  const qrCardX = width / 2 - qrCardSize / 2;
  const qrCardY = frameY + 120;
  const qrX = width / 2 - qrSize / 2;
  const qrY = qrCardY + (qrCardSize - qrSize) / 2;

  context.strokeStyle = rgbaFromHex(borderGold, 0.95);
  context.lineWidth = 7;
  context.strokeRect(frameX, frameY, frameSize, frameSize);

  context.fillStyle = "rgba(255,255,255,0.34)";
  context.fillRect(frameX + 22, frameY + 22, frameSize - 44, frameSize - 44);

  context.save();
  context.shadowColor = "rgba(17,24,39,0.15)";
  context.shadowBlur = 28;
  context.fillStyle = "rgba(255,255,255,0.96)";
  const cornerRadius = 34;
  context.beginPath();
  context.moveTo(qrCardX + cornerRadius, qrCardY);
  context.lineTo(qrCardX + qrCardSize - cornerRadius, qrCardY);
  context.quadraticCurveTo(qrCardX + qrCardSize, qrCardY, qrCardX + qrCardSize, qrCardY + cornerRadius);
  context.lineTo(qrCardX + qrCardSize, qrCardY + qrCardSize - cornerRadius);
  context.quadraticCurveTo(qrCardX + qrCardSize, qrCardY + qrCardSize, qrCardX + qrCardSize - cornerRadius, qrCardY + qrCardSize);
  context.lineTo(qrCardX + cornerRadius, qrCardY + qrCardSize);
  context.quadraticCurveTo(qrCardX, qrCardY + qrCardSize, qrCardX, qrCardY + qrCardSize - cornerRadius);
  context.lineTo(qrCardX, qrCardY + cornerRadius);
  context.quadraticCurveTo(qrCardX, qrCardY, qrCardX + cornerRadius, qrCardY);
  context.closePath();
  context.fill();
  context.restore();

  context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  context.fillStyle = primaryColor;
  context.font = "600 46px Georgia, 'Times New Roman', serif";
  context.fillText("Scan Here", width / 2, frameY + frameSize + 88);

  context.strokeStyle = rgbaFromHex(borderGold, 0.68);
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(250, frameY + frameSize + 128);
  context.lineTo(width - 250, frameY + frameSize + 128);
  context.stroke();

  const footerTop = height - 430;
  context.save();
  context.beginPath();
  context.moveTo(0, footerTop + 70);
  context.bezierCurveTo(width * 0.18, footerTop + 10, width * 0.38, footerTop + 112, width * 0.54, footerTop + 58);
  context.bezierCurveTo(width * 0.73, footerTop - 4, width * 0.88, footerTop + 34, width, footerTop);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();

  const footerGradient = context.createLinearGradient(0, footerTop, width, height);
  footerGradient.addColorStop(0, mixHexColors(accentBlue, "#1f4f86", 0.18));
  footerGradient.addColorStop(0.55, mixHexColors(accentBlue, "#2b67aa", 0.12));
  footerGradient.addColorStop(1, mixHexColors(accentBlue, "#163c6c", 0.08));
  context.fillStyle = footerGradient;
  context.fill();
  context.restore();

  context.save();
  context.beginPath();
  context.moveTo(0, footerTop + 34);
  context.bezierCurveTo(width * 0.18, footerTop - 22, width * 0.37, footerTop + 78, width * 0.56, footerTop + 18);
  context.bezierCurveTo(width * 0.76, footerTop - 48, width * 0.91, footerTop + 8, width, footerTop - 18);
  context.strokeStyle = "#f6deb5";
  context.lineWidth = 18;
  context.stroke();

  context.beginPath();
  context.moveTo(0, footerTop + 56);
  context.bezierCurveTo(width * 0.2, footerTop + 2, width * 0.38, footerTop + 98, width * 0.58, footerTop + 38);
  context.bezierCurveTo(width * 0.79, footerTop - 20, width * 0.92, footerTop + 28, width, footerTop + 4);
  context.strokeStyle = accentGold;
  context.lineWidth = 7;
  context.stroke();
  context.restore();

  context.fillStyle = "#ffffff";
  context.font = "400 34px Helvetica, Arial, sans-serif";
  context.fillText("Powered by", width / 2, height - 238);

  context.strokeStyle = "rgba(255,255,255,0.65)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(width / 2 - 260, height - 252);
  context.lineTo(width / 2 - 110, height - 252);
  context.moveTo(width / 2 + 110, height - 252);
  context.lineTo(width / 2 + 260, height - 252);
  context.stroke();

  context.font = "italic 700 78px Georgia, 'Times New Roman', serif";
  context.fillText("Crown Pages", width / 2, height - 136);

  context.strokeStyle = "rgba(255,255,255,0.5)";
  context.beginPath();
  context.moveTo(width / 2 - 290, height - 120);
  context.lineTo(width / 2 + 290, height - 120);
  context.stroke();

  return canvas.toDataURL("image/png");
}

function splitQrFlyerCommunityName(companyName: string) {
  const words = companyName
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);

  if (words.length <= 1) {
    return [companyName.trim().toUpperCase()];
  }

  if (words.length === 2) {
    return words.map((word) => word.toUpperCase());
  }

  const firstLineWordCount = Math.ceil(words.length / 2);
  return [
    words.slice(0, firstLineWordCount).join(" ").toUpperCase(),
    words.slice(firstLineWordCount).join(" ").toUpperCase(),
  ];
}

function drawCenteredFittedText(
  doc: jsPDF,
  text: string,
  y: number,
  options: {
    maxWidth: number;
    fontSize: number;
    fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
    fontFamily?: "helvetica" | "times";
    charSpace?: number;
  },
) {
  const fontFamily = options.fontFamily || "helvetica";
  const fontStyle = options.fontStyle || "normal";
  let fontSize = options.fontSize;

  doc.setFont(fontFamily, fontStyle);
  doc.setFontSize(fontSize);
  doc.setCharSpace(options.charSpace || 0);

  while (fontSize > 12 && doc.getTextWidth(text) > options.maxWidth) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
  }

  doc.text(text, 306, y, { align: "center" });
  doc.setCharSpace(0);
  return fontSize;
}

function drawCenteredTrackedText(
  doc: jsPDF,
  text: string,
  y: number,
  options: {
    centerX: number;
    fontSize: number;
    fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
    fontFamily?: "helvetica" | "times";
    letterSpacing?: number;
  },
) {
  const fontFamily = options.fontFamily || "helvetica";
  const fontStyle = options.fontStyle || "normal";
  const letterSpacing = options.letterSpacing || 0;
  const characters = text.split("");

  doc.setFont(fontFamily, fontStyle);
  doc.setFontSize(options.fontSize);
  doc.setCharSpace(0);

  const characterWidths = characters.map((character) => doc.getTextWidth(character));
  const textWidth =
    characterWidths.reduce((total, width) => total + width, 0) +
    Math.max(0, characters.length - 1) * letterSpacing;
  let cursorX = options.centerX - textWidth / 2;

  characters.forEach((character, index) => {
    doc.text(character, cursorX, y);
    cursorX += characterWidths[index] + letterSpacing;
  });
}

async function normalizeImageDataUrl(dataUrl: string) {
  const image = await dataUrlToImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return { dataUrl, image };
  }

  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  context.drawImage(image, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    image,
  };
}

async function drawQrFlyerImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const normalized = await normalizeImageDataUrl(dataUrl);
  const fitted = fitWithinBox(
    normalized.image.naturalWidth || normalized.image.width,
    normalized.image.naturalHeight || normalized.image.height,
    maxWidth,
    maxHeight,
  );
  const imageX = x + (maxWidth - fitted.width) / 2;
  const imageY = y + (maxHeight - fitted.height) / 2;

  doc.addImage(normalized.dataUrl, "PNG", imageX, imageY, fitted.width, fitted.height, undefined, "FAST");
  return {
    width: fitted.width,
    height: fitted.height,
    x: imageX,
    y: imageY,
  };
}

async function createQrFlyerPdf(options: {
  companyName: string;
  logoDataUrl: string;
  qrDataUrl: string;
  crownPagesLogoDataUrl: string;
}) {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
  });

  const pageWidth = 612;
  const pageHeight = 792;
  const centerX = pageWidth / 2;
  const black = "#050505";

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  const logoBox = await drawQrFlyerImage(doc, options.logoDataUrl, centerX - 215, 34, 430, 150);
  let cursorY = Math.max(218, logoBox.y + logoBox.height + 34);

  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(1.1);
  doc.line(centerX - 214, cursorY, centerX + 214, cursorY);

  cursorY += 54;
  doc.setTextColor(black);
  drawCenteredFittedText(doc, "VIRTUAL TOUR", cursorY, {
    maxWidth: 390,
    fontFamily: "times",
    fontStyle: "bold",
    fontSize: 36,
  });
  cursorY += 42;
  drawCenteredFittedText(doc, "& INFO PACKET", cursorY, {
    maxWidth: 390,
    fontFamily: "times",
    fontStyle: "bold",
    fontSize: 36,
  });

  const qrSize = 300;
  cursorY += 26;
  doc.addImage(options.qrDataUrl, getImageFormat(options.qrDataUrl), centerX - qrSize / 2, cursorY, qrSize, qrSize, undefined, "FAST");

  cursorY += qrSize + 34;
  doc.setTextColor(black);
  drawCenteredTrackedText(doc, "SCAN ME", cursorY, {
    centerX,
    fontSize: 22,
    fontFamily: "helvetica",
    fontStyle: "normal",
    letterSpacing: 5,
  });

  cursorY += 17;
  doc.setLineWidth(1.15);
  doc.line(centerX - 92, cursorY, centerX + 92, cursorY);

  cursorY += 24;
  doc.setCharSpace(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.text("Powered By", centerX, cursorY, { align: "center" });

  await drawQrFlyerImage(doc, options.crownPagesLogoDataUrl, centerX - 112, cursorY + 8, 224, 38);

  return doc;
}

function getBlankValueForField(definition: FieldDefinition): unknown {
  if (definition.type === "button") {
    return { text: "", link: "" };
  }

  if (definition.type === "array") {
    return [];
  }

  if (definition.type === "object") {
    return Object.fromEntries(
      Object.entries(definition.fields || {}).map(([key, fieldDefinition]) => [
        key,
        getBlankValueForField(fieldDefinition),
      ]),
    );
  }

  return "";
}

function normalizeSectionsForBuilder(sections: PageSection[], options?: { useStableFallbackIds?: boolean }) {
  const existingSocialIndex = sections.findIndex((section) => section.type === "socialLinks");
  const socialLinksSection =
    existingSocialIndex >= 0
      ? sections[existingSocialIndex]
      : createSection("socialLinks", {
          id: options?.useStableFallbackIds ? buildStableSectionId("socialLinks", "builder-fallback") : undefined,
        });

  const withoutSocialLinks = sections.filter((section) => section.type !== "socialLinks");
  const galleryIndex = withoutSocialLinks.findIndex((section) => section.type === "gallery");
  const amenitiesIndex = withoutSocialLinks.findIndex((section) => section.type === "amenities");
  const insertIndex =
    galleryIndex >= 0
      ? galleryIndex
      : amenitiesIndex >= 0
        ? amenitiesIndex
        : withoutSocialLinks.length;

  const nextSections = [...withoutSocialLinks];
  nextSections.splice(insertIndex, 0, socialLinksSection);
  return nextSections;
}

function getInitialSections(initialPage?: BuilderPage | null) {
  const initialSections = initialPage?.content as { sections?: PageSection[] } | null | undefined;

  if (initialSections?.sections?.length) {
    return normalizeSectionsForBuilder(initialSections.sections, { useStableFallbackIds: true });
  }

  return normalizeSectionsForBuilder(
    DEFAULT_NEW_PAGE_SECTION_TYPES.map((type, index) =>
      createSection(type, { id: buildStableSectionId(type, index) }),
    ),
    { useStableFallbackIds: true },
  );
}

function getPublishFeatureFlags(publishSettings?: BuilderPage["publish_settings"] | null) {
  const settings = (publishSettings || {}) as {
    pageFeatures?: {
      includeInstaConnect?: boolean;
      includeScheduleMeeting?: boolean;
    };
  };

  return {
    includeInstaConnect: Boolean(settings.pageFeatures?.includeInstaConnect),
    includeScheduleMeeting: Boolean(settings.pageFeatures?.includeScheduleMeeting),
  };
}

function supportsLeadActions(sections: PageSection[]) {
  const sectionTypes = new Set(sections.map((section) => section.type));
  return sectionTypes.has("companyHeader") && sectionTypes.has("contactCard");
}

const LINKS_WITH_CONTACT_PAGES_FIELDS = ["title", "links"] as const;
const LINKS_WITH_CONTACT_CONTACT_FIELDS = [
  "contactName",
  "contactRole",
  "contactPhone",
  "contactPhone2",
  "contactEmail",
  "contactFax",
  "contactWebsite",
  "contactImageUrl",
] as const;

const PREMIUM_INPUT_CLASS =
  "h-12 rounded-2xl border-slate-200/80 bg-white text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)] transition focus-visible:ring-2 focus-visible:ring-amber-400/40 dark:border-slate-200/90 dark:bg-white dark:text-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(15,23,42,0.05)]";
const PREMIUM_TEXTAREA_CLASS =
  "flex min-h-28 w-full rounded-[22px] border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)] placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 dark:border-slate-200/90 dark:bg-white dark:text-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(15,23,42,0.05)]";
const PREMIUM_SELECT_CLASS =
  "flex h-12 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 dark:border-slate-200/90 dark:bg-white dark:text-slate-900 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(15,23,42,0.05)]";
const PREMIUM_CARD_CLASS =
  "overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#06080d] dark:text-slate-50 dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)]";
const PREMIUM_SECTION_CARD_CLASS =
  "rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900";
const PREMIUM_CARD_HEADER_CLASS =
  "space-y-2 bg-white dark:bg-[#06080d]";
const PREMIUM_CARD_TITLE_CLASS = "text-slate-950 dark:text-slate-50";
const PREMIUM_LABEL_CLASS = "text-[0.95rem] font-semibold text-slate-800 dark:text-slate-200";
const PREMIUM_HELPER_CLASS = "text-xs text-slate-500 dark:text-slate-400";
const PREMIUM_CARD_CONTENT_CLASS =
  "space-y-6 bg-white dark:bg-[#06080d]";
const MEDIA_COLLECTION_STAGE_ORDER: Array<MediaCollectionJobSummary["currentStage"]> = [
  "queued",
  "discovering-pages",
  "extracting-assets",
  "downloading-assets",
  "organizing-export",
  "completed",
  "failed",
];

function getMediaCollectionStageLabel(stage: MediaCollectionJobSummary["currentStage"]) {
  switch (stage) {
    case "queued":
      return "Queued";
    case "discovering-pages":
      return "Scanning";
    case "extracting-assets":
      return "Extracting";
    case "downloading-assets":
      return "Preparing";
    case "organizing-export":
      return "Manifest";
    case "completed":
      return "Complete";
    case "failed":
      return "Failed";
    default:
      return stage;
  }
}

function getMediaCollectionProgress(stage: MediaCollectionJobSummary["currentStage"]) {
  if (stage === "failed") {
    return 100;
  }

  const stageIndex = MEDIA_COLLECTION_STAGE_ORDER.indexOf(stage);
  if (stageIndex === -1) {
    return 0;
  }

  return Math.round((stageIndex / (MEDIA_COLLECTION_STAGE_ORDER.length - 2)) * 100);
}

function createTempItemId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function deriveAssetDisplayName(filename?: string | null) {
  if (!filename) return "Untitled";

  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function PageBuilderForm({
  businesses,
  initialPage = null,
  canObtainMedia = false,
}: PageBuilderFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const isEditMode = Boolean(initialPage?.id);
  const [availableBusinesses, setAvailableBusinesses] = useState(businesses);
  const [title, setTitle] = useState(initialPage?.title || "");
  const [description, setDescription] = useState(initialPage?.description || "");
  const [slug, setSlug] = useState(initialPage?.slug || "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [businessId, setBusinessId] = useState(
    initialPage?.business_id || businesses[0]?.id || "",
  );
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newBusinessDescription, setNewBusinessDescription] = useState("");
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);
  const [businessSetupError, setBusinessSetupError] = useState<string | null>(null);
  const [sections, setSections] = useState<PageSection[]>(() => getInitialSections(initialPage));
  const [isPublished, setIsPublished] = useState(Boolean(initialPage?.is_published));
  const [includeInstaConnect, setIncludeInstaConnect] = useState(
    getPublishFeatureFlags(initialPage?.publish_settings).includeInstaConnect,
  );
  const [includeScheduleMeeting, setIncludeScheduleMeeting] = useState(
    getPublishFeatureFlags(initialPage?.publish_settings).includeScheduleMeeting,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(
    initialPage?.updated_at ? new Date(initialPage.updated_at) : null,
  );
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">(
    isEditMode ? "saved" : "unsaved",
  );
  const [isGeneratingQrStand, setIsGeneratingQrStand] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaSourceUrl, setMediaSourceUrl] = useState("");
  const [mediaCompanyName, setMediaCompanyName] = useState("");
  const [mediaCollectionMessage, setMediaCollectionMessage] = useState<string | null>(null);
  const [mediaCollectionOptions, setMediaCollectionOptions] = useState<MediaCollectionOptions>(
    DEFAULT_MEDIA_COLLECTION_OPTIONS,
  );
  const [mediaCollectionJob, setMediaCollectionJob] = useState<MediaCollectionJobSummary | null>(
    null,
  );
  const [mediaCollectionResults, setMediaCollectionResults] = useState<MediaCollectionResults | null>(
    null,
  );
  const [isCollectingMedia, setIsCollectingMedia] = useState(false);
  const [isStoppingMediaCollection, setIsStoppingMediaCollection] = useState(false);
  const [isDownloadingMediaManifest, setIsDownloadingMediaManifest] = useState(false);
  const [mediaActivityTick, setMediaActivityTick] = useState(0);
  const [isMediaScrubberMinimized, setIsMediaScrubberMinimized] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const previewFitRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePageRef = useRef<
    ((options?: { redirectAfterSave?: boolean; showValidationInline?: boolean }) => Promise<boolean>) | null
  >(null);
  const mediaPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousMediaCollectionStatusRef = useRef<string | null>(null);
  const initialDataRef = useRef<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewContentHeight, setPreviewContentHeight] = useState(0);

  const selectedBusiness = availableBusinesses.find((business) => business.id === businessId) || null;
  const selectedBusinessSlug =
    selectedBusiness && "slug" in selectedBusiness
      ? String((selectedBusiness as unknown as { slug?: string | null }).slug || "")
      : "";

  const previewBusiness = useMemo<BusinessData | null>(() => {
    if (!selectedBusiness) {
      return null;
    }

    return {
      id: selectedBusiness.id,
      name: selectedBusiness.name,
      logo_url: selectedBusiness.logo_url,
      primary_color: selectedBusiness.primary_color,
      secondary_color: selectedBusiness.secondary_color,
      font_family: selectedBusiness.font_family,
      email: selectedBusiness.email,
      phone: selectedBusiness.phone,
      website: selectedBusiness.website,
      street_address: selectedBusiness.street_address,
      city: selectedBusiness.city,
      state: selectedBusiness.state,
      zip_code: selectedBusiness.zip_code,
      country: selectedBusiness.country,
    };
  }, [selectedBusiness]);

  const canRenderPageActions = useMemo(() => supportsLeadActions(sections), [sections]);
  const companyHeaderSection = useMemo(
    () => sections.find((section) => section.type === "companyHeader") || null,
    [sections],
  );
  const heroSection = useMemo(
    () => sections.find((section) => section.type === "hero") || null,
    [sections],
  );
  const companyNameForQrStand = useMemo(() => {
    const value = companyHeaderSection?.data?.companyName;
    return typeof value === "string" ? value.trim() : "";
  }, [companyHeaderSection]);
  const logoUrlForQrStand = useMemo(() => {
    const rawValue = heroSection?.data?.logoUrl;
    return typeof rawValue === "string" ? buildPublicUploadUrl(rawValue) : "";
  }, [heroSection]);
  const resolvedPageUrl = useMemo(() => {
    const baseUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : ""))
        .replace(/\/$/, "");
    if (!baseUrl || !selectedBusinessSlug || !slug) {
      return "";
    }
    return `${baseUrl}/${selectedBusinessSlug}/${slug}`;
  }, [selectedBusinessSlug, slug]);

  useEffect(() => {
    setAvailableBusinesses(businesses);
  }, [businesses]);

  useEffect(() => {
    if (!businessId && availableBusinesses[0]?.id) {
      setBusinessId(availableBusinesses[0].id);
    }
  }, [availableBusinesses, businessId]);

  const canGenerateQrStand = Boolean(companyNameForQrStand && logoUrlForQrStand && resolvedPageUrl);
  const rankedMediaResults = useMemo(() => {
    if (!mediaCollectionResults) {
      return null;
    }

    const sortAssets = (assets: typeof mediaCollectionResults.images) =>
      [...assets]
        .filter((asset) => !asset.isDuplicate)
        .sort((left, right) => (right.qualityScore || 0) - (left.qualityScore || 0));

    return {
      images: sortAssets(mediaCollectionResults.images),
      pdfs: sortAssets(mediaCollectionResults.pdfs),
      videos: sortAssets(mediaCollectionResults.videos),
      documents: sortAssets(mediaCollectionResults.documents),
      socialLinks: [...mediaCollectionResults.socialLinks].sort(
        (left, right) => (right.confidenceScore || 0) - (left.confidenceScore || 0),
      ),
    };
  }, [mediaCollectionResults]);
  const recommendedMedia = useMemo(() => {
    if (!rankedMediaResults) {
      return null;
    }

    const recommendedHeroImage =
      [...rankedMediaResults.images]
        .sort((left, right) => getImageRecommendationScore(right) - getImageRecommendationScore(left))[0] ?? null;

    const recommendedGalleryImages = rankedMediaResults.images
      .filter((asset) => asset.id !== recommendedHeroImage?.id)
      .filter((asset) => !isLikelyLogoAsset(asset))
      .slice(0, 5);

    const recommendedPageAssets = [...rankedMediaResults.pdfs, ...rankedMediaResults.documents, ...rankedMediaResults.videos]
      .slice(0, 6);

    const recommendedSocialLinks = rankedMediaResults.socialLinks.slice(0, 5);

    return {
      heroImage: recommendedHeroImage,
      galleryImages: recommendedGalleryImages,
      pageAssets: recommendedPageAssets,
      socialLinks: recommendedSocialLinks,
    };
  }, [rankedMediaResults]);

  useEffect(() => {
    if (canRenderPageActions) {
      return;
    }

    setIncludeInstaConnect(false);
    setIncludeScheduleMeeting(false);
  }, [canRenderPageActions]);

  useEffect(() => {
    const element = previewFitRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateScale = () => {
      const { clientWidth, clientHeight } = element;
      if (!clientWidth || !clientHeight) {
        return;
      }

      const nextScale = Math.min(
        clientWidth / IPHONE_17_PRO_SHELL_WIDTH,
        clientHeight / IPHONE_17_PRO_SHELL_HEIGHT,
      );

      setPreviewScale(Math.min(nextScale, 1));
    };

    updateScale();

    const observer = new ResizeObserver(() => {
      updateScale();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = previewContentRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = () => {
      setPreviewContentHeight(element.scrollHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [sections, includeInstaConnect, includeScheduleMeeting, title, previewBusiness]);

  const currentBuilderState = useMemo(
    () =>
      JSON.stringify({
        title,
        description,
        slug,
        businessId,
        sections,
        isPublished,
        includeInstaConnect: canRenderPageActions && includeInstaConnect,
        includeScheduleMeeting: canRenderPageActions && includeScheduleMeeting,
      }),
    [
      title,
      description,
      slug,
      businessId,
      sections,
      isPublished,
      canRenderPageActions,
      includeInstaConnect,
      includeScheduleMeeting,
    ],
  );

  useEffect(() => {
    if (initialDataRef.current === null) {
      initialDataRef.current = currentBuilderState;
      setHasUnsavedChanges(false);
      return;
    }

    const unsaved = currentBuilderState !== initialDataRef.current;
    setHasUnsavedChanges(unsaved);

    if (unsaved && saveStatus !== "saving") {
      setSaveStatus("unsaved");
    }
  }, [currentBuilderState, saveStatus]);

  const handleTitleChange = (value: string) => {
    setTitle(value);

    if (!slugTouched) {
      setSlug(normalizeSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(normalizeSlug(value));
  };

  const handleCreateBusiness = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = newBusinessName.trim();
    const trimmedDescription = newBusinessDescription.trim();

    if (!trimmedName) {
      setBusinessSetupError("Enter a business name to start building a page.");
      return;
    }

    setIsCreatingBusiness(true);
    setBusinessSetupError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Sign in again before creating a business.");

      const { data: slugData, error: slugError } = await supabase.rpc(
        "generate_business_slug",
        { business_name: trimmedName },
      );

      if (slugError) throw slugError;

      const generatedSlug =
        typeof slugData === "string" && slugData.trim()
          ? slugData
          : normalizeSlug(trimmedName);

      const { data: createdBusiness, error: insertError } = await supabase
        .from("businesses")
        .insert({
          name: trimmedName,
          description: trimmedDescription || null,
          slug: generatedSlug,
          owner_id: user.id,
          is_active: true,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;
      if (!createdBusiness) throw new Error("Business could not be created.");

      setAvailableBusinesses((current) => [createdBusiness, ...current]);
      setBusinessId(createdBusiness.id);
      setNewBusinessName("");
      setNewBusinessDescription("");
      router.refresh();
    } catch (creationError) {
      setBusinessSetupError(
        creationError instanceof Error
          ? creationError.message
          : "Could not create the business. Please try again.",
      );
    } finally {
      setIsCreatingBusiness(false);
    }
  };

  const updateSection = (
    sectionId: string,
    updater: (section: PageSection) => PageSection,
  ) => {
    setSections((current) =>
      current.map((section) => (section.id === sectionId ? updater(section) : section)),
    );
  };

  const updateSectionField = (
    sectionId: string,
    field: string,
    value: unknown,
  ) => {
    updateSection(sectionId, (section) => ({
      ...section,
      data: {
        ...section.data,
        [field]: value,
      },
    }));
  };

  const removeSection = (sectionId: string) => {
    setSections((current) => current.filter((section) => section.id !== sectionId));
  };

  const generateQrStand = useCallback(async () => {
    if (!canGenerateQrStand) {
      return;
    }

    setIsGeneratingQrStand(true);
    setError(null);

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=720x720&margin=20&data=${encodeURIComponent(resolvedPageUrl)}`;
      const crownPagesLogoUrl =
        typeof window !== "undefined" ? `${window.location.origin}/darklogo.png` : "/darklogo.png";
      const [logoDataUrl, qrDataUrl, crownPagesLogoDataUrl] = await Promise.all([
        fetchImageDataUrl(logoUrlForQrStand),
        fetchImageDataUrl(qrUrl),
        fetchImageDataUrl(crownPagesLogoUrl),
      ]);

      if (!logoDataUrl || !qrDataUrl || !crownPagesLogoDataUrl) {
        throw new Error("Failed to load the logo, QR code, or CrownPages logo.");
      }

      const doc = await createQrFlyerPdf({
        companyName: companyNameForQrStand,
        logoDataUrl,
        qrDataUrl,
        crownPagesLogoDataUrl,
      });

      const safeName =
        companyNameForQrStand.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() ||
        "crown-page";
      doc.save(`${safeName}-qr-stand.pdf`);
    } catch (qrStandError) {
      setError(qrStandError instanceof Error ? qrStandError.message : "Failed to generate QR stand.");
    } finally {
      setIsGeneratingQrStand(false);
    }
  }, [canGenerateQrStand, companyNameForQrStand, logoUrlForQrStand, resolvedPageUrl]);

  const loadMediaCollectionResults = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/media-collections/${jobId}/results`);
      const payload = (await response.json()) as {
        error?: string;
        results?: MediaCollectionResults;
      };

      if (!response.ok || !payload.results) {
        return;
      }

      setMediaCollectionResults(payload.results);
    } catch {
      // Results are optional during the early scaffolded phase.
    }
  }, []);

  const refreshMediaCollectionJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/media-collections/${jobId}`);
        const payload = (await response.json()) as {
          error?: string;
          job?: MediaCollectionJobSummary;
        };

        if (!response.ok || !payload.job) {
          if (payload.error) {
            setMediaCollectionMessage(payload.error);
          }
          return;
        }

        setMediaCollectionJob(payload.job);

        if (payload.job.status === "completed") {
          void loadMediaCollectionResults(jobId);
        }
      } catch {
        setMediaCollectionMessage("Unable to refresh the media collection job right now.");
      }
    },
    [loadMediaCollectionResults],
  );

  const handleCollectMedia = useCallback(async () => {
    if (!mediaSourceUrl.trim() || !mediaCompanyName.trim()) {
      setMediaCollectionMessage("Enter both a source URL and company name first.");
      return;
    }

    setIsCollectingMedia(true);
    setIsMediaScrubberMinimized(false);
    setMediaCollectionMessage(null);
    setMediaCollectionResults(null);

    try {
      const response = await fetch("/api/media-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId: initialPage?.id || null,
          businessId: businessId || null,
          companyName: mediaCompanyName.trim(),
          sourceUrl: mediaSourceUrl.trim(),
          options: mediaCollectionOptions,
        }),
      });

      let payload: {
        error?: string;
        job?: MediaCollectionJobSummary;
      } = {};

      try {
        payload = (await response.json()) as {
          error?: string;
          job?: MediaCollectionJobSummary;
        };
      } catch {
        payload = {};
      }

      if (!response.ok || !payload.job) {
        setMediaCollectionMessage(
          payload.error ||
            "Unable to launch the media collection job. If this is production, the media collection database setup may still be missing.",
        );
        return;
      }

      setMediaCollectionJob(payload.job);
      const runResponse = await fetch(`/api/media-collections/${payload.job.id}/run`, {
        method: "POST",
      });
      const runPayload = (await runResponse.json()) as { error?: string };

      if (!runResponse.ok) {
        setMediaCollectionMessage(
          runPayload.error || "Media collection job was created, but the crawl could not be started.",
        );
      } else {
        setMediaCollectionMessage(
          "Media collection started. Crown Pages is scanning the site, organizing results, and preparing a sorted ZIP.",
        );
      }
      void refreshMediaCollectionJob(payload.job.id);
    } catch {
      setMediaCollectionMessage("Unable to launch the media collection job right now.");
    } finally {
      setIsCollectingMedia(false);
    }
  }, [
    businessId,
    initialPage?.id,
    mediaCollectionOptions,
    mediaCompanyName,
    mediaSourceUrl,
    refreshMediaCollectionJob,
  ]);

  const handleGenerateQrStandClick = useCallback(() => {
    if (!canGenerateQrStand) {
      window.alert('Complete "Company Name" and upload "Logo Image (Overlay)" before generating the QR flyer.');
      return;
    }

    void generateQrStand();
  }, [canGenerateQrStand, generateQrStand]);

  const mediaCollectionJobId = mediaCollectionJob?.id ?? null;
  const mediaCollectionJobCompanyName = mediaCollectionJob?.companyName ?? "";
  const isMediaCollectionRunning =
    mediaCollectionJob?.status === "queued" || mediaCollectionJob?.status === "running";
  const showMediaScrubberPill =
    isMediaScrubberMinimized && Boolean(mediaCollectionJob) && !showMediaModal;
  const mediaActivityMessage =
    MEDIA_ACTIVITY_MESSAGES[mediaActivityTick % MEDIA_ACTIVITY_MESSAGES.length];
  const mediaActivityOffset = (mediaActivityTick % 5) * 22;

  useEffect(() => {
    if (!isMediaCollectionRunning || !showMediaModal) {
      setMediaActivityTick(0);
      return;
    }

    const interval = window.setInterval(() => {
      setMediaActivityTick((current) => current + 1);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [isMediaCollectionRunning, showMediaModal]);

  const handleDownloadMediaArchive = useCallback(async () => {
    if (!mediaCollectionJobId) {
      return;
    }

    setIsDownloadingMediaManifest(true);
    setMediaCollectionMessage("Preparing the media ZIP. The download will start when it is ready.");
    try {
      const response = await fetch(`/api/media-collections/${mediaCollectionJobId}/download`);
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setMediaCollectionMessage(payload.error || "Media ZIP is not ready yet.");
        return;
      }

      const blob = await response.blob();
      const companySlug =
        mediaCollectionJobCompanyName
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "obtain-media";
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${companySlug}-media.zip`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 60_000);
      setMediaCollectionMessage("Media ZIP download started.");
    } catch {
      setMediaCollectionMessage("Unable to prepare the media ZIP right now.");
    } finally {
      setIsDownloadingMediaManifest(false);
    }
  }, [mediaCollectionJobCompanyName, mediaCollectionJobId]);

  const handleStopAndOrganizeMedia = useCallback(async () => {
    if (!mediaCollectionJobId) {
      return;
    }

    setIsStoppingMediaCollection(true);
    setMediaCollectionMessage(null);

    try {
      const response = await fetch(`/api/media-collections/${mediaCollectionJobId}/finalize`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        job?: MediaCollectionJobSummary;
      };

      if (!response.ok) {
        setMediaCollectionMessage(payload.error || "Unable to stop and organize media collection.");
        return;
      }

      if (payload.job) {
        setMediaCollectionJob(payload.job);
      } else {
        await refreshMediaCollectionJob(mediaCollectionJobId);
      }
      await loadMediaCollectionResults(mediaCollectionJobId);
      setMediaCollectionMessage("Media collection stopped. Saved results are organized and ready to download.");
    } catch {
      setMediaCollectionMessage("Unable to stop and organize media collection right now.");
    } finally {
      setIsStoppingMediaCollection(false);
    }
  }, [loadMediaCollectionResults, mediaCollectionJobId, refreshMediaCollectionJob]);

  const getMediaAssetUsableValue = useCallback((asset: { storagePath: string | null; assetUrl: string }) => {
    return asset.storagePath || asset.assetUrl;
  }, []);

  const getMediaAssetPreviewUrl = useCallback((asset: { storagePath: string | null; assetUrl: string }) => {
    return asset.storagePath ? buildPublicUploadUrl(asset.storagePath) : asset.assetUrl;
  }, []);

  const addImageToGallery = useCallback((asset: { storagePath: string | null; assetUrl: string; cleanFilename: string | null; filename: string | null }) => {
    const assetValue = getMediaAssetUsableValue(asset);
    if (!assetValue) {
      setMediaCollectionMessage("That image is missing a usable URL.");
      return;
    }

    setSections((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((section) => section.type === "gallery");
      const imageItem = {
        id: createTempItemId("gallery-image"),
        url: assetValue,
        caption: deriveAssetDisplayName(asset.cleanFilename || asset.filename),
      };

      if (existingIndex >= 0) {
        const existingSection = next[existingIndex];
        const currentImages = Array.isArray(existingSection.data.images) ? [...(existingSection.data.images as Array<Record<string, unknown>>)] : [];
        if (currentImages.some((item) => item?.url === assetValue)) {
          return current;
        }

        currentImages.push(imageItem);
        next[existingIndex] = {
          ...existingSection,
          data: {
            ...existingSection.data,
            images: currentImages,
          },
        };
        return normalizeSectionsForBuilder(next);
      }

      const newGallery = createSection("gallery");
      newGallery.data = {
        ...newGallery.data,
        images: [imageItem],
      };

      return normalizeSectionsForBuilder([...next, newGallery]);
    });

    setMediaCollectionMessage(`Added "${deriveAssetDisplayName(asset.cleanFilename || asset.filename)}" to Gallery.`);
  }, [getMediaAssetUsableValue]);

  const applyImageAsHero = useCallback((asset: { storagePath: string | null; assetUrl: string; cleanFilename: string | null; filename: string | null }) => {
    const assetValue = getMediaAssetUsableValue(asset);
    if (!assetValue) {
      setMediaCollectionMessage("That image is missing a usable URL.");
      return;
    }

    setSections((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((section) => section.type === "hero");

      if (existingIndex >= 0) {
        const existingSection = next[existingIndex];
        next[existingIndex] = {
          ...existingSection,
          data: {
            ...existingSection.data,
            backgroundImage: assetValue,
          },
        };
        return normalizeSectionsForBuilder(next);
      }

      const newHero = createSection("hero");
      newHero.data = {
        ...newHero.data,
        backgroundImage: assetValue,
      };

      return normalizeSectionsForBuilder([newHero, ...next]);
    });

    setMediaCollectionMessage(`Set "${deriveAssetDisplayName(asset.cleanFilename || asset.filename)}" as the hero image.`);
  }, [getMediaAssetUsableValue]);

  const addAssetToPagesSection = useCallback((asset: { storagePath: string | null; assetUrl: string; cleanFilename: string | null; filename: string | null }) => {
    const assetValue = getMediaAssetUsableValue(asset);
    if (!assetValue) {
      setMediaCollectionMessage("That asset is missing a usable URL.");
      return;
    }

    const assetTitle = deriveAssetDisplayName(asset.cleanFilename || asset.filename);

    setSections((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((section) => section.type === "linksWithContact");
      const linkItem = {
        id: createTempItemId("page-link"),
        title: assetTitle,
        url: assetValue,
        image: "",
      };

      if (existingIndex >= 0) {
        const existingSection = next[existingIndex];
        const currentLinks = Array.isArray(existingSection.data.links)
          ? [...(existingSection.data.links as Array<Record<string, unknown>>)]
          : [];
        if (currentLinks.some((item) => item?.url === assetValue)) {
          return current;
        }

        currentLinks.push(linkItem);
        next[existingIndex] = {
          ...existingSection,
          data: {
            ...existingSection.data,
            links: currentLinks,
          },
        };
        return normalizeSectionsForBuilder(next);
      }

      const newPagesSection = createSection("linksWithContact");
      newPagesSection.data = {
        ...newPagesSection.data,
        links: [linkItem],
      };

      return normalizeSectionsForBuilder([...next, newPagesSection]);
    });

    setMediaCollectionMessage(`Added "${assetTitle}" to Pages.`);
  }, [getMediaAssetUsableValue]);

  const assignSocialLinkToSection = useCallback((socialLink: { platform: string; url: string }) => {
    setSections((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((section) => section.type === "socialLinks");
      const linkItem = {
        id: createTempItemId("social-link"),
        platform: socialLink.platform,
        url: socialLink.url,
        label: "",
      };

      if (existingIndex >= 0) {
        const existingSection = next[existingIndex];
        const currentLinks = Array.isArray(existingSection.data.links)
          ? [...(existingSection.data.links as Array<Record<string, unknown>>)]
          : [];
        if (currentLinks.some((item) => item?.url === socialLink.url)) {
          return current;
        }

        currentLinks.push(linkItem);
        next[existingIndex] = {
          ...existingSection,
          data: {
            ...existingSection.data,
            links: currentLinks,
          },
        };
        return normalizeSectionsForBuilder(next);
      }

      const socialSection = createSection("socialLinks");
      socialSection.data = {
        ...socialSection.data,
        links: [linkItem],
      };

      return normalizeSectionsForBuilder([...next, socialSection]);
    });

    setMediaCollectionMessage(`Assigned ${socialLink.platform} to Social Media Links.`);
  }, []);
  const applyRecommendedHero = useCallback(() => {
    if (!recommendedMedia?.heroImage) {
      setMediaCollectionMessage("No strong hero image recommendation is available yet.");
      return;
    }

    applyImageAsHero(recommendedMedia.heroImage);
  }, [applyImageAsHero, recommendedMedia]);

  const addRecommendedGalleryImages = useCallback(() => {
    if (!recommendedMedia?.galleryImages.length) {
      setMediaCollectionMessage("No gallery recommendations are available yet.");
      return;
    }

    const assetsToAdd = recommendedMedia.galleryImages;
    setSections((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((section) => section.type === "gallery");
      const currentImages =
        existingIndex >= 0 && Array.isArray(next[existingIndex].data.images)
          ? [...(next[existingIndex].data.images as Array<Record<string, unknown>>)]
          : [];
      const existingUrls = new Set(currentImages.map((item) => String(item?.url || "")));
      const appendedItems = assetsToAdd
        .map((asset) => {
          const url = getMediaAssetUsableValue(asset);
          if (!url || existingUrls.has(url)) {
            return null;
          }

          existingUrls.add(url);
          return {
            id: createTempItemId("gallery-image"),
            url,
            caption: deriveAssetDisplayName(asset.cleanFilename || asset.filename),
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (!appendedItems.length) {
        return current;
      }

      if (existingIndex >= 0) {
        next[existingIndex] = {
          ...next[existingIndex],
          data: {
            ...next[existingIndex].data,
            images: [...currentImages, ...appendedItems],
          },
        };
        return normalizeSectionsForBuilder(next);
      }

      const newGallery = createSection("gallery");
      newGallery.data = {
        ...newGallery.data,
        images: appendedItems,
      };

      return normalizeSectionsForBuilder([...next, newGallery]);
    });

    setMediaCollectionMessage(`Added ${assetsToAdd.length} recommended images to Gallery.`);
  }, [getMediaAssetUsableValue, recommendedMedia]);

  const addRecommendedPageAssets = useCallback(() => {
    if (!recommendedMedia?.pageAssets.length) {
      setMediaCollectionMessage("No page asset recommendations are available yet.");
      return;
    }

    const assetsToAdd = recommendedMedia.pageAssets;
    setSections((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((section) => section.type === "linksWithContact");
      const currentLinks =
        existingIndex >= 0 && Array.isArray(next[existingIndex].data.links)
          ? [...(next[existingIndex].data.links as Array<Record<string, unknown>>)]
          : [];
      const existingUrls = new Set(currentLinks.map((item) => String(item?.url || "")));
      const appendedItems = assetsToAdd
        .map((asset) => {
          const url = getMediaAssetUsableValue(asset);
          if (!url || existingUrls.has(url)) {
            return null;
          }

          existingUrls.add(url);
          return {
            id: createTempItemId("page-link"),
            title: deriveAssetDisplayName(asset.cleanFilename || asset.filename),
            url,
            image: "",
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (!appendedItems.length) {
        return current;
      }

      if (existingIndex >= 0) {
        next[existingIndex] = {
          ...next[existingIndex],
          data: {
            ...next[existingIndex].data,
            links: [...currentLinks, ...appendedItems],
          },
        };
        return normalizeSectionsForBuilder(next);
      }

      const newPagesSection = createSection("linksWithContact");
      newPagesSection.data = {
        ...newPagesSection.data,
        links: appendedItems,
      };

      return normalizeSectionsForBuilder([...next, newPagesSection]);
    });

    setMediaCollectionMessage(`Added ${assetsToAdd.length} recommended files to Pages.`);
  }, [getMediaAssetUsableValue, recommendedMedia]);

  const assignRecommendedSocialLinks = useCallback(() => {
    if (!recommendedMedia?.socialLinks.length) {
      setMediaCollectionMessage("No social link recommendations are available yet.");
      return;
    }

    const socialLinksToAdd = recommendedMedia.socialLinks;
    setSections((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((section) => section.type === "socialLinks");
      const currentLinks =
        existingIndex >= 0 && Array.isArray(next[existingIndex].data.links)
          ? [...(next[existingIndex].data.links as Array<Record<string, unknown>>)]
          : [];
      const existingUrls = new Set(currentLinks.map((item) => String(item?.url || "")));
      const appendedItems = socialLinksToAdd
        .map((socialLink) => {
          if (!socialLink.url || existingUrls.has(socialLink.url)) {
            return null;
          }

          existingUrls.add(socialLink.url);
          return {
            id: createTempItemId("social-link"),
            platform: socialLink.platform,
            url: socialLink.url,
            label: "",
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (!appendedItems.length) {
        return current;
      }

      if (existingIndex >= 0) {
        next[existingIndex] = {
          ...next[existingIndex],
          data: {
            ...next[existingIndex].data,
            links: [...currentLinks, ...appendedItems],
          },
        };
        return normalizeSectionsForBuilder(next);
      }

      const socialSection = createSection("socialLinks");
      socialSection.data = {
        ...socialSection.data,
        links: appendedItems,
      };

      return normalizeSectionsForBuilder([...next, socialSection]);
    });

    setMediaCollectionMessage(`Assigned ${socialLinksToAdd.length} recommended social links.`);
  }, [recommendedMedia]);

  useEffect(() => {
    if (!mediaCollectionJob?.id) {
      if (mediaPollIntervalRef.current) {
        clearInterval(mediaPollIntervalRef.current);
        mediaPollIntervalRef.current = null;
      }
      return;
    }

    const isTerminal =
      mediaCollectionJob.status === "completed" ||
      mediaCollectionJob.status === "failed" ||
      mediaCollectionJob.status === "cancelled";

    if (isTerminal) {
      if (mediaPollIntervalRef.current) {
        clearInterval(mediaPollIntervalRef.current);
        mediaPollIntervalRef.current = null;
      }
      return;
    }

    mediaPollIntervalRef.current = setInterval(() => {
      void refreshMediaCollectionJob(mediaCollectionJob.id);
    }, 3000);

    return () => {
      if (mediaPollIntervalRef.current) {
        clearInterval(mediaPollIntervalRef.current);
        mediaPollIntervalRef.current = null;
      }
    };
  }, [mediaCollectionJob?.id, mediaCollectionJob?.status, refreshMediaCollectionJob]);

  useEffect(() => {
    const previousStatus = previousMediaCollectionStatusRef.current;
    const currentStatus = mediaCollectionJob?.status ?? null;
    previousMediaCollectionStatusRef.current = currentStatus;

    if (
      isMediaScrubberMinimized &&
      !showMediaModal &&
      currentStatus === "completed" &&
      previousStatus !== "completed"
    ) {
      setIsMediaScrubberMinimized(false);
      setShowMediaModal(true);
      setMediaCollectionMessage("Media collection finished. The ZIP is ready to download.");
    }

    if (
      isMediaScrubberMinimized &&
      !showMediaModal &&
      currentStatus === "failed" &&
      previousStatus !== "failed"
    ) {
      setIsMediaScrubberMinimized(false);
      setShowMediaModal(true);
      setMediaCollectionMessage("Media collection failed. Review the error details below.");
    }
  }, [isMediaScrubberMinimized, mediaCollectionJob?.status, showMediaModal]);

  const moveSection = (sectionId: string, direction: "up" | "down") => {
    setSections((current) => {
      const index = current.findIndex((section) => section.id === sectionId);
      if (index === -1) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const uploadFileForField = useCallback(
    async (
      fieldKey: string,
      file: File,
      options?: {
        accept?: "image" | "file";
      },
    ) => {
      setError(null);
      setUploadingFields((current) => ({ ...current, [fieldKey]: true }));

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("You must be signed in to upload files.");
        }

        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const pageSegment = initialPage?.id || "draft";
        const folder = options?.accept === "image" ? "images" : "files";
        const storagePath = [
          user.id,
          businessId || "unassigned-business",
          pageSegment,
          folder,
          `${Date.now()}-${fieldKey}-${safeFileName}`,
        ].join("/");

        if (options?.accept === "image") {
          const result = await uploadImageFile({
            file,
            storagePath,
            supabase,
            upsert: false,
          });

          return result.storagePath;
        }

        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(storagePath, file, { upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        return storagePath;
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "Failed to upload file.";
        setError(message);
        return null;
      } finally {
        setUploadingFields((current) => {
          const next = { ...current };
          delete next[fieldKey];
          return next;
        });
      }
    },
    [supabase, initialPage?.id, businessId],
  );

  const fieldSupportsFileUpload = (fieldKey: string, definition: FieldDefinition) => {
    if (definition.type === "image") {
      return "image" as const;
    }

    if (
      definition.type === "text" &&
      /(^url$)|(^document url$)|(^url or file path$)|(^file url$)/i.test(definition.label.trim())
    ) {
      return "file" as const;
    }

    if (
      definition.type === "text" &&
      fieldKey.toLowerCase().endsWith("-url") &&
      /(document|file|pdf|link)/i.test(definition.placeholder || "")
    ) {
      return "file" as const;
    }

    return null;
  };

  const validateForm = useCallback(async () => {
    if (!title.trim()) {
      return "Page title is required.";
    }

    if (!businessId) {
      return "Select a business before saving.";
    }

    if (!slug.trim()) {
      return "Page URL slug is required.";
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return "Slug can only contain lowercase letters, numbers, and hyphens.";
    }

    if (!sections.length) {
      return "Add at least one section to the page.";
    }

    const duplicateQuery = supabase
      .from("pages")
      .select("id")
      .eq("business_id", businessId)
      .eq("slug", slug)
      .limit(1);

    const { data: duplicatePages, error: duplicateError } = isEditMode
      ? await duplicateQuery.neq("id", initialPage!.id)
      : await duplicateQuery;

    if (duplicateError) {
      return duplicateError.message;
    }

    if (duplicatePages && duplicatePages.length > 0) {
      return "That page URL is already taken for this business.";
    }

    return null;
  }, [title, businessId, slug, sections.length, supabase, isEditMode, initialPage]);

  const savePage = useCallback(async ({
    redirectAfterSave = false,
    showValidationInline = true,
  }: {
    redirectAfterSave?: boolean;
    showValidationInline?: boolean;
  } = {}) => {
    setError(null);
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const validationError = await validateForm();
      if (validationError) {
        if (showValidationInline) {
          setError(validationError);
        }
        setSaveStatus("error");
        return false;
      }

      const pageFeatures = {
        includeInstaConnect,
        includeScheduleMeeting,
        disableLeadActions: !canRenderPageActions,
      };

      if (isEditMode) {
        const payload = {
          title: title.trim(),
          description: description.trim() || null,
          slug,
          business_id: businessId,
          is_published: isPublished,
          is_active: true,
          published_at: isPublished ? new Date().toISOString() : null,
          ...buildPageBuilderUpdatePayload({
            sections,
            existingOgImageUrl: initialPage?.og_image_url,
            existingFaviconImageUrl: initialPage?.favicon_image_url,
            existingPublishSettings: initialPage?.publish_settings,
            pageFeatures,
          }),
        };

        const { error: updateError } = await supabase
          .from("pages")
          .update(payload)
          .eq("id", initialPage!.id);

        if (updateError) {
          throw updateError;
        }

        initialDataRef.current = currentBuilderState;
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        setSaveStatus("saved");
        router.refresh();

        if (redirectAfterSave) {
          router.push("/protected/pages?status=updated");
        }
        return true;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be signed in to create a page.");
      }

      const { data: insertedPage, error: insertError } = await supabase
        .from("pages")
        .insert(
          buildPageBuilderCreatePayload({
            title,
            description,
            slug,
            businessId,
            createdBy: user.id,
            sections,
            isPublished,
            pageFeatures,
          }),
        )
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      if (insertedPage?.id) {
        router.replace(`/protected/pages/${insertedPage.id}/edit`);
        router.refresh();
      } else if (redirectAfterSave) {
        router.push("/protected/pages?status=created");
      }

      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save page.");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }

    return false;
  }, [
    validateForm,
    supabase,
    title,
    description,
    slug,
    businessId,
    sections,
    isPublished,
    includeInstaConnect,
    includeScheduleMeeting,
    canRenderPageActions,
    isEditMode,
    initialPage,
    router,
    currentBuilderState,
  ]);

  useEffect(() => {
    savePageRef.current = savePage;
  }, [savePage]);

  useEffect(() => {
    if (!isEditMode || !autosaveEnabled || !hasUnsavedChanges) {
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      void savePageRef.current?.({ redirectAfterSave: false, showValidationInline: true });
    }, 2000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [isEditMode, autosaveEnabled, hasUnsavedChanges, currentBuilderState]);

  const formatTimeAgo = (date: Date) => {
    const secondsAgo = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    if (secondsAgo < 60) return "just now";
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
  };

  const renderFieldEditor = (
    fieldKey: string,
    definition: FieldDefinition,
    value: unknown,
    onChange: (nextValue: unknown) => void,
  ) => {
    const label = definition.label || fieldKey;
    const uploadMode = fieldSupportsFileUpload(fieldKey, definition);
    const uploadInputId = `${fieldKey}-upload`;
    const isUploadingField = Boolean(uploadingFields[fieldKey]);

    if (definition.type === "text" || definition.type === "image") {
      const stringValue = typeof value === "string" ? value : "";
      const showInlineUpload = uploadMode && !stringValue;

      return (
        <div className="space-y-2">
          <Label htmlFor={fieldKey} className={PREMIUM_LABEL_CLASS}>{label}</Label>
          <div className="space-y-2">
            <div className="relative">
              <Input
                id={fieldKey}
                value={stringValue}
                className={`${PREMIUM_INPUT_CLASS} ${showInlineUpload ? "pr-40" : ""}`}
                placeholder={showInlineUpload ? "" : definition.placeholder || (definition.type === "image" ? "https://..." : "")}
                onChange={(event) => onChange(event.target.value)}
              />
              {showInlineUpload ? (
                <label
                  htmlFor={uploadInputId}
                  className="absolute inset-y-0 right-3 inline-flex cursor-pointer items-center text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {isUploadingField ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    <span>Upload from computer</span>
                  )}
                </label>
              ) : null}
            </div>
            {uploadMode ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={uploadInputId}
                  type="file"
                  accept={uploadMode === "image" ? "image/*,.heic,.heif" : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov"}
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    const uploadedPath = await uploadFileForField(fieldKey, file, { accept: uploadMode });
                    if (uploadedPath) {
                      onChange(uploadedPath);
                    }

                    event.target.value = "";
                  }}
                />
                {!showInlineUpload ? (
                  <label
                    htmlFor={uploadInputId}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    {isUploadingField ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : uploadMode === "image" ? (
                      <Upload className="h-4 w-4" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    <span>{isUploadingField ? "Uploading..." : uploadMode === "image" ? "Upload from computer" : "Attach file from computer"}</span>
                  </label>
                ) : null}
                {typeof value === "string" && value ? (
                  <a
                    href={buildPublicUploadUrl(value)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline-offset-4 hover:underline"
                  >
                    View current {uploadMode === "image" ? "image" : "file"}
                  </a>
                ) : null}
              </div>
            ) : null}
            {definition.type === "image" && typeof value === "string" && value ? (
              <div className="overflow-hidden rounded-lg border bg-muted/30 p-2">
                <Image
                  src={buildPublicUploadUrl(value)}
                  alt={label}
                  width={320}
                  height={160}
                  unoptimized
                  className="max-h-40 w-auto rounded-md object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (definition.type === "textarea") {
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldKey} className={PREMIUM_LABEL_CLASS}>{label}</Label>
          <textarea
            id={fieldKey}
            className={PREMIUM_TEXTAREA_CLASS}
            rows={definition.rows || 4}
            value={typeof value === "string" ? value : ""}
            placeholder={definition.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      );
    }

    if (definition.type === "select") {
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldKey} className={PREMIUM_LABEL_CLASS}>{label}</Label>
          <select
            id={fieldKey}
            className={PREMIUM_SELECT_CLASS}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          >
            {(definition.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (definition.type === "button") {
      const buttonValue =
        value && typeof value === "object" ? (value as Record<string, unknown>) : {};

      return (
        <div className="grid gap-3 rounded-[22px] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/65 md:grid-cols-2">
          <div className="space-y-2">
            <Label className={PREMIUM_LABEL_CLASS}>{label} Text</Label>
            <Input
              value={typeof buttonValue.text === "string" ? buttonValue.text : ""}
              onChange={(event) =>
                onChange({
                  ...buttonValue,
                  text: event.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className={PREMIUM_LABEL_CLASS}>{label} Link</Label>
            <Input
              value={typeof buttonValue.link === "string" ? buttonValue.link : ""}
              placeholder={
                definition.linkTypes?.includes("phone")
                  ? "tel:5551234567"
                  : "https://..."
              }
              onChange={(event) =>
                onChange({
                  ...buttonValue,
                  link: event.target.value,
                })
              }
            />
          </div>
        </div>
      );
    }

    if (definition.type === "array") {
      const items = Array.isArray(value) ? value : [];
      const itemSchemaEntries = Object.entries(definition.itemSchema || {});
      const isPagesLinksArray =
        label === "Links" &&
        itemSchemaEntries.some(([key]) => key === "title") &&
        itemSchemaEntries.some(([key]) => key === "url") &&
        itemSchemaEntries.some(([key]) => key === "image");

      return (
        <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/65">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{label}</p>
              {!isPagesLinksArray ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Add and edit repeating items for this section.
                </p>
              ) : null}
              {definition.helperText ? (
                <p className={PREMIUM_HELPER_CLASS}>{definition.helperText}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const nextItem = Object.fromEntries(
                  Object.entries(definition.itemSchema || {}).map(([key, itemDefinition]) => [
                    key,
                    getBlankValueForField(itemDefinition),
                  ]),
                );

                onChange([
                  ...items,
                  {
                    id:
                      typeof crypto !== "undefined" && "randomUUID" in crypto
                        ? crypto.randomUUID()
                        : `item-${Date.now()}`,
                    ...nextItem,
                  },
                ]);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const itemValue =
                item && typeof item === "object" ? (item as Record<string, unknown>) : {};

              if (isPagesLinksArray) {
                return (
                  <div
                    key={String(itemValue.id || index)}
                    className="rounded-[24px] border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm dark:border-slate-700/80 dark:from-slate-950/90 dark:to-slate-900/70"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {typeof itemValue.title === "string" && itemValue.title.trim()
                              ? itemValue.title
                              : `Link ${index + 1}`}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Title, destination, and optional icon.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        onClick={() =>
                          onChange(items.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="space-y-4">
                        {itemSchemaEntries
                          .filter(([itemKey]) => itemKey === "title" || itemKey === "url")
                          .map(([itemKey, itemDefinition]) => (
                            <div key={`${fieldKey}-${index}-${itemKey}`}>
                              {renderFieldEditor(
                                `${fieldKey}-${index}-${itemKey}`,
                                itemDefinition,
                                itemValue[itemKey],
                                (nextValue) => {
                                  const nextItems = [...items];
                                  nextItems[index] = {
                                    ...itemValue,
                                    [itemKey]: nextValue,
                                  };
                                  onChange(nextItems);
                                },
                              )}
                            </div>
                          ))}
                      </div>

                      <div className="rounded-[20px] border border-slate-200/80 bg-white/75 p-4 dark:border-slate-700/80 dark:bg-slate-950/60">
                        {itemSchemaEntries
                          .filter(([itemKey]) => itemKey === "image")
                          .map(([itemKey, itemDefinition]) => (
                            <div key={`${fieldKey}-${index}-${itemKey}`}>
                              {renderFieldEditor(
                                `${fieldKey}-${index}-${itemKey}`,
                                itemDefinition,
                                itemValue[itemKey],
                                (nextValue) => {
                                  const nextItems = [...items];
                                  nextItems[index] = {
                                    ...itemValue,
                                    [itemKey]: nextValue,
                                  };
                                  onChange(nextItems);
                                },
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={String(itemValue.id || index)} className="space-y-3 rounded-[20px] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/75">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Item {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        onChange(items.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {itemSchemaEntries.map(([itemKey, itemDefinition]) => (
                      <div
                        key={`${fieldKey}-${index}-${itemKey}`}
                        className={itemDefinition.type === "textarea" ? "md:col-span-2" : ""}
                      >
                        {renderFieldEditor(
                          `${fieldKey}-${index}-${itemKey}`,
                          itemDefinition,
                          itemValue[itemKey],
                          (nextValue) => {
                            const nextItems = [...items];
                            nextItems[index] = {
                              ...itemValue,
                              [itemKey]: nextValue,
                            };
                            onChange(nextItems);
                          },
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (definition.type === "object") {
      const objectValue =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};

      return (
        <div className="space-y-3 rounded-[22px] border border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/65">
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
            {definition.helperText ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{definition.helperText}</p>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(definition.fields || {}).map(([objectKey, objectDefinition]) => (
              <div
                key={`${fieldKey}-${objectKey}`}
                className={
                  objectDefinition.type === "textarea" ||
                  objectDefinition.type === "array" ||
                  objectDefinition.type === "object"
                    ? "md:col-span-2"
                    : ""
                }
              >
                {renderFieldEditor(
                  `${fieldKey}-${objectKey}`,
                  objectDefinition,
                  objectValue[objectKey],
                  (nextValue) =>
                    onChange({
                      ...objectValue,
                      [objectKey]: nextValue,
                    }),
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  if (availableBusinesses.length === 0) {
    return (
      <Card className={PREMIUM_CARD_CLASS}>
        <CardHeader className={PREMIUM_CARD_HEADER_CLASS}>
          <CardTitle className={PREMIUM_CARD_TITLE_CLASS}>Create your business</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Add a business profile to choose your public URL and start building your first Crown Page.
          </p>
          <form onSubmit={handleCreateBusiness} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="new-business-name" className={PREMIUM_LABEL_CLASS}>
                Business Name
              </Label>
              <Input
                id="new-business-name"
                className={PREMIUM_INPUT_CLASS}
                value={newBusinessName}
                onChange={(event) => setNewBusinessName(event.target.value)}
                placeholder="Your business name"
                disabled={isCreatingBusiness}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-business-description" className={PREMIUM_LABEL_CLASS}>
                Short Description
              </Label>
              <textarea
                id="new-business-description"
                className={PREMIUM_TEXTAREA_CLASS}
                value={newBusinessDescription}
                onChange={(event) => setNewBusinessDescription(event.target.value)}
                placeholder="What does this business do?"
                disabled={isCreatingBusiness}
              />
            </div>
            {businessSetupError ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {businessSetupError}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isCreatingBusiness}>
                {isCreatingBusiness ? "Creating..." : "Create Business & Start Building"}
              </Button>
              <Button asChild variant="outline">
                <Link href="/protected/pages">Back to My Pages</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white px-8 py-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-black dark:shadow-[0_22px_70px_rgba(0,0,0,0.36)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-950 shadow-sm dark:border-amber-200 dark:bg-amber-50 dark:text-slate-950">
                Crown Page Builder
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">Edit Page</h1>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              {canObtainMedia ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-slate-300/80 bg-white/92 px-5 text-slate-900 shadow-sm dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
                  onClick={() => {
                    setMediaCompanyName(companyNameForQrStand || title);
                    setIsMediaScrubberMinimized(false);
                    setShowMediaModal(true);
                  }}
                >
                  <FileSearch className="h-4 w-4" />
                  Obtain Media
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-300/80 bg-white/92 px-5 text-slate-900 shadow-sm dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
                onClick={handleGenerateQrStandClick}
                disabled={isGeneratingQrStand}
                title="Generate a printable QR flyer PDF."
              >
                {isGeneratingQrStand ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                {isGeneratingQrStand ? "Generating..." : "Generate QR Stand"}
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)]">
          <div className="min-w-0 space-y-6">
        <Card className={PREMIUM_CARD_CLASS}>
          <CardHeader className={`${PREMIUM_CARD_HEADER_CLASS} flex flex-row items-start justify-between gap-4`}>
            <CardTitle className={PREMIUM_CARD_TITLE_CLASS}>Edit Crown Page</CardTitle>
            {isEditMode ? (
              <label className="flex items-center gap-2 pt-1 text-sm text-slate-700 dark:text-slate-200">
                <Checkbox
                  checked={autosaveEnabled}
                  onCheckedChange={(checked) => setAutosaveEnabled(Boolean(checked))}
                />
                <span>Auto-save</span>
              </label>
            ) : null}
          </CardHeader>
          <CardContent className={PREMIUM_CARD_CONTENT_CLASS}>
            {isEditMode ? (
              <div className="flex flex-wrap items-center gap-3 px-1 text-sm">
                <div className="flex items-center gap-2 text-sm">
                  {saveStatus === "saving" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-slate-700 dark:text-slate-200">Saving...</span>
                    </>
                  ) : null}
                  {saveStatus === "saved" && lastSavedAt ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-slate-700 dark:text-slate-200">Saved {formatTimeAgo(lastSavedAt)}</span>
                    </>
                  ) : null}
                  {saveStatus === "unsaved" ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-slate-700 dark:text-slate-200">Unsaved changes</span>
                    </>
                  ) : null}
                  {saveStatus === "error" ? (
                    <>
                      <TriangleAlert className="h-4 w-4 text-red-600" />
                      <span className="text-slate-700 dark:text-slate-200">Save failed</span>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="page-title" className={PREMIUM_LABEL_CLASS}>Page Title</Label>
                <Input
                  id="page-title"
                  className={PREMIUM_INPUT_CLASS}
                  value={title}
                  placeholder="Welcome to Smith Dental"
                  onChange={(event) => handleTitleChange(event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="page-description" className={PREMIUM_LABEL_CLASS}>Short Description</Label>
                <textarea
                  id="page-description"
                  className={PREMIUM_TEXTAREA_CLASS}
                  rows={4}
                  value={description}
                  placeholder="A short description for internal use and public page previews."
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-select" className={PREMIUM_LABEL_CLASS}>Business</Label>
                <select
                  id="business-select"
                  className={PREMIUM_SELECT_CLASS}
                  value={businessId}
                  onChange={(event) => setBusinessId(event.target.value)}
                >
                  {availableBusinesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="page-slug" className={PREMIUM_LABEL_CLASS}>Page URL Slug</Label>
                <Input
                  id="page-slug"
                  className={PREMIUM_INPUT_CLASS}
                  value={slug}
                  placeholder="welcome-page"
                  onChange={(event) => handleSlugChange(event.target.value)}
                />
                <p className={PREMIUM_HELPER_CLASS}>
                  Preview: crownpages.com/{selectedBusiness?.slug || "business"}/{slug || "page-slug"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:!border-slate-700/80 dark:!bg-slate-900/95">
                <Checkbox
                  checked={isPublished}
                  onCheckedChange={(checked) => setIsPublished(Boolean(checked))}
                />
                <span className="space-y-1">
                    <span className="block font-medium text-slate-900 dark:text-slate-100">Publish when saved</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      Leave this off to keep the page as a draft.
                    </span>
                </span>
              </label>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:!border-slate-700/80 dark:!bg-slate-900/95">
                <p className="font-medium text-slate-900 dark:text-slate-100">Page Actions</p>
                {!canRenderPageActions ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Match the mobile app behavior: add both a Company Header and Contact Card section to enable Connect and Visit buttons.
                  </p>
                ) : null}
                <div className="mt-3 space-y-3">
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={includeInstaConnect}
                      disabled={!canRenderPageActions}
                      onCheckedChange={(checked) => setIncludeInstaConnect(Boolean(checked))}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">Include InstaConnect lead button</span>
                  </label>
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={includeScheduleMeeting}
                      disabled={!canRenderPageActions}
                      onCheckedChange={(checked) => setIncludeScheduleMeeting(Boolean(checked))}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">Include Schedule Visit button</span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="h-11 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 px-5 font-semibold text-slate-950 shadow-[0_16px_36px_rgba(245,158,11,0.26)] hover:from-amber-200 hover:via-yellow-200 hover:to-orange-300 dark:from-amber-300 dark:via-yellow-300 dark:to-orange-400"
                onClick={() => void savePage({ redirectAfterSave: false, showValidationInline: true })}
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Create Page"}
              </Button>
              <Button type="button" variant="outline" className="h-11 rounded-xl border-slate-300/80 bg-white/92 px-5 text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/80 dark:text-slate-100" onClick={() => router.push("/protected/pages")}>
                Back to Pages
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={PREMIUM_CARD_CLASS}>
          <CardHeader className={PREMIUM_CARD_HEADER_CLASS}>
            <CardTitle className={PREMIUM_CARD_TITLE_CLASS}>Sections</CardTitle>
          </CardHeader>
          <CardContent className={PREMIUM_CARD_CONTENT_CLASS}>
            <div className="space-y-4">
              {sections.map((section, index) => {
                const definition = getBuilderSectionDefinition(section.type);

                if (!definition) {
                  return (
                    <Card key={section.id} className={PREMIUM_SECTION_CARD_CLASS}>
                      <CardHeader className={PREMIUM_CARD_HEADER_CLASS}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className={`text-lg ${PREMIUM_CARD_TITLE_CLASS}`}>
                              {index + 1}. Unsupported section: {section.type}
                            </CardTitle>
                          </div>
                          {null}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                          Leave this section in place to preserve the page. If you save, unsupported sections are kept as-is unless you remove them elsewhere in the data.
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                const renderSectionFields = (fieldKeys: readonly string[]) => (
                  <div className="grid gap-4 md:grid-cols-2">
                    {fieldKeys.map((fieldKey) => {
                      const fieldDefinition = definition.fields[fieldKey];

                      if (!fieldDefinition) {
                        return null;
                      }

                      return (
                        <div
                          key={`${section.id}-${fieldKey}`}
                          className={fieldDefinition.type === "textarea" || fieldDefinition.type === "array" ? "md:col-span-2" : ""}
                        >
                          {renderFieldEditor(
                            `${section.id}-${fieldKey}`,
                            fieldDefinition as FieldDefinition,
                            section.data[fieldKey],
                            (nextValue) => updateSectionField(section.id, fieldKey, nextValue),
                          )}
                        </div>
                      );
                    })}
                  </div>
                );

                const renderCardHeader = (
                  title: string,
                  actions?: ReactNode,
                ) => (
                  <CardHeader className={PREMIUM_CARD_HEADER_CLASS}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className={`text-lg ${PREMIUM_CARD_TITLE_CLASS}`}>{title}</CardTitle>
                      </div>
                      {actions}
                    </div>
                  </CardHeader>
                );

                const sectionActions = (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                );

                if (section.type === "linksWithContact") {
                  return (
                    <div key={section.id} className="space-y-4">
                      <Card className={PREMIUM_SECTION_CARD_CLASS}>
                        {renderCardHeader(`${index + 1}. Pages`, sectionActions)}
                        <CardContent>{renderSectionFields(LINKS_WITH_CONTACT_PAGES_FIELDS)}</CardContent>
                      </Card>
                      <Card className={PREMIUM_SECTION_CARD_CLASS}>
                        {renderCardHeader("Contact Button")}
                        <CardContent>{renderSectionFields(LINKS_WITH_CONTACT_CONTACT_FIELDS)}</CardContent>
                      </Card>
                    </div>
                  );
                }

                return (
                  <Card key={section.id} className={PREMIUM_SECTION_CARD_CLASS}>
                    {renderCardHeader(`${index + 1}. ${definition.name}`, sectionActions)}
                    <CardContent>
                      {renderSectionFields(Object.keys(definition.fields))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 lg:sticky lg:top-6 lg:flex lg:justify-center">
        <div className="w-full max-w-[760px] space-y-6 lg:mx-auto">
        <Card className="overflow-hidden rounded-[32px] border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-[#06080d] dark:shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
          <CardHeader className={PREMIUM_CARD_HEADER_CLASS}>
            <div className="flex items-center justify-center gap-2 text-center">
              <Eye className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              <CardTitle className={PREMIUM_CARD_TITLE_CLASS}>Live Preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center border-t border-slate-100/80 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_30%),linear-gradient(180deg,_rgba(20,20,24,0.98),_rgba(6,6,9,1))] px-4 py-5 lg:px-5 lg:py-5">
            <div
              ref={previewFitRef}
              className="mx-auto flex h-[calc(100vh-220px)] min-h-[560px] w-full max-w-[640px] justify-center overflow-hidden"
            >
              <div
                className="shrink-0"
                style={{
                  width: IPHONE_17_PRO_SHELL_WIDTH * previewScale,
                  height: IPHONE_17_PRO_SHELL_HEIGHT * previewScale,
                  transform: "translateX(-68px)",
                }}
              >
              <div
                className="relative origin-top rounded-[2.9rem] bg-[#050608] shadow-[0_38px_120px_rgba(0,0,0,0.58)] ring-1 ring-white/10"
                style={{
                  width: IPHONE_17_PRO_SHELL_WIDTH,
                  height: IPHONE_17_PRO_SHELL_HEIGHT,
                  padding: IPHONE_17_PRO_OUTER_PADDING,
                  transform: `scale(${previewScale})`,
                  marginInline: "auto",
                }}
              >
                <div className="pointer-events-none absolute inset-y-24 left-[5px] z-30 w-[3px] rounded-full bg-white/10" />
                <div className="pointer-events-none absolute inset-y-36 left-[5px] z-30 h-14 w-[3px] rounded-full bg-white/10" />
                <div className="pointer-events-none absolute inset-y-32 right-[5px] z-30 h-20 w-[3px] rounded-full bg-white/10" />
                <div className="absolute inset-0 rounded-[2.9rem] bg-[linear-gradient(145deg,_rgba(255,255,255,0.08),_rgba(255,255,255,0.01)_22%,_rgba(255,255,255,0)_52%,_rgba(255,255,255,0.06)_100%)]" />
                <div
                  className="relative h-full rounded-[2.45rem] border border-white/10 bg-[#111216]"
                  style={{ padding: IPHONE_17_PRO_INNER_PADDING }}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex justify-center"
                    style={{ top: IPHONE_17_PRO_STATUS_TOP - 2 }}
                  >
                    <div
                      className="rounded-full bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      style={{
                        width: IPHONE_17_PRO_ISLAND_WIDTH,
                        height: IPHONE_17_PRO_ISLAND_HEIGHT,
                      }}
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center justify-between text-[10px] font-semibold text-white/92"
                    style={{
                      top: IPHONE_17_PRO_STATUS_TOP + 2,
                      paddingLeft: IPHONE_17_PRO_STATUS_SIDE,
                      paddingRight: IPHONE_17_PRO_STATUS_SIDE,
                    }}
                  >
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="block h-[6px] w-[6px] rounded-full bg-white/85" />
                      <span className="block h-[6px] w-[6px] rounded-full bg-white/85" />
                      <span className="block h-[6px] w-[14px] rounded-sm border border-white/70" />
                    </div>
                  </div>
                  <div
                    className="relative h-full overflow-hidden rounded-[2rem] border border-black/70 bg-white"
                  >
                    <div className="absolute inset-0 overflow-hidden bg-[#f5f6fa]">
                      <div className="absolute inset-x-0 top-0">
                        <div
                          className="relative z-20 shrink-0 bg-white/96 backdrop-blur-sm"
                          style={{ height: IPHONE_17_PRO_BROWSER_TOPBAR_HEIGHT }}
                        />
                        <div
                          className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 text-[11px] font-semibold text-slate-900"
                          style={{
                            height: IPHONE_17_PRO_BROWSER_TOPBAR_HEIGHT,
                            paddingTop: 10,
                          }}
                        >
                          <div className="truncate text-left">
                            {previewBusiness?.name || "CrownPages"}
                          </div>
                          <div className="flex items-center gap-3 text-slate-500">
                            <span>⋯</span>
                            <span>◔</span>
                          </div>
                        </div>
                        <div
                          className="overflow-y-auto overscroll-contain bg-white touch-pan-y [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20"
                          style={{
                            maxHeight: IPHONE_17_PRO_BROWSER_CONTENT_MAX_HEIGHT,
                            WebkitOverflowScrolling: "touch",
                          }}
                        >
                          <div
                            className="relative overflow-hidden"
                            style={{
                              width: IPHONE_17_PRO_VIEWPORT_WIDTH / IPHONE_17_PRO_CONTENT_SCALE,
                              height: previewContentHeight
                                ? previewContentHeight * IPHONE_17_PRO_CONTENT_SCALE
                                : undefined,
                            }}
                          >
                            <div
                              ref={previewContentRef}
                              className="absolute left-0 top-0 origin-top-left"
                              style={{
                                width: IPHONE_17_PRO_VIEWPORT_WIDTH / IPHONE_17_PRO_CONTENT_SCALE,
                                transform: `scale(${IPHONE_17_PRO_CONTENT_SCALE})`,
                              }}
                            >
                              <MobileNativePreview
                                sections={sections}
                                business={previewBusiness}
                                pageTitle={title || "Preview"}
                                includeInstaConnect={includeInstaConnect}
                                includeScheduleMeeting={includeScheduleMeeting}
                              />
                            </div>
                          </div>
                        </div>
                        <div
                          className="z-30 border-t border-black/10 bg-white/96 px-3 backdrop-blur-sm"
                          style={{
                            height: IPHONE_17_PRO_BROWSER_BOTTOMBAR_HEIGHT,
                            paddingTop: 6,
                            paddingBottom: 6,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 rounded-full bg-[#f6f7fb] px-3 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.08)]">
                            <div className="flex items-center gap-3 text-slate-400">
                              <span className="text-base">‹</span>
                              <span className="text-base">≡</span>
                            </div>
                            <span className="truncate text-xs font-medium text-slate-700">
                              localhost
                            </span>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span className="text-sm">↻</span>
                              <span className="text-base">⋯</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
                      <div className="h-1.5 w-28 rounded-full bg-black/80" />
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>
    </div>

      {showMediaScrubberPill && mediaCollectionJob ? (
        <div className="fixed bottom-5 right-5 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.22)] backdrop-blur dark:border-amber-500/30 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                {isMediaCollectionRunning ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                  Obtain Media
                </p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {isMediaCollectionRunning
                  ? mediaActivityMessage
                  : mediaCollectionJob.status === "completed"
                    ? "Media ZIP is ready."
                    : getMediaCollectionStageLabel(mediaCollectionJob.currentStage)}
              </p>
            </div>
            {isMediaCollectionRunning ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" /> : null}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                mediaCollectionJob.status === "failed"
                  ? "bg-red-500"
                  : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
              }`}
              style={{ width: `${getMediaCollectionProgress(mediaCollectionJob.currentStage)}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-900">
              <p className="font-semibold text-slate-950 dark:text-white">{mediaCollectionJob.pagesScanned}</p>
              <p className="text-slate-500 dark:text-slate-400">Pages</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-900">
              <p className="font-semibold text-slate-950 dark:text-white">{mediaCollectionJob.assetsFound}</p>
              <p className="text-slate-500 dark:text-slate-400">Assets</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-900">
              <p className="font-semibold text-slate-950 dark:text-white">{mediaCollectionJob.duplicatesSkipped}</p>
              <p className="text-slate-500 dark:text-slate-400">Dupes</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-xl bg-slate-950 px-3 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              onClick={() => {
                setIsMediaScrubberMinimized(false);
                setShowMediaModal(true);
              }}
            >
              Open Scrubber
            </Button>
            {isMediaCollectionRunning ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 rounded-xl px-3"
                onClick={() => void handleStopAndOrganizeMedia()}
                disabled={isStoppingMediaCollection}
              >
                {isStoppingMediaCollection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSearch className="h-3.5 w-3.5" />}
                Stop & Organize
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showMediaModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="flex max-h-[min(92vh,980px)] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-6 dark:border-slate-800">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Obtain Media</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Crawl a source website, review the strongest media picks, then download a sorted ZIP with photos, PDFs, videos, social links, and a discovery report.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isMediaCollectionRunning ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl px-3 text-xs font-semibold"
                    onClick={() => {
                      setIsMediaScrubberMinimized(true);
                      setShowMediaModal(false);
                      setMediaCollectionMessage(null);
                    }}
                  >
                    <Minimize2 className="h-4 w-4" />
                    Minimize Scrubber, Keep Working
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  onClick={() => {
                    setIsMediaScrubberMinimized(isMediaCollectionRunning);
                    setShowMediaModal(false);
                    setMediaCollectionMessage(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="media-source-url" className={PREMIUM_LABEL_CLASS}>Source URL</Label>
                <Input
                  id="media-source-url"
                  className={PREMIUM_INPUT_CLASS}
                  value={mediaSourceUrl}
                  placeholder="https://example.com"
                  onChange={(event) => setMediaSourceUrl(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="media-company-name" className={PREMIUM_LABEL_CLASS}>Company Name</Label>
                <Input
                  id="media-company-name"
                  className={PREMIUM_INPUT_CLASS}
                  value={mediaCompanyName}
                  placeholder="Aspen Ridge East"
                  onChange={(event) => setMediaCompanyName(event.target.value)}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recommended workflow</p>
                </div>
                <ol className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>1. Enter the source URL and company name, then click <span className="font-semibold">Collect Media</span>.</li>
                  <li>2. Review the recommended hero, gallery, page assets, and social links inside Crown Pages.</li>
                  <li>3. Download the media ZIP and unzip it to review sorted folders on your computer.</li>
                  <li>4. Import only the assets you actually want to keep.</li>
                </ol>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
                  <Checkbox
                    checked={mediaCollectionOptions.searchSubpages}
                    onCheckedChange={(checked) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        searchSubpages: Boolean(checked),
                      }))
                    }
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      Search subpages
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Follow internal links with controlled depth limits.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
                  <Checkbox
                    checked={mediaCollectionOptions.collectImages}
                    onCheckedChange={(checked) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        collectImages: Boolean(checked),
                      }))
                    }
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      Collect images
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Pull hero photos, gallery images, and logos.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
                  <Checkbox
                    checked={mediaCollectionOptions.collectPdfs}
                    onCheckedChange={(checked) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        collectPdfs: Boolean(checked),
                      }))
                    }
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      Collect PDFs
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Discover brochures, menus, and downloadable docs.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
                  <Checkbox
                    checked={mediaCollectionOptions.collectVideos}
                    onCheckedChange={(checked) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        collectVideos: Boolean(checked),
                      }))
                    }
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      Collect videos
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Capture direct video files and embedded sources.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
                  <Checkbox
                    checked={mediaCollectionOptions.searchSocialProfiles}
                    onCheckedChange={(checked) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        searchSocialProfiles: Boolean(checked),
                      }))
                    }
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      Search social profiles
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Extract social links found during the crawl.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
                  <Checkbox
                    checked={mediaCollectionOptions.searchYoutube}
                    onCheckedChange={(checked) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        searchYoutube: Boolean(checked),
                      }))
                    }
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      Search YouTube
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Scaffold the YouTube discovery phase for later runners.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
                  <Checkbox
                    checked={mediaCollectionOptions.searchProfessionalHealthNetwork}
                    onCheckedChange={(checked) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        searchProfessionalHealthNetwork: Boolean(checked),
                      }))
                    }
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      Search ProfessionalHealthNetwork
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Reserve a connector slot for ProfessionalHealthNetwork discovery.
                    </span>
                  </span>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="media-max-depth" className={PREMIUM_LABEL_CLASS}>Max crawl depth</Label>
                  <Input
                    id="media-max-depth"
                    type="number"
                    min={0}
                    max={5}
                    className={PREMIUM_INPUT_CLASS}
                    value={mediaCollectionOptions.maxDepth}
                    onChange={(event) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        maxDepth: Math.max(0, Math.min(5, Number(event.target.value || 0))),
                      }))
                    }
                  />
                  <p className={PREMIUM_HELPER_CLASS}>
                    Controls how deep the crawler can follow internal links.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media-max-pages" className={PREMIUM_LABEL_CLASS}>Max pages</Label>
                  <Input
                    id="media-max-pages"
                    type="number"
                    min={1}
                    max={250}
                    className={PREMIUM_INPUT_CLASS}
                    value={mediaCollectionOptions.maxPages}
                    onChange={(event) =>
                      setMediaCollectionOptions((current) => ({
                        ...current,
                        maxPages: Math.max(1, Math.min(250, Number(event.target.value || 1))),
                      }))
                    }
                  />
                  <p className={PREMIUM_HELPER_CLASS}>
                    Limits how many pages are crawled before the job stops.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                Crown Pages will crawl the source site, follow approved internal links, extract media, and prepare a sorted ZIP download without filling Supabase storage with bulk files.
              </div>
              {mediaCollectionJob ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {mediaCollectionJob.status}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Stage: {getMediaCollectionStageLabel(mediaCollectionJob.currentStage)}
                    </span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        mediaCollectionJob.status === "failed"
                          ? "bg-red-500"
                          : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
                      }`}
                      style={{ width: `${getMediaCollectionProgress(mediaCollectionJob.currentStage)}%` }}
                    />
                  </div>
                  {isMediaCollectionRunning ? (
                    <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                              Still working in the background
                            </p>
                            <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                              {mediaActivityMessage}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-900/80 dark:text-amber-200/80">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Polling every 3s
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-slate-950">
                        <div
                          className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-amber-500 to-transparent transition-transform duration-700"
                          style={{ transform: `translateX(${mediaActivityOffset}%)` }}
                        />
                      </div>
                      {mediaCollectionJob.updatedAt ? (
                        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-900/60 dark:text-amber-200/60">
                          Last server update: {new Date(mediaCollectionJob.updatedAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Pages</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{mediaCollectionJob.pagesScanned}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Assets</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{mediaCollectionJob.assetsFound}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Ready</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{mediaCollectionJob.assetsDownloaded}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-slate-950">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Duplicates</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{mediaCollectionJob.duplicatesSkipped}</p>
                    </div>
                  </div>
                  {mediaCollectionJob.lastError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                      {mediaCollectionJob.lastError}
                    </div>
                  ) : null}
                  {isMediaCollectionRunning ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/5">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                          Ready to use what has been found?
                        </p>
                        <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                          Stop the crawl now and organize the saved assets into a downloadable ZIP.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl border-amber-300 bg-white px-4 text-amber-950 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-slate-950 dark:text-amber-100 dark:hover:bg-amber-500/10"
                        onClick={() => void handleStopAndOrganizeMedia()}
                        disabled={isStoppingMediaCollection}
                      >
                        {isStoppingMediaCollection ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSearch className="h-4 w-4" />
                        )}
                        {isStoppingMediaCollection ? "Organizing..." : "Stop & Organize"}
                      </Button>
                    </div>
                  ) : null}
                  {mediaCollectionJob.desktopManifestReady ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                          Media ZIP ready
                        </p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                          Download one ZIP with sorted folders for photos, PDFs, videos, social links, and a discovery report.
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="h-10 rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                        onClick={() => void handleDownloadMediaArchive()}
                        disabled={isDownloadingMediaManifest}
                      >
                        {isDownloadingMediaManifest ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {isDownloadingMediaManifest ? "Preparing ZIP..." : "Download Media ZIP"}
                      </Button>
                    </div>
                  ) : null}
                  {rankedMediaResults ? (
                    <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Social & YouTube Links</p>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {rankedMediaResults.socialLinks.length} found
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {rankedMediaResults.socialLinks.map((socialLink) => (
                            <div key={socialLink.id} className="rounded-xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-950">
                              <p className="font-medium capitalize text-slate-900 dark:text-slate-100">
                                {socialLink.platform === "youtube" ? "YouTube Video URL" : socialLink.platform}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{socialLink.url}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <a
                                  href={socialLink.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  Open Link
                                </a>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-9 rounded-lg px-3 text-xs"
                                  onClick={() => assignSocialLinkToSection(socialLink)}
                                >
                                  Assign Social Link
                                </Button>
                              </div>
                            </div>
                          ))}
                          {!rankedMediaResults.socialLinks.length ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No social or YouTube links found.</p>
                          ) : null}
                        </div>
                      </div>
                  ) : null}
                </div>
              ) : null}
              {mediaCollectionMessage ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {mediaCollectionMessage}
                </div>
              ) : null}
            </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-200/80 px-6 py-5 dark:border-slate-800">
              <Button
                type="button"
                className="h-11 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 px-5 font-semibold text-slate-950 shadow-[0_16px_36px_rgba(245,158,11,0.26)] hover:from-amber-200 hover:via-yellow-200 hover:to-orange-300 dark:from-amber-300 dark:via-yellow-300 dark:to-orange-400"
                onClick={handleCollectMedia}
                disabled={isCollectingMedia || isMediaCollectionRunning}
              >
                {isCollectingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isCollectingMedia
                  ? "Creating Job..."
                  : isMediaCollectionRunning
                    ? "Collection Running"
                    : "Collect Media"}
              </Button>
              {mediaCollectionJob?.desktopManifestReady ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-slate-300/80 bg-white/92 px-5 text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/80 dark:text-slate-100"
                  onClick={() => void handleDownloadMediaArchive()}
                  disabled={isDownloadingMediaManifest}
                >
                  {isDownloadingMediaManifest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloadingMediaManifest ? "Preparing ZIP..." : "Download Media ZIP"}
                </Button>
              ) : null}
              {isMediaCollectionRunning ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-amber-300 bg-amber-50 px-5 text-amber-950 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
                  onClick={() => void handleStopAndOrganizeMedia()}
                  disabled={isStoppingMediaCollection}
                >
                  {isStoppingMediaCollection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSearch className="h-4 w-4" />
                  )}
                  {isStoppingMediaCollection ? "Organizing..." : "Stop & Organize"}
                </Button>
              ) : null}
              {isMediaCollectionRunning ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-slate-300/80 bg-white/92 px-5 text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/80 dark:text-slate-100"
                  onClick={() => {
                    setIsMediaScrubberMinimized(true);
                    setShowMediaModal(false);
                    setMediaCollectionMessage(null);
                  }}
                >
                  <Minimize2 className="h-4 w-4" />
                  Minimize Scrubber, Keep Working
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-300/80 bg-white/92 px-5 text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/80 dark:text-slate-100"
                onClick={() => {
                  setIsMediaScrubberMinimized(isMediaCollectionRunning);
                  setShowMediaModal(false);
                  setMediaCollectionMessage(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
