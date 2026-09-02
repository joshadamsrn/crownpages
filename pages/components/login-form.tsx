"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  brandName = "Crown Pages",
  isWhiteLabel = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  brandName?: string;
  isWhiteLabel?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/protected/pages");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/82 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  Signing you in...
                </p>
                <p className="text-xs text-muted-foreground">
                  Please wait while your account loads.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        <CardHeader>
          <CardTitle className="text-2xl">
            {isWhiteLabel ? `Sign in to ${brandName}` : "Login"}
          </CardTitle>
          <CardDescription>
            {isWhiteLabel
              ? "Enter your staff credentials to manage pages and resources."
              : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : isWhiteLabel
                    ? "Sign in to workspace"
                    : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {isWhiteLabel
                ? "Need workspace access? "
                : "Don't have an account? "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                {isWhiteLabel ? "Create an account" : "Sign up"}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
