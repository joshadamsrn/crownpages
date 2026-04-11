import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MUX_TOKEN_ID =
  Deno.env.get("MUX_TOKEN_ID") ?? "a24c1184-121d-4ac1-aceb-e76b8e307859";
const MUX_TOKEN_SECRET =
  Deno.env.get("MUX_TOKEN_SECRET") ??
  "woNCHkyqhLdLzJPihU0reKAzw0yxJGQz6d68KIOtBO0m8o84sfH3qRTIJoNFH+anV846hAhr9/3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let pageId: string | null = null;
    let sectionId: string | null = null;
    try {
      const body = await req.json();
      pageId = body.pageId ?? null;
      sectionId = body.sectionId ?? null;
    } catch {
      // body is optional
    }

    const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

    const muxResponse = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: `Basic ${muxAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        new_asset_settings: {
          playback_policy: ["public"],
          mp4_support: "standard",
        },
      }),
    });

    if (!muxResponse.ok) {
      const muxError = await muxResponse.text();
      console.error("Mux API error:", muxResponse.status, muxError);
      return new Response(
        JSON.stringify({ error: "Failed to create Mux upload", detail: muxError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const muxData = await muxResponse.json();
    const uploadId = muxData.data.id;
    const uploadUrl = muxData.data.url;

    const { error: dbError } = await supabase.from("mux_assets").insert({
      upload_id: uploadId,
      status: "uploading",
      created_by: user.id,
      page_id: pageId,
      section_id: sectionId,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    return new Response(JSON.stringify({ uploadId, uploadUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
