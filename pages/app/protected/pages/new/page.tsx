import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageBuilderForm } from "@/components/page-builder-form";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

export default async function NewPagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const canObtainMedia = await hasCrownAdminAccess(user.id, supabase);

  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Page</h1>
        <p className="text-muted-foreground">
          Build a Crown Page from the website instead of starting on a mobile device.
        </p>
      </div>
      <PageBuilderForm businesses={businesses || []} canObtainMedia={canObtainMedia} />
    </div>
  );
}
