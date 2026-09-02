import { redirect } from "next/navigation";

import { KioskVisitorLog } from "@/components/kiosk-visitor-log";
import { createClient } from "@/lib/supabase/server";

export default async function KioskVisitorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <KioskVisitorLog />;
}
