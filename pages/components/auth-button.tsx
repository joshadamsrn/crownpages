import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

interface AuthButtonProps {
  displayName?: string | null;
  signInLabel?: string;
  signUpLabel?: string;
}

export async function AuthButton({
  displayName,
  signInLabel = "Sign in",
  signUpLabel = "Sign up",
}: AuthButtonProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center gap-4 text-slate-900 dark:text-white">
      {displayName?.trim() || user.email}
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">{signInLabel}</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">{signUpLabel}</Link>
      </Button>
    </div>
  );
}
