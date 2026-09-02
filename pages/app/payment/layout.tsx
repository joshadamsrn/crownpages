import { CrownPagesPublicShell } from "@/components/crownpages-public-shell";
import type { ReactNode } from "react";

export default function PaymentLayout({ children }: { children: ReactNode }) {
  return (
    <CrownPagesPublicShell showAccountActions={false}>
      <div className="crownpages-payment-region flex flex-1 flex-col">
        {children}
      </div>
    </CrownPagesPublicShell>
  );
}
