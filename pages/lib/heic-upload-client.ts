type SupabaseUploadClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options?: {
          cacheControl?: string;
          contentType?: string;
          upsert?: boolean;
        },
      ) => Promise<{ error: Error | null }>;
    };
  };
};

type UploadImageFileOptions = {
  bucket?: string;
  cacheControl?: string;
  file: File;
  storagePath: string;
  supabase: SupabaseUploadClient;
  upsert?: boolean;
};

function isHeicFile(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
}

function toJpegStoragePath(storagePath: string) {
  if (/\.[^/]+$/.test(storagePath)) {
    return storagePath.replace(/\.[^/.]+$/i, ".jpg");
  }

  return `${storagePath}.jpg`;
}

export async function uploadImageFile({
  bucket = "uploads",
  cacheControl = "3600",
  file,
  storagePath,
  supabase,
  upsert = false,
}: UploadImageFileOptions) {
  if (!isHeicFile(file)) {
    const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
      cacheControl,
      upsert,
    });

    if (error) {
      throw error;
    }

    return { storagePath, converted: false };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("storagePath", toJpegStoragePath(storagePath));

  const response = await fetch("/api/uploads/convert-heic", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    storagePath?: string;
    converted?: boolean;
  } | null;

  if (!response.ok || !payload?.storagePath) {
    throw new Error(payload?.error || "Failed to convert HEIC image.");
  }

  return { storagePath: payload.storagePath, converted: Boolean(payload.converted) };
}
