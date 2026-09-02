# Crown Network staging

The local Next.js app is configured to use the persistent Supabase preview
branch named `crown-network-staging` (`mzkosculpuclwivwfdmj`). The branch was
created without production data.

## Local configuration

Local development overrides live in the git-ignored
`.env.development.local` file. Next.js loads that file ahead of `.env.local`,
so production Supabase credentials remain preserved but are not used by
`npm run dev`.

The staging overrides must include:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<staging project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anonymous key>
SUPABASE_SERVICE_ROLE_KEY=<staging service-role key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NETWORK_REFERRALS_ENABLED=true
NETWORK_REFERRALS_EMAIL_ENABLED=false
# Optional: enables nationwide U.S. city resolution through Places API (New).
GOOGLE_PLACES_API_KEY=<restricted server API key>
```

Restart the Next.js development server after changing these values.

## Email safety

`NETWORK_REFERRALS_EMAIL_ENABLED` is intentionally `false` in staging. A
delivery action can create the secure provider access record and queued
notification without sending an external email. Set this value to `true` only
in an environment where provider delivery is approved and Resend is configured.

## Synthetic verification data

The staging branch contains one synthetic referral-enabled community plus 12
real PHN community profiles near ZIP 84129 for directory search testing. The
real profiles remain referral-disabled; only the synthetic pilot should be
used for delivery, provider response, placement, and fee-ledger tests.

The repeatable database files are:

- `supabase/tests/crown_network_staging_fixture.sql`
- `supabase/tests/crown_network_smoke.sql`
- `supabase/tests/crown_network_facility_onboarding_smoke.sql`
- `supabase/tests/crown_network_placement_fee_smoke.sql`

The facility onboarding workflow is available at
`/protected/network-facilities` to Crown Network staff. It supports a
repeatable PHN profile sync, listing verification, care-type correction,
provider notification routing, agreement terms, and referral activation.

A facility is deliverable only when it has all of the following:

- a visible, published profile;
- an active and currently effective referral agreement;
- an eligible referral status and the accepting-referrals switch enabled;
- at least one supported care type; and
- a valid operational notification email.

The onboarding schema is added by
`supabase/migrations/20260901020000_add_network_facility_onboarding.sql`.
Staff changes are recorded in `network_facility_events`.

## Family directory filters

The public directory at `/network` supports care type, state, proximity,
public price, and accepted-insurance filtering. A family can enter a five-digit U.S. ZIP code or a city
with a state and then choose a 5, 10, 25, 50, or 100 mile radius. Results use
stored facility coordinates when present, fall back to the facility ZIP
centroid, and sort nearest-first when distance is active.

City inputs first resolve against the ZIP dataset and the locations of active
Crown Network facilities. This facility-backed fallback recognizes cities such
as Murray, Utah even when the ZIP dataset uses a different USPS preferred city.
When `GOOGLE_PLACES_API_KEY` is configured, unresolved U.S. cities fall back to
Google Places API (New). The key should be restricted to Places API (New) and
stored only as a server environment variable.

The family-facing price control is a single maximum monthly budget. It compares
that budget with `network_facilities.price_low` (falling back to `price_high`
when no starting rate is supplied). Records above the maximum are excluded.
Records without a known public price remain visible as `Contact for pricing`
after matching priced providers so families do not lose potentially suitable
options. Staff can maintain coordinates, consumer price ranges, and billing periods from
`/protected/network-facilities`; referral compensation remains separate.

Skilled Nursing, Home Health, and Hospice searches replace the monthly-budget control
with an accepted-insurance field. Families can enter a plan such as Medicare,
Medicaid, Aetna, or Select Health. Matching is case-insensitive against the
structured `network_facilities.accepted_insurances` list. Insurance
participation, coverage, and prior-authorization requirements must still be
confirmed directly with the provider. Staff can maintain one plan per line in
the facility operations dashboard.

The PHN import stores ZIP-derived coordinates and its public price range in the
page import metadata. `sync_phn_network_facilities()` copies those values into
the Network catalog without overwriting an existing non-null staff value.
For search-only staging samples, the importer supports `--cover-media-only` to
copy hero/logo assets without copying large galleries and videos. Preview
branches get the required public `uploads` bucket from
`20260901070000_ensure_crown_uploads_bucket.sql`.

For an existing PHN import, `--network-metadata-only --update-existing` merges
only the structured coordinates and public pricing into
`content.importSource.network`. It does not rewrite profile sections, media,
business details, ownership, or publication state.

## Placement and fee ledger

Delivered referrals snapshot the facility's fee model, amount or percentage,
terms version, and protection window. Those values are immutable even if the
facility agreement changes later.

Providers can use their secure referral link to record a tour, report a
placement, or close a referral as lost. Crown Network staff confirm the
move-in from the referral inbox. Confirmation creates a calculated ledger
record at `/protected/network-fees` with these supported states:

- `confirmed`
- `invoiced`
- `paid`
- `disputed`
- `waived`

Invoicing is intentionally manual in this milestone. No Stripe charge or
external invoice is created by changing the ledger status.

The fixture expects a synthetic Supabase Auth user and validates the production
signup trigger by relying on its matching `public.users` record.

## Production boundary

Production has the Crown Network schema through
`20260901070000_ensure_crown_uploads_bucket.sql`. Existing PHN profiles are
indexed as directory listings, but remain referral-disabled and cannot receive
family information until staff records an active agreement and explicitly
enables referrals for that facility.

The live Vercel deployment defaults Crown Network on when
`NETWORK_REFERRALS_ENABLED` is not set. Preview deployments and local
environments remain opt-in. Set the variable explicitly to `false` for an
emergency feature shutdown. Provider email delivery remains separately gated
by `NETWORK_REFERRALS_EMAIL_ENABLED=true`.
