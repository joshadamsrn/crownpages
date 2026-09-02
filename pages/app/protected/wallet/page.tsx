import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WalletManager } from "@/components/wallet-manager";

export default async function WalletPage() {
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
        <h1 className="text-3xl font-bold tracking-tight">My Wallet</h1>
        <p className="text-muted-foreground">
          Open, share, and remove the pages you have saved for later.
        </p>
      </div>
      <WalletManager />
    </div>
  );
}
