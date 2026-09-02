import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactsManager } from "@/components/contacts-manager";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Contacts</h1>
        <p className="text-muted-foreground">
          Review and manage every lead captured across your Crown Pages.
        </p>
      </div>
      <ContactsManager />
    </div>
  );
}
