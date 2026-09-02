import { CrownPagesPublicShell } from "@/components/crownpages-public-shell";
import { getCurrentWhiteLabelTenant } from "@/lib/white-label-tenants";
import type { ReactNode } from "react";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const tenant = await getCurrentWhiteLabelTenant();

  if (tenant.id !== "crownpages") {
    return children;
  }

  return (
    <CrownPagesPublicShell showAccountActions={false}>
      <div className="crownpages-auth-region flex flex-1 flex-col">
        {children}
      </div>
    </CrownPagesPublicShell>
  );
}
