import type { NextConfig } from "next";

function configuredSupabaseHostname() {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
  } catch {
    return null;
  }
}

const supabaseImageHosts = [
  "dbrbbqntpuujgjcinoek.supabase.co",
  configuredSupabaseHostname(),
].filter((hostname, index, hosts): hostname is string => Boolean(hostname) && hosts.indexOf(hostname) === index);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...supabaseImageHosts.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "/storage/v1/**",
      })),
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "content.pexels.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        destination: "/api/apple-app-site-association",
      },
      {
        source: "/.well-known/assetlinks.json",
        destination: "/api/assetlinks.json",
      },
    ];
  },
};

export default nextConfig;
