import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { TenantHome } from "@/components/tenant-home";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { getCurrentWhiteLabelTenant } from "@/lib/white-label-tenants";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  LockKeyhole,
  MonitorSmartphone,
  Play,
  QrCode,
  Share2,
  Smartphone,
  UserRound,
  Users,
} from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentWhiteLabelTenant();

  if (tenant.id === "crownpages") {
    return {
      title: "CrownPages | Digital Info Packets & Kiosk Lead Generation",
      description:
        "Turn printed materials into shareable digital info packets, capture walk-in leads, and understand engagement with CrownPages.",
    };
  }

  return {
    title: `${tenant.shortName} Hub`,
    description: `Create, manage, and share ${tenant.shortName} resource pages from one branded workspace.`,
  };
}

const featureItems = [
  "Virtual tours, pricing, brochures, and resources in one link",
  "Share by text, email, QR code, or direct link",
  "No app required for families or prospects",
];

const kioskItems = [
  "Capture walk-in tours every day",
  "Connect visitors or schedule a tour",
  "Send instant lead alerts to your team",
  "Never miss a walk-in again",
];

const operatingItems = [
  "Simple resident and visitor check-in",
  "Purpose-of-visit and vendor identification",
  "Secure staff access and kiosk history",
  "Four flexible kiosk presentation templates",
];

