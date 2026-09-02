import crypto from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const SHORT_CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const DEFAULT_CODE_LENGTH = 7;

function createShortCode(length = DEFAULT_CODE_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += SHORT_CODE_ALPHABET[bytes[index] % SHORT_CODE_ALPHABET.length];
  }

  return code;
}

export async function createSmsShortLink(args: {
  baseUrl: string;
  targetPath: string;
  linkType: string;
  expiresAtIso?: string | null;
}) {
  if (!args.targetPath.startsWith("/")) {
    throw new Error("Short links only support app-relative target paths.");
  }

  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createShortCode();
    const { error } = await supabase.from("sms_short_links").insert({
      code,
      link_type: args.linkType,
      target_path: args.targetPath,
      expires_at: args.expiresAtIso ?? null,
    });

    if (!error) {
      return `${args.baseUrl.replace(/\/$/, "")}/c/${code}`;
    }

    if (error.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Unable to create a unique short link code.");
}
