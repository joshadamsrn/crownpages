import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageOgImageForm } from "@/components/page-og-image-form";

export default async function PageOgImageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: page } = await supabase
    .from("pages")
    .select("id, title, og_image_url")
    .eq("id", id)
    .eq("created_by", user.id)
    .single();

  if (!page) {
    notFound();
  }

  return (
    <PageOgImageForm
      pageId={page.id}
      pageTitle={page.title}
      currentOgImageUrl={page.og_image_url}
    />
  );
}