const analyticsRows = [
  { name: "Alicia Carter", type: "Guest / Family", status: "Checked In", source: "Kiosk" },
  { name: "Marcus Walker", type: "Vendor", status: "Checked Out", source: "Front Entrance" },
  { name: "Jason Bennett", type: "Future Resident", status: "Tour Request", source: "QR Code" },
  { name: "Marie Lopez", type: "Guest / Family", status: "Info Viewed", source: "Digital Packet" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#eda900]">
      <span className="h-px w-8 bg-[#eda900]" />
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-7 space-y-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-base leading-7 text-zinc-300 sm:text-lg">
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#eda900]/60 bg-[#eda900]/10 text-[#eda900]">
            <Check className="h-3 w-3 stroke-[3]" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function TabletFrame({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[1.6rem] border border-white/15 bg-[linear-gradient(145deg,#292929,#080808_48%,#1b1b1b)] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.65),0_0_50px_rgba(237,169,0,0.08)] sm:p-4 ${className}`}
    >
      <span className="absolute left-5 top-5 h-1.5 w-1.5 rounded-full bg-white/15" />
      <span className="absolute right-5 top-5 h-1.5 w-1.5 rounded-full bg-white/15" />
      <span className="absolute bottom-5 left-5 h-1.5 w-1.5 rounded-full bg-white/15" />
      <span className="absolute bottom-5 right-5 h-1.5 w-1.5 rounded-full bg-white/15" />
      <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-white">
        <Image
          src={src}
          alt={alt}
          width={1366}
          height={1024}
          className="h-auto w-full"
          sizes="(max-width: 768px) 92vw, 58vw"
          priority={src.endsWith("template-1.png")}
        />
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[190px] sm:w-[218px]">
      <span className="absolute -left-[3px] top-[22%] h-14 w-[3px] rounded-l bg-zinc-700" />
      <span className="absolute -left-[3px] top-[35%] h-9 w-[3px] rounded-l bg-zinc-700" />
      <span className="absolute -right-[3px] top-[28%] h-20 w-[3px] rounded-r bg-zinc-700" />
      <div className="relative aspect-[9/19.5] rounded-[2.9rem] border border-[#eda900]/45 bg-[linear-gradient(145deg,#323232,#050505_48%,#242424)] p-[6px] shadow-[0_28px_70px_rgba(0,0,0,0.78),0_0_38px_rgba(237,169,0,0.15)]">
        <div className="relative h-full overflow-hidden rounded-[2.5rem] border border-white/15 bg-white">
          <Image
            src="/marketing/frasuresummit-mobile-page-full.jpg"
            alt="Frasure Summit digital information page displayed in the CrownPages mobile app"
            fill
            sizes="(max-width: 640px) 190px, 218px"
            className="object-cover object-center"
          />
          <span className="absolute left-1/2 top-2.5 h-5 w-[42%] -translate-x-1/2 rounded-full bg-black shadow-sm" />
          <span className="absolute bottom-2.5 left-1/2 h-1 w-[34%] -translate-x-1/2 rounded-full bg-black/75" />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.12),transparent_18%,transparent_75%,rgba(255,255,255,0.05))]" />
        </div>
      </div>
    </div>
  );
}

function AppScreenshotPhone({
  src,
  alt,
  className = "",
  imageClassName = "object-cover object-top",
  screenClassName = "bg-white",
  showIsland = true,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  screenClassName?: string;
  showIsland?: boolean;
}) {
  return (
    <div className={`relative w-full min-w-0 ${className}`}>
      <span className="absolute -left-[3px] top-[22%] h-12 w-[3px] rounded-l bg-zinc-700" />
      <span className="absolute -left-[3px] top-[34%] h-8 w-[3px] rounded-l bg-zinc-700" />
      <span className="absolute -right-[3px] top-[28%] h-16 w-[3px] rounded-r bg-zinc-700" />
      <div className="relative aspect-[9/18.4] overflow-hidden rounded-[clamp(1.2rem,3.2vw,2.8rem)] border border-white/20 bg-[linear-gradient(145deg,#343434,#050505_52%,#252525)] p-[clamp(4px,0.55vw,7px)] shadow-[0_25px_65px_rgba(0,0,0,0.72),0_0_30px_rgba(237,169,0,0.08)]">
        <div
          className={`relative h-full overflow-hidden rounded-[clamp(0.95rem,2.8vw,2.35rem)] border border-white/10 ${screenClassName}`}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 30vw, (max-width: 1024px) 25vw, 220px"
            className={imageClassName}
          />
          {showIsland ? (
            <span className="absolute left-1/2 top-2 h-[clamp(10px,1.7vw,18px)] w-[38%] -translate-x-1/2 rounded-full bg-black shadow-sm" />
          ) : null}
          <span className="absolute bottom-2 left-1/2 h-[3px] w-[32%] -translate-x-1/2 rounded-full bg-black/70" />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(108deg,rgba(255,255,255,0.1),transparent_19%,transparent_78%,rgba(255,255,255,0.04))]" />
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  if (hasEnvVars) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/protected/pages");
    }
  }

  const tenant = await getCurrentWhiteLabelTenant();

  if (tenant.id !== "crownpages") {
    return <TenantHome tenant={tenant} />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#030303] text-white selection:bg-[#eda900] selection:text-black">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:56px_56px]" />

      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/" className="shrink-0" aria-label="CrownPages home">
            <Image
              src="/lightlogo.png"
              alt="CrownPages"
              width={2205}
              height={372}
              className="h-auto w-[178px] object-contain sm:w-[210px]"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-zinc-300 lg:flex">
            <Link href="#platform" className="transition-colors hover:text-[#eda900]">
              Platform
            </Link>
            <Link href="#solutions" className="transition-colors hover:text-[#eda900]">
              Solutions
            </Link>
            <Link href="#analytics" className="transition-colors hover:text-[#eda900]">
              Resources
            </Link>
            <Link href="#company" className="transition-colors hover:text-[#eda900]">
              Company
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <div className="[&>div]:gap-2 [&>div]:!text-white [&_a]:!h-10 [&_a]:!rounded-lg [&_a]:!px-4 [&_a]:!text-xs [&_a]:!font-black [&_a]:!uppercase [&_a]:!tracking-[0.08em] [&_a:first-child]:!border-[#eda900]/60 [&_a:first-child]:!bg-transparent [&_a:first-child]:!text-white [&_a:first-child:hover]:!border-[#eda900] [&_a:first-child:hover]:!bg-[#eda900] [&_a:first-child:hover]:!text-black [&_a:last-child]:!border-[#eda900] [&_a:last-child]:!bg-[#eda900] [&_a:last-child]:!text-black [&_a:last-child:hover]:!bg-[#ffc12b] [&_button]:!border-[#eda900]/60 [&_button]:!bg-transparent [&_button]:!text-white [&_button:hover]:!bg-[#eda900] [&_button:hover]:!text-black">
                <AuthButton signInLabel="Login" signUpLabel="Start free" />
              </div>
            )}
          </div>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid min-h-[760px] w-full max-w-[1440px] items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.83fr_1.17fr] lg:px-12 lg:py-24">
        <div className="relative z-10">
          <SectionLabel>Senior living growth platform</SectionLabel>
          <h1 className="max-w-3xl font-[Impact,'Arial_Narrow',sans-serif] text-[clamp(3.5rem,7vw,7.6rem)] uppercase leading-[0.9] tracking-[0.015em]">
            Digital info packet
            <span className="text-[#eda900]"> + kiosk lead generator system</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-300 sm:text-xl">
            Capture walk-in tours, share everything families need, and help prospects make faster
            move-in decisions.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/sign-up"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-md bg-[#eda900] px-7 text-sm font-black uppercase tracking-[0.08em] text-black transition-transform hover:-translate-y-0.5 hover:bg-[#ffc12b]"
            >
              <CalendarDays className="h-5 w-5" />
              Start building
            </Link>
            <Link
              href="#platform"
              className="inline-flex h-14 items-center justify-center gap-3 rounded-md border border-white/25 bg-white/[0.03] px-7 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:border-[#eda900]/65 hover:bg-[#eda900]/10"
            >
              <Play className="h-5 w-5" />
              Explore platform
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 text-sm text-zinc-400">
            {["No app required", "Built-in analytics", "Instant lead alerts"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#eda900]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[500px]">
          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#eda900]/10 blur-[110px]" />
          <TabletFrame
            src="/kiosk-templates/template-1.png"
            alt="CrownPages kiosk lead generation interface"
            className="relative z-10 ml-auto w-[94%] -rotate-1 lg:w-[82%]"
          />
          <div className="relative z-20 -mt-24 ml-auto mr-4 w-fit rotate-2 sm:-mt-44 lg:absolute lg:-bottom-14 lg:right-0 lg:mt-0">
            <PhoneMockup />
          </div>
        </div>
      </section>

      <section id="platform" className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-7 sm:px-8 lg:px-12">
        <div className="grid overflow-hidden rounded-[1.6rem] border border-[#eda900]/30 bg-[linear-gradient(145deg,#0e0e0e,#050505)] lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex min-h-[450px] items-center justify-center overflow-hidden p-5 sm:min-h-[610px] sm:p-6 lg:min-h-[660px] lg:p-7">
            <div className="grid w-full max-w-[780px] grid-cols-[0.98fr_1.08fr_0.98fr] items-center gap-2 sm:gap-3">
              <AppScreenshotPhone
                src="/marketing/crownpages-page-editor-screen-v2.jpg"
                alt="CrownPages mobile page editor showing Frasure Summit resources"
                className="-translate-y-2 -rotate-2 sm:-translate-y-4"
                imageClassName="object-contain object-center"
                showIsland={false}
              />
              <AppScreenshotPhone
                src="/marketing/frasuresummit-insurance-screen.jpg"
                alt="Accepted insurance information shared through CrownPages"
                className="translate-y-3"
                imageClassName="object-contain object-center"
                screenClassName="bg-black"
                showIsland={false}
              />
              <AppScreenshotPhone
                src="/marketing/frasuresummit-pricing-screen.jpg"
                alt="Frasure Summit pricing guide shared through CrownPages"
                className="-translate-y-1 rotate-2 sm:translate-y-2"
                imageClassName="object-contain object-center"
                screenClassName="bg-black"
                showIsland={false}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center border-t border-[#eda900]/20 p-8 sm:p-12 lg:border-l lg:border-t-0 lg:p-16">
            <SectionLabel>Share in seconds</SectionLabel>
            <h2 className="font-[Impact,'Arial_Narrow',sans-serif] text-5xl uppercase leading-[0.95] tracking-[0.02em] text-[#eda900] sm:text-6xl">
              Digital info packet
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Put the information families ask for most into one polished, mobile-friendly page
              that is always ready to share.
            </p>
            <BulletList items={featureItems} />
            <Link
              href="/auth/sign-up"
              className="mt-9 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[#eda900] hover:text-[#ffc12b]"
            >
              Build a digital packet
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
        <div className="grid overflow-hidden rounded-[1.6rem] border border-[#eda900]/30 bg-[#070707] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
            <SectionLabel>Designed for families</SectionLabel>
            <h2 className="font-[Impact,'Arial_Narrow',sans-serif] text-5xl uppercase leading-[0.95] tracking-[0.02em] text-[#eda900] sm:text-6xl">
              Easy to share. Easy to decide.
            </h2>
            <div className="mt-7 space-y-4 text-lg text-zinc-300">
              <p>Paper gets lost.</p>
              <p>Digital packets reduce printing costs.</p>
              <p>Families can share with everyone involved.</p>
              <p>Better information leads to quicker decisions.</p>
            </div>
          </div>
          <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden border-t border-[#eda900]/20 p-8 sm:min-h-[610px] lg:border-l lg:border-t-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(237,169,0,0.12),transparent_55%)]" />
            <div className="relative w-[220px] shrink-0 sm:w-[260px]">
              <AppScreenshotPhone
                src="/marketing/crownpages-photos-videos-screen.jpg"
                alt="CrownPages mobile page showing social media, photos, videos, and community information"
                className="-rotate-2"
                imageClassName="object-cover object-center"
                showIsland={false}
              />
            </div>
            <div className="relative ml-[-12px] hidden max-w-xs rounded-[1.6rem] rounded-bl-sm border border-white/15 bg-white px-6 py-5 text-lg font-black leading-6 text-black shadow-2xl sm:block">
              I can share everything with my family in one tap.
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
        <div className="grid items-center gap-10 overflow-hidden rounded-[1.6rem] border border-[#eda900]/30 bg-[linear-gradient(120deg,#090909,#030303)] p-6 sm:p-10 lg:grid-cols-[1.08fr_0.92fr] lg:p-14">
          <TabletFrame
            src="/kiosk-templates/template-1.png"
            alt="CrownPages kiosk welcome screen with QR code"
            className="-rotate-1"
          />
          <div className="lg:px-6">
            <SectionLabel>Always-on lead capture</SectionLabel>
            <h2 className="font-[Impact,'Arial_Narrow',sans-serif] text-5xl uppercase leading-[0.95] tracking-[0.02em] text-[#eda900] sm:text-6xl">
              Kiosk lead generator system
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Turn the front entrance into a reliable lead source with a guided experience that is
              easy for visitors and actionable for your sales team.
            </p>
            <BulletList items={kioskItems} />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 overflow-hidden rounded-[1.6rem] border border-[#eda900]/30 bg-[#070707] p-6 sm:p-10 lg:grid-cols-[1.12fr_0.88fr] lg:p-14">
          <div className="grid gap-5 sm:grid-cols-2">
            <TabletFrame
              src="/kiosk-templates/template-2.png"
              alt="CrownPages kiosk check-in and check-out interface"
              className="-rotate-1"
            />
            <TabletFrame
              src="/kiosk-templates/template-3.png"
              alt="CrownPages visitor identification interface"
              className="rotate-1"
            />
          </div>
          <div>
            <SectionLabel>Front desk operations</SectionLabel>
            <h2 className="font-[Impact,'Arial_Narrow',sans-serif] text-5xl uppercase leading-[0.95] tracking-[0.02em] text-[#eda900] sm:text-6xl">
              Kiosk operating system
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Make check-in and check-out simple while giving staff a consistent, secure record of
              visitors, residents, and vendors.
            </p>
            <BulletList items={operatingItems} />
          </div>
        </div>
      </section>

      <section id="analytics" className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
        <div className="grid items-center gap-12 overflow-hidden rounded-[1.6rem] border border-[#eda900]/30 bg-[linear-gradient(145deg,#0d0d0d,#040404)] p-6 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-14">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f5f5f4] text-zinc-900 shadow-[0_28px_70px_rgba(0,0,0,0.45)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.12em]">Visitor analytics</div>
                <div className="mt-1 text-[10px] text-zinc-500">Live engagement overview</div>
              </div>
              <div className="flex gap-2">
                {["Today", "7D", "30D"].map((label, index) => (
                  <span
                    key={label}
                    className={`rounded-md border px-3 py-1 text-[9px] font-black ${
                      index === 0 ? "border-[#eda900] bg-[#eda900] text-black" : "border-zinc-300"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-zinc-200">
              {[
                ["1,248", "Views"],
                ["84", "New leads"],
                ["32", "Tours"],
              ].map(([value, label]) => (
                <div key={label} className="bg-white p-4">
                  <div className="text-xl font-black sm:text-2xl">{value}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-zinc-500">{label}</div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto p-4">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[1.3fr_1fr_0.9fr_1fr] border-b border-zinc-200 px-3 py-2 text-[9px] font-black uppercase text-zinc-400">
                  <span>Name</span>
                  <span>Visitor type</span>
                  <span>Status</span>
                  <span>Source</span>
                </div>
                {analyticsRows.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[1.3fr_1fr_0.9fr_1fr] items-center border-b border-zinc-100 px-3 py-3 text-[10px]"
                  >
                    <span className="font-bold">{row.name}</span>
                    <span className="text-zinc-500">{row.type}</span>
                    <span className="w-fit rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">
                      {row.status}
                    </span>
                    <span className="text-zinc-500">{row.source}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <SectionLabel>Know what is working</SectionLabel>
            <h2 className="font-[Impact,'Arial_Narrow',sans-serif] text-5xl uppercase leading-[0.95] tracking-[0.02em] text-[#eda900] sm:text-6xl">
              Powerful analytics
            </h2>
            <BulletList
              items={[
                "See who is engaging with your content",
                "Receive instant lead and tour alerts",
                "View leads, contacts, and visitor activity",
                "Understand every step of the customer journey",
              ]}
            />
            <div className="mt-9 grid grid-cols-2 gap-3">
              {[
                [BarChart3, "Engagement"],
                [Users, "Contacts"],
                [QrCode, "QR activity"],
                [MonitorSmartphone, "Kiosk visits"],
              ].map(([Icon, label]) => {
                const IconComponent = Icon as typeof BarChart3;
                return (
                  <div
                    key={label as string}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm font-bold text-zinc-300"
                  >
                    <IconComponent className="h-5 w-5 text-[#eda900]" />
                    {label as string}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Smartphone, "Mobile first", "Build and manage pages from anywhere."],
            [Share2, "Made to share", "One link for every resource families need."],
            [LockKeyhole, "Secure access", "Protected tools and staff-only kiosk history."],
            [BarChart3, "Built-in insight", "See engagement without adding another platform."],
          ].map(([Icon, title, copy]) => {
            const IconComponent = Icon as typeof Smartphone;
            return (
              <div
                key={title as string}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition-colors hover:border-[#eda900]/40 hover:bg-[#eda900]/[0.035]"
              >
                <IconComponent className="h-7 w-7 text-[#eda900]" />
                <h3 className="mt-5 text-lg font-black uppercase tracking-[0.06em]">{title as string}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-[1.6rem] border border-[#eda900]/45 bg-[linear-gradient(120deg,#171006,#080808_55%,#030303)] p-8 sm:p-12 lg:p-16">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#eda900]/15 blur-[100px]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <SectionLabel>See CrownPages in action</SectionLabel>
              <h2 className="max-w-4xl font-[Impact,'Arial_Narrow',sans-serif] text-5xl uppercase leading-[0.95] tracking-[0.02em] sm:text-7xl">
                Give every prospect the information they need
                <span className="text-[#eda900]">—and your team every lead.</span>
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
                Start with a digital info packet, add the kiosk experience, and build a clearer path
                from first visit to move-in.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:min-w-[250px]">
              <Link
                href="/auth/sign-up"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-md bg-[#eda900] px-7 text-sm font-black uppercase tracking-[0.08em] text-black hover:bg-[#ffc12b]"
              >
                Start building
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-md border border-white/25 px-7 text-sm font-black uppercase tracking-[0.08em] text-white hover:border-[#eda900]/60 hover:bg-[#eda900]/10"
              >
                <UserRound className="h-5 w-5" />
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer id="company" className="relative z-10 mt-14 border-t border-white/10 bg-black">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] lg:px-12">
          <div>
            <Image
              src="/lightlogo.png"
              alt="CrownPages"
              width={2205}
              height={372}
              className="h-auto w-[190px] object-contain"
            />
            <p className="mt-5 max-w-md text-sm leading-6 text-zinc-500">
              Digital information, lead capture, and visitor operations built for modern senior
              living communities.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4 text-sm font-semibold text-zinc-400">
            <Link href="/protected/pages/new" className="hover:text-[#eda900]">
              Open builder
            </Link>
            <Link href="/privacy-policy" className="hover:text-[#eda900]">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="hover:text-[#eda900]">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-[#eda900]">
              Contact
            </Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} CrownPages. Pages made modern.
        </div>
      </footer>
    </main>
  );
}
