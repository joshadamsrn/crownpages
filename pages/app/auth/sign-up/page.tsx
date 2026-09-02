import { SignUpForm } from "@/components/sign-up-form";
import { getCurrentWhiteLabelTenant } from "@/lib/white-label-tenants";

export default async function Page() {
  const tenant = await getCurrentWhiteLabelTenant();
  const isWhiteLabel = tenant.id !== "crownpages";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignUpForm
          brandName={tenant.shortName}
          isWhiteLabel={isWhiteLabel}
        />
      </div>
    </div>
  );
}
