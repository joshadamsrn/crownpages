"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Mail,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ContactStatus = "New" | "In Process" | "Closed" | "Lost";

type ContactSource = "Connect Form" | "Schedule Tour" | "Manual";

type CrmContact = {
  id: string;
  business_id: string;
  page_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  description: string | null;
  source: ContactSource;
  status: ContactStatus;
  source_page_name: string | null;
  submitted_at: string;
  last_contacted_at: string | null;
  tags: string[];
};

type CrmBusinessOption = {
  id: string;
  name: string;
};

type CrmPageOption = {
  id: string;
  title: string;
  business_id: string;
  business_name: string | null;
};

type ManualFormState = {
  pageId: string;
  businessId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  description: string;
  status: ContactStatus;
};

const STATUS_OPTIONS: Array<"All" | ContactStatus> = [
  "All",
  "New",
  "In Process",
  "Closed",
  "Lost",
];

const EMPTY_FORM: ManualFormState = {
  pageId: "",
  businessId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  description: "",
  status: "New",
};

function normalizeTags(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function formatSource(source: string) {
  if (source === "Schedule Tour") return "Visit Form";
  if (source === "Manual") return "Manual Entry";
  return source;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusTone(status: ContactStatus) {
  switch (status) {
    case "New":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900/60";
    case "In Process":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60";
    case "Closed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60";
    case "Lost":
      return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900/60";
  }
}

function ContactAvatar({ contact }: { contact: CrmContact }) {
  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase() || "?";
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
      {initials}
    </div>
  );
}

export function ContactsManager() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [businesses, setBusinesses] = useState<CrmBusinessOption[]>([]);
  const [pages, setPages] = useState<CrmPageOption[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ContactStatus>("All");
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualFormState>(EMPTY_FORM);
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const userId = user.id;
      const userEmail = (user.email || "").toLowerCase();

      const [
        { data: ownPages, error: ownPagesError },
        { data: kioskAdminRows, error: kioskAdminError },
        { data: shareRows, error: shareError },
      ] =
        await Promise.all([
          supabase
            .from("pages")
            .select("id, title, business_id, businesses(name)")
            .eq("created_by", userId)
            .eq("is_active", true)
            .order("title", { ascending: true }),
          supabase
            .from("kiosk_admins")
            .select("business_id")
            .eq("user_id", userId),
          supabase
            .from("page_shares")
            .select("page_id")
            .or(`shared_with_user_id.eq.${userId},shared_with_email.eq.${userEmail}`),
        ]);

      if (ownPagesError) throw ownPagesError;
      if (kioskAdminError) throw kioskAdminError;
      if (shareError) throw shareError;

      const kioskAdminBusinessIds = Array.from(
        new Set((kioskAdminRows || []).map((row: any) => row.business_id).filter(Boolean)),
      );

      let kioskAdminPages: any[] = [];
      if (kioskAdminBusinessIds.length > 0) {
        const { data, error } = await supabase
          .from("pages")
          .select("id, title, business_id, businesses(name)")
          .in("business_id", kioskAdminBusinessIds)
          .eq("is_active", true)
          .order("title", { ascending: true });

        if (error) throw error;
        kioskAdminPages = data || [];
      }

      const sharedPageIds = Array.from(
        new Set((shareRows || []).map((row: any) => row.page_id).filter(Boolean)),
      );

      let sharedPages: any[] = [];
      if (sharedPageIds.length > 0) {
        const { data, error } = await supabase
          .from("pages")
          .select("id, title, business_id, businesses(name)")
          .in("id", sharedPageIds)
          .eq("is_active", true)
          .order("title", { ascending: true });

        if (error) throw error;
        sharedPages = data || [];
      }

      const dedupedPages = Array.from(
        new Map([...(ownPages || []), ...kioskAdminPages, ...sharedPages].map((entry: any) => [entry.id, entry])).values(),
      );

      const [{ data: ownedBusinesses, error: ownedBusinessesError }, { data: membershipRows, error: membershipError }] =
        await Promise.all([
          supabase
            .from("businesses")
            .select("id, name")
            .eq("owner_id", userId)
            .order("name", { ascending: true }),
          supabase
            .from("business_members")
            .select("business_id")
            .or(`user_id.eq.${userId},invited_email.eq.${userEmail}`),
        ]);

      if (ownedBusinessesError) throw ownedBusinessesError;
      if (membershipError) throw membershipError;

      const memberBusinessIds = Array.from(
        new Set(
          [...(membershipRows || []), ...(kioskAdminRows || [])]
            .map((row: any) => row.business_id)
            .filter(Boolean),
        ),
      );

      let memberBusinesses: any[] = [];
      if (memberBusinessIds.length > 0) {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", memberBusinessIds)
          .order("name", { ascending: true });

        if (error) throw error;
        memberBusinesses = data || [];
      }

      const pageBusinessIds = Array.from(
        new Set(
          dedupedPages
            .map((page: any) => page.business_id)
            .filter(
              (businessId) =>
                businessId &&
                !(ownedBusinesses || []).some((entry: any) => entry.id === businessId) &&
                !memberBusinessIds.includes(businessId),
            ),
        ),
      );

      let pageBusinesses: any[] = [];
      if (pageBusinessIds.length > 0) {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name")
          .in("id", pageBusinessIds)
          .order("name", { ascending: true });

        if (error) throw error;
        pageBusinesses = data || [];
      }

      const { data: contactsData, error: contactsError } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (contactsError) throw contactsError;

      const normalizedContacts = ((contactsData || []) as any[]).map(
        (entry): CrmContact => ({
          ...entry,
          tags: normalizeTags(entry.tags),
        }),
      );

      setContacts(normalizedContacts);
      setPages(
        dedupedPages.map(
          (entry: any): CrmPageOption => ({
            id: entry.id,
            title: entry.title,
            business_id: entry.business_id,
            business_name: entry.businesses?.name || null,
          }),
        ),
      );
      setBusinesses(
        Array.from(
          new Map(
            [...(ownedBusinesses || []), ...memberBusinesses, ...pageBusinesses].map((entry: any) => [
              entry.id,
              entry,
            ]),
          ).values(),
        ).map((entry: any) => ({
          id: entry.id,
          name: entry.name,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!manualOpen) return;
    if (manualForm.businessId) return;

    setManualForm((current) => ({
      ...current,
      businessId: businesses[0]?.id || pages[0]?.business_id || "",
    }));
  }, [manualOpen, manualForm.businessId, businesses, pages]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (statusFilter !== "All" && contact.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        contact.first_name,
        contact.last_name,
        contact.email || "",
        contact.phone || "",
        contact.source_page_name || "",
        ...(contact.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [contacts, search, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      All: contacts.length,
      New: contacts.filter((contact) => contact.status === "New").length,
      "In Process": contacts.filter((contact) => contact.status === "In Process").length,
      Closed: contacts.filter((contact) => contact.status === "Closed").length,
      Lost: contacts.filter((contact) => contact.status === "Lost").length,
    }),
    [contacts],
  );

  const updateStatus = async (contactId: string, status: ContactStatus) => {
    setError(null);
    try {
      const { data, error } = await supabase
        .from("crm_contacts")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contactId)
        .select("*")
        .single();

      if (error) throw error;

      setContacts((current) =>
        current.map((entry) =>
          entry.id === contactId
            ? {
                ...(data as any),
                tags: normalizeTags((data as any).tags),
              }
            : entry,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contact status.");
    }
  };

  const handleManualCreate = async () => {
    if (!manualForm.firstName.trim() || !manualForm.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Not authenticated");

      const selectedPage = pages.find((page) => page.id === manualForm.pageId);
      const businessId =
        selectedPage?.business_id || manualForm.businessId || businesses[0]?.id || "";

      if (!businessId) {
        throw new Error("Select a business before creating a contact.");
      }

      const { data, error } = await supabase.rpc("create_manual_crm_contact", {
        p_business_id: businessId,
        p_page_id: selectedPage?.id || null,
        p_created_by: user.id,
        p_first_name: manualForm.firstName.trim(),
        p_last_name: manualForm.lastName.trim(),
        p_email: manualForm.email.trim() || null,
        p_phone: manualForm.phone.trim() || null,
        p_message: manualForm.notes.trim() || null,
        p_description: manualForm.description.trim() || null,
        p_source: "Manual",
        p_status: manualForm.status,
        p_source_page_name: selectedPage?.title || null,
        p_tags: [],
      });

      if (error) throw error;

      setContacts((current) => [
        {
          ...(data as any),
          tags: normalizeTags((data as any).tags),
        },
        ...current,
      ]);
      setManualOpen(false);
      setManualForm({
        ...EMPTY_FORM,
        businessId: businesses[0]?.id || pages[0]?.business_id || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_20px_60px_rgba(0,0,0,0.32)]">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Contacts Pipeline</CardTitle>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="relative min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search contacts..."
                className="pl-9"
              />
            </div>
            <Button onClick={() => setManualOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  statusFilter === status
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                {status}{" "}
                <span className="ml-1 text-xs opacity-70">
                  ({statusCounts[status]})
                </span>
              </button>
            ))}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-300/70 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-muted-foreground dark:border-slate-700">
              Loading contacts...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-muted-foreground dark:border-slate-700">
              No contacts found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <ContactAvatar contact={contact} />
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedContact(contact)}
                            className="text-left text-lg font-semibold text-slate-900 transition hover:text-slate-600 dark:text-white dark:hover:text-slate-300"
                          >
                            {`${contact.first_name} ${contact.last_name}`.trim()}
                          </button>
                          <Badge className={getStatusTone(contact.status)}>{contact.status}</Badge>
                          <Badge variant="outline">{formatSource(contact.source)}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatTimestamp(contact.submitted_at)}
                          </span>
                          {contact.source_page_name ? (
                            <span className="inline-flex items-center gap-2">
                              <UserRound className="h-4 w-4" />
                              {contact.source_page_name}
                            </span>
                          ) : null}
                        </div>
                        {contact.description ? (
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {contact.description}
                          </p>
                        ) : null}
                        {contact.message ? (
                          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                            {contact.message}
                          </div>
                        ) : null}
                        {contact.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {contact.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex min-w-[250px] flex-col gap-3">
                      <select
                        value={contact.status}
                        onChange={(event) =>
                          void updateStatus(contact.id, event.target.value as ContactStatus)
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        {STATUS_OPTIONS.filter((status): status is ContactStatus => status !== "All").map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <div className="flex flex-wrap gap-2">
                        {contact.email ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`mailto:${contact.email}`, "_self")}
                          >
                            <Mail className="h-4 w-4" />
                            Email
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {manualOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-semibold">Add Contact</h2>
                <p className="text-sm text-muted-foreground">
                  Create a CRM contact from the web and keep mobile in sync.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setManualOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Attach Page (Optional)</label>
                <select
                  value={manualForm.pageId}
                  onChange={(event) =>
                    setManualForm((current) => ({
                      ...current,
                      pageId: event.target.value,
                      businessId:
                        pages.find((page) => page.id === event.target.value)?.business_id ||
                        current.businessId,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">No page attached</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Business</label>
                <select
                  value={manualForm.businessId}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, businessId: event.target.value }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Select a business</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={manualForm.status}
                  onChange={(event) =>
                    setManualForm((current) => ({
                      ...current,
                      status: event.target.value as ContactStatus,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {STATUS_OPTIONS.filter((status): status is ContactStatus => status !== "All").map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={manualForm.firstName}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={manualForm.lastName}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={manualForm.email}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={manualForm.phone}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={manualForm.description}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={manualForm.notes}
                  onChange={(event) =>
                    setManualForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
              <Button variant="outline" onClick={() => setManualOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleManualCreate()} disabled={saving}>
                <CheckCircle2 className="h-4 w-4" />
                {saving ? "Saving..." : "Create Contact"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedContact ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-start gap-4">
                <ContactAvatar contact={selectedContact} />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {`${selectedContact.first_name} ${selectedContact.last_name}`.trim()}
                    </h2>
                    <Badge className={getStatusTone(selectedContact.status)}>
                      {selectedContact.status}
                    </Badge>
                    <Badge variant="outline">{formatSource(selectedContact.source)}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Submitted {formatTimestamp(selectedContact.submitted_at)}
                    </span>
                    {selectedContact.last_contacted_at ? (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Last contacted {formatTimestamp(selectedContact.last_contacted_at)}
                      </span>
                    ) : null}
                    {selectedContact.source_page_name ? (
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        {selectedContact.source_page_name}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedContact(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Email
                  </div>
                  <div className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                    {selectedContact.email || "Not provided"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Phone
                  </div>
                  <div className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                    {selectedContact.phone || "Not provided"}
                  </div>
                </div>
              </div>

              {selectedContact.description ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Description
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {selectedContact.description}
                  </div>
                </div>
              ) : null}

              {selectedContact.message ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Notes
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {selectedContact.message}
                  </div>
                </div>
              ) : null}

              {selectedContact.tags.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
              <Button variant="outline" onClick={() => setSelectedContact(null)}>
                Close
              </Button>
              {selectedContact.email ? (
                <Button
                  type="button"
                  onClick={() => window.open(`mailto:${selectedContact.email}`, "_self")}
                >
                  <Mail className="h-4 w-4" />
                  Email Contact
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
