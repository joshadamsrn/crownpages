import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const supabase = createClient()

export const generateSignedUrl = async(url: string, expiry?: number) => {
  
  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(url, expiry || 60 * 60);

    if(data?.signedUrl) return data.signedUrl
    if(error) return null

}

export const generatePublicUrl = async (url: string) => {

  if(!url) return null

  // If the URL is already a full HTTP/HTTPS URL, return it directly
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const { data } = await supabase.storage
    .from("uploads")
    .getPublicUrl(url);


  if (data?.publicUrl) return data.publicUrl


}
