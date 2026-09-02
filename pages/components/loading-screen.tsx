import { cn } from "@/lib/utils";

type LoadingScreenProps = {
  label?: string;
  className?: string;
};

export function LoadingScreen({
  label = "Loading CrownPages...",
  className,
}: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[55vh] w-full items-center justify-center bg-background px-6",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 border-r-slate-950 animate-spin dark:border-r-white" />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold tracking-wide text-white shadow-lg dark:bg-white dark:text-slate-950">
            CP
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-slate-950 dark:text-white">
            {label}
          </p>
          <p className="text-sm text-muted-foreground">
            Please wait. The page is still working.
          </p>
        </div>
      </div>
    </div>
  );
}
