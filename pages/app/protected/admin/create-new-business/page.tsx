import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { CreateNewBusinessAdmin } from "@/components/create-new-business-admin";

export default async function CreateNewBusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const canManageCustomers = await hasCrownAdminAccess(user.id, supabase);
  if (!canManageCustomers) {
    redirect("/protected/pages");
  }

  return <CreateNewBusinessAdmin />;
}
