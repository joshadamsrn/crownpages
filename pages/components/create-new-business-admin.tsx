"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, Loader2, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PremadePageResult = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  businessName: string | null;
  businessSlug: string | null;
};

type CreateResult = {
  businessSlug: string;
  pageSlug: string;
  pageTitle: string;
  accountOwnerEmail: string;
  licenseCode: string;
  licenseActiveSeats?: number;
  licenseMaxSeats?: number;
  publicPath: string;
  sharedWith: string[];
};

type FormState = {
  pageName: string;
  accountOwnerEmail: string;
  accountPassword: string;
  businessName: string;
  businessDescription: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerRole: string;
  ownerPhone: string;
  ownerEmail: string;
  faxNumber: string;
  mainOfficeNumber: string;
  website: string;
};

const EMPTY_FORM: FormState = {
  pageName: "",
  accountOwnerEmail: "",
  accountPassword: "",
  businessName: "",
  businessDescription: "",
  ownerFirstName: "",
  ownerLastName: "",
  ownerRole: "",
  ownerPhone: "",
  ownerEmail: "",
  faxNumber: "",
  mainOfficeNumber: "",
  website: "",
};

const REQUIRED_FIELDS: Array<keyof FormState> = [
  "pageName",
  "accountOwnerEmail",
  "accountPassword",
  "businessName",
  "businessDescription",
  "ownerFirstName",
  "ownerLastName",
  "ownerRole",
  "ownerPhone",
  "ownerEmail",
];

function Field({
  id,
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder,
}: {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (id: keyof FormState, value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(id, event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

export function CreateNewBusinessAdmin() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [searchText, setSearchText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<PremadePageResult[]>([]);
  const [selectedPage, setSelectedPage] = useState<PremadePageResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateResult | null>(null);

  const canSubmit = useMemo(() => {
    return (
      selectedPage &&
      REQUIRED_FIELDS.every((field) => form[field].trim().length > 0) &&
      form.accountPassword.trim().length >= 8 &&
      !submitting
    );
  }, [form, selectedPage, submitting]);

  useEffect(() => {
    const query = searchText.trim();
    setSelectedPage((current) => {
      if (!current) return current;
      return current.title.toLowerCase().includes(query.toLowerCase()) ? current : null;
    });

    if (query.length < 2) {
      setResults([]);
      setSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/admin/create-new-business/search-pages?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to search premade pages.");
        }
        setResults(payload.results || []);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setError(searchError instanceof Error ? searchError.message : "Failed to search premade pages.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [searchText]);

  const updateField = (id: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [id]: value }));
  };

  const selectPage = (page: PremadePageResult) => {
    setSelectedPage(page);
    setSearchText(page.title);
    setForm((current) => ({
      ...current,
      pageName: current.pageName || page.title,
      businessName: current.businessName || page.businessName || "",
      businessDescription: current.businessDescription || page.description || "",
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedPage) {
      setError("Select a premade page to move.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/create-new-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selectedPage.id,
          ...form,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create profile.");
      }
      setSuccess(payload as CreateResult);
      setForm(EMPTY_FORM);
      setSearchText("");
      setResults([]);
      setSelectedPage(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create profile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Business</h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Profile created
            </CardTitle>
            <CardDescription className="text-green-700">
              The selected premade page was moved into the new business profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-green-900 md:grid-cols-2">
            <div><strong>Owner:</strong> {success.accountOwnerEmail}</div>
            <div>
              <strong>Team License:</strong> Active, code {success.licenseCode}
              {typeof success.licenseActiveSeats === "number" && typeof success.licenseMaxSeats === "number"
                ? ` (${success.licenseActiveSeats}/${success.licenseMaxSeats} seats used)`
                : null}
            </div>
            <div><strong>Page:</strong> {success.pageTitle}</div>
            <div><strong>Path:</strong> {success.publicPath}</div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Search Page Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="premadePageSearch"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Type the premade page name"
                  className="pl-9"
                />
              </div>
            </div>

            {searchLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : null}

            {results.length > 0 ? (
              <div className="divide-y rounded-lg border">
                {results.map((page) => {
                  const selected = selectedPage?.id === page.id;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => selectPage(page)}
                      className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-muted ${
                        selected ? "bg-blue-50" : ""
                      }`}
                    >
                      <span>
                        <span className="block font-medium">{page.title}</span>
                        <span className="block text-sm text-muted-foreground">
                          {page.businessName || "Unknown business"} / {page.slug}
                        </span>
                      </span>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : searchText.trim().length >= 2 && !searchLoading ? (
              <p className="text-sm text-muted-foreground">No matching premade pages found.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Account and Business</CardTitle>
            <CardDescription>
              These details create the customer login, organization/business record, and page profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field id="pageName" label="Page name" value={form.pageName} onChange={updateField} required />
            <Field id="businessName" label="Business name" value={form.businessName} onChange={updateField} required />
            <Field id="accountOwnerEmail" label="Account owner email" type="email" value={form.accountOwnerEmail} onChange={updateField} required />
            <Field id="accountPassword" label="Account password" value={form.accountPassword} onChange={updateField} required placeholder="At least 8 characters" />
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessDescription">Short description of business <span className="text-destructive">*</span></Label>
              <textarea
                id="businessDescription"
                value={form.businessDescription}
                onChange={(event) => updateField("businessDescription", event.target.value)}
                className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Owner Contact</CardTitle>
            <CardDescription>
              These fields populate the owner profile and supported contact sections on the moved page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field id="ownerFirstName" label="Business owner first name" value={form.ownerFirstName} onChange={updateField} required />
            <Field id="ownerLastName" label="Business owner last name" value={form.ownerLastName} onChange={updateField} required />
            <Field id="ownerRole" label="Owner role or title" value={form.ownerRole} onChange={updateField} required />
            <Field id="ownerPhone" label="Owner phone number" value={form.ownerPhone} onChange={updateField} required />
            <Field id="ownerEmail" label="Owner email" type="email" value={form.ownerEmail} onChange={updateField} required />
            <Field id="faxNumber" label="Fax number" value={form.faxNumber} onChange={updateField} placeholder="Optional" />
            <Field id="mainOfficeNumber" label="Main office number" value={form.mainOfficeNumber} onChange={updateField} placeholder="Optional" />
            <Field id="website" label="Website" value={form.website} onChange={updateField} placeholder="Optional" />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="submit" disabled={!canSubmit} size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoveRight className="h-4 w-4" />}
            {submitting ? "Creating..." : "Create Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
