"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileEdit,
  Settings,
  Building2,
  Crown,
  Users,
  FolderOpen,
  Wallet,
  ContactRound,
  Menu,
  X,
  ClipboardList,
  HeartHandshake,
  CircleDollarSign,
  MonitorCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
  accent?: boolean;
};

interface ProtectedShellProps {
  children: React.ReactNode;
  firstName: string | null;
  isOrgOwner: boolean;
  isTeamMember: boolean;
  isAdmin: boolean;
  canManageCustomers: boolean;
  headerActions: React.ReactNode;
  brandName?: string;
  logoUrl?: string;
  isWhiteLabel?: boolean;
}

export function ProtectedShell({
  children,
  firstName,
  isOrgOwner,
  isTeamMember,
  isAdmin,
  canManageCustomers,
  headerActions,
  brandName = "Crown Pages",
  logoUrl,
  isWhiteLabel = false,
}: ProtectedShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((current) => !current);

  useEffect(() => {
    closeSidebar();
  }, [pathname]);

  useEffect(() => {
    if (isWhiteLabel) {
      return;
    }

    document.body.classList.add("crownpages-dashboard-active");
    return () => document.body.classList.remove("crownpages-dashboard-active");
  }, [isWhiteLabel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems: NavItem[] = [
    {
      href: "/protected",
      label: "Dashboard",
      icon: Home,
      visible: true,
    },
    {
      href: "/protected/upgrade",
      label: "Upgrade to Organization",
      icon: Building2,
      visible: !isOrgOwner,
      accent: true,
    },
    {
      href: "/protected/licenses",
      label: "License Management",
      icon: Crown,
      visible: isOrgOwner || isTeamMember,
    },
    {
      href: "/protected/pages",
      label: "My Pages",
      icon: FileEdit,
      visible: true,
    },
    {
      href: "/protected/pages/shared",
      label: "Pages Shared With Me",
      icon: FolderOpen,
      visible: true,
    },
    {
      href: "/protected/contacts",
      label: "My Contacts",
      icon: ContactRound,
      visible: true,
    },
    {
      href: "/protected/kiosk-visitors",
      label: "Kiosk Visitors",
      icon: ClipboardList,
      visible: true,
    },
    {
      href: "/protected/edit-kiosk",
      label: "Edit Kiosk",
      icon: MonitorCog,
      visible: true,
    },
    {
      href: "/protected/wallet",
      label: "My Wallet",
      icon: Wallet,
      visible: true,
    },
    {
      href: "/protected/customer-list",
      label: "Customer List",
      icon: Users,
      visible: canManageCustomers,
    },
    {
      href: "/protected/network-facilities",
      label: "Network Facilities",
      icon: Building2,
      visible: canManageCustomers,
    },
    {
      href: "/protected/network-referrals",
      label: "Network Referrals",
      icon: HeartHandshake,
      visible: canManageCustomers,
    },
    {
      href: "/protected/network-fees",
      label: "Network Fees",
      icon: CircleDollarSign,
      visible: canManageCustomers,
    },
    {
      href: "/protected/admin/create-new-business",
      label: "Create New Business",
      icon: Building2,
      visible: canManageCustomers,
      accent: true,
    },
    {
      href: "/protected/settings",
      label: "Settings",
      icon: Settings,
      visible: true,
    },
    {
      href: "/protected/admin/generate-license",
      label: "Generate Team Code",
      icon: Crown,
      visible: isAdmin,
      accent: true,
    },
  ];

  return (
    <main
      className={cn(
        "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.96))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.08),transparent_22%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.995),rgba(15,23,42,0.98))]",
        !isWhiteLabel && "crownpages-dashboard-shell",
      )}
    >
      {sidebarOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={closeSidebar}
          />

          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {isWhiteLabel && logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={`${brandName} logo`}
                      width={120}
                      height={48}
                      className="h-9 w-auto object-contain"
                    />
                  ) : (
                    <Image
                      src="/lightlogo.png"
                      alt="CrownPages"
                      width={2205}
                      height={372}
                      className="h-auto w-[178px] object-contain"
                    />
                  )}
                  {isWhiteLabel ? (
                    <span className="text-lg font-bold text-slate-950 dark:text-white">
                      {brandName}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeSidebar();
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-2 px-4 py-6">
                {navItems
                  .filter((item) => item.visible)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/protected"
                        ? pathname === "/protected"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-active={isActive ? "true" : undefined}
                        data-accent={item.accent ? "true" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 transition-colors dark:text-slate-100",
                          item.accent
                            ? "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                            : "hover:bg-slate-100 dark:hover:bg-slate-900",
                          isActive && !item.accent && "bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </nav>
            </div>
          </aside>
        </>
      ) : null}

      <div className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-30 px-6 pt-6">
          <header className="rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-black dark:bg-black dark:shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
            <div className="flex items-start justify-between gap-4 px-6 py-5">
              <div className="flex min-w-0 items-start gap-4">
                <Button variant="outline" size="icon" onClick={toggleSidebar} aria-label={sidebarOpen ? "Close menu" : "Open menu"}>
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                <div className="min-w-0">
                  {isWhiteLabel && logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={`${brandName} logo`}
                      width={140}
                      height={56}
                      className="h-10 w-auto object-contain"
                    />
                  ) : isWhiteLabel ? (
                    <h1 className="truncate text-2xl font-bold text-slate-950 dark:text-white">
                      {brandName.toUpperCase()}
                    </h1>
                  ) : (
                    <Image
                      src="/lightlogo.png"
                      alt="CrownPages"
                      width={2205}
                      height={372}
                      className="h-auto w-[190px] object-contain sm:w-[220px]"
                      priority
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 text-slate-900 dark:text-white">
                {headerActions}
              </div>
            </div>
          </header>
        </div>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </main>
  );
}
