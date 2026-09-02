"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Lock, Trash2, Unlock, Search } from "lucide-react";

export type CustomerListRow = {
  id: string;
  businessName: string;
  pages: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  firstName: string | null;
  lastName: string | null;
  email: string;
  createdAt: string | null;
  lastActivityAt: string | null;
  lastSignInAt: string | null;
  teamLicense: string;
  isLocked: boolean;
};

interface CustomerListAdminProps {
  initialRows: CustomerListRow[];
}

export function CustomerListAdmin({ initialRows }: CustomerListAdminProps) {
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [selectedPageByRow, setSelectedPageByRow] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialRows.map((row) => [row.id, row.pages[0]?.id ?? ""]),
    ),
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
        const fullName = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim().toLowerCase();
      return (
        row.businessName.toLowerCase().includes(query) ||
        row.pages.some(
          (page) =>
            page.title.toLowerCase().includes(query) ||
            page.url.toLowerCase().includes(query),
        ) ||
        row.teamLicense.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        fullName.includes(query)
      );
    });
  }, [rows, search]);

  const formatName = (row: CustomerListRow) => {
    const fullName = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();
    return fullName || "Unnamed User";
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "Unknown";
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const toggleLock = async (row: CustomerListRow) => {
    const shouldLock = !row.isLocked;
    const confirmed = window.confirm(
      shouldLock
        ? `Lock ${row.email} from signing in?`
        : `Unlock ${row.email} so they can sign in again?`,
    );

    if (!confirmed) return;

    setBusyAction(`lock:${row.id}`);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customer-accounts/${row.id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: shouldLock }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update account lock state");
      }

      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, isLocked: shouldLock } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account lock state");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteAccount = async (row: CustomerListRow) => {
    const confirmed = window.confirm(
      `Delete ${row.email}? This permanently removes the account and related data.`,
    );

    if (!confirmed) return;

    setBusyAction(`delete:${row.id}`);
    setError(null);

    try {
      const response = await fetch(`/api/admin/customer-accounts/${row.id}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete account");
      }

      setRows((current) => current.filter((item) => item.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setBusyAction(null);
    }
  };

  const generateKey = async (row: CustomerListRow) => {
    if (row.teamLicense !== "Free Account") return;

    const confirmed = window.confirm(
      `Generate a team license key for ${row.email}?`,
    );

    if (!confirmed) return;

    setBusyAction(`license:${row.id}`);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/customer-accounts/${row.id}/generate-license`,
        {
          method: "POST",
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate team license key");
      }

      const generatedCode = typeof payload.code === "string" ? payload.code.trim() : "";
      if (!generatedCode) {
        throw new Error("Generated team license key was not returned");
      }

      setRows((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, teamLicense: generatedCode } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate team license key");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer List</h1>
            <p className="text-sm text-muted-foreground">
              Team-only organization account management.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search businesses, URLs, licenses, or users"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300/70 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
        <div className="grid min-w-[1280px] grid-cols-[minmax(420px,1.35fr)_minmax(260px,0.95fr)_minmax(180px,0.75fr)_120px_170px_170px] gap-4 border-b border-slate-200/80 px-6 py-4 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
          <div>Business</div>
          <div>User</div>
          <div>Team License</div>
          <div>Status</div>
          <div>Last Activity</div>
          <div className="text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
          {filteredRows.map((row) => {
            const lockBusy = busyAction === `lock:${row.id}`;
            const deleteBusy = busyAction === `delete:${row.id}`;
            const licenseBusy = busyAction === `license:${row.id}`;
            const selectedPageId = selectedPageByRow[row.id] ?? "";
            const selectedPage = row.pages.find((page) => page.id === selectedPageId) ?? null;

            return (
              <div
                key={row.id}
                className="grid min-w-[1280px] grid-cols-[minmax(420px,1.35fr)_minmax(260px,0.95fr)_minmax(180px,0.75fr)_120px_170px_170px] gap-4 px-6 py-5 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {row.businessName}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={selectedPageId}
                      onChange={(event) =>
                        setSelectedPageByRow((current) => ({
                          ...current,
                          [row.id]: event.target.value,
                        }))
                      }
                      className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {row.pages.length ? (
                        row.pages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.title}
                          </option>
                        ))
                      ) : (
                        <option value="">No pages available</option>
                      )}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!selectedPage}
                      onClick={() => {
                        if (selectedPage) {
                          window.open(selectedPage.url, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      View
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!selectedPage}
                      onClick={() => {
                        if (selectedPage) {
                          window.open(`/protected/pages/${selectedPage.id}/analytics`, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="whitespace-nowrap"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View Analytics
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {formatName(row)}
                  </div>
                  <div className="text-muted-foreground">{row.email}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{row.teamLicense}</span>
                  {row.teamLicense === "Free Account" ? (
                    <button
                      type="button"
                      onClick={() => void generateKey(row)}
                      disabled={licenseBusy || lockBusy || deleteBusy}
                      className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400"
                    >
                      {licenseBusy ? "Generating..." : "Generate Key"}
                    </button>
                  ) : null}
                </div>

                <div>
                  <Badge variant={row.isLocked ? "destructive" : "secondary"}>
                    {row.isLocked ? "Locked" : "Active"}
                  </Badge>
                </div>

                <div className="text-muted-foreground">
                  {formatDateTime(row.lastActivityAt ?? row.lastSignInAt)}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleLock(row)}
                    disabled={lockBusy || deleteBusy || licenseBusy}
                    className="min-w-[88px]"
                  >
                    {row.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {row.isLocked ? "Unlock" : "Lock"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void deleteAccount(row)}
                    disabled={lockBusy || deleteBusy || licenseBusy}
                    className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {!filteredRows.length ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            No customers found.
          </div>
        ) : null}
      </div>
    </div>
  );
}
