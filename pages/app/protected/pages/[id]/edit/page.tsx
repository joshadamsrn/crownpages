import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageBuilderForm } from "@/components/page-builder-form";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

export default async function EditPage({
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

  const canObtainMedia = await hasCrownAdminAccess(user.id, supabase);

  const { data: ownedPage } = await supabase
    .from("pages")
    .select("id, title, description, slug, business_id, content, og_image_url, favicon_image_url, publish_settings, is_published, is_active, updated_at")
    .eq("id", id)
    .eq("created_by", user.id)
    .maybeSingle();

  let page = ownedPage;
  let canEditSharedPage = false;

  if (!page) {
    const { data: sharedPermissionRow } = await supabase
      .from("page_shares")
      .select("permission")
      .eq("page_id", id)
      .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${(user.email || "").toLowerCase()}`)
      .eq("permission", "edit")
      .maybeSingle();

    if (sharedPermissionRow) {
      const { data: sharedPage } = await supabase
        .from("pages")
        .select("id, title, description, slug, business_id, content, og_image_url, favicon_image_url, publish_settings, is_published, is_active, updated_at")
        .eq("id", id)
        .maybeSingle();

      page = sharedPage;
      canEditSharedPage = Boolean(sharedPage);
    }
  }

  if (!page) {
    notFound();
  }

  const { data: businesses } = canEditSharedPage
    ? await supabase
        .from("businesses")
        .select("*")
        .eq("id", page.business_id)
        .eq("is_active", true)
    : await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .order("name");

  return <PageBuilderForm businesses={businesses || []} initialPage={page} canObtainMedia={canObtainMedia} />;
}
