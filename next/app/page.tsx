import { existsSync } from "node:fs";
import path from "node:path";

import Image from "next/image";

import { SHELL, SiteFooter, SiteHeader, WhatsAppFloat } from "./chrome";
import { Icon, type IconName } from "./icons";
import { Reveal } from "./reveal";

const SERVICES: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Counselling",
    body: "Individual support for stress, anxiety and emotional wellbeing, at your pace.",
    icon: "counselling",
  },
  {
    title: "Family support",
    body: "Family interventions and mediation, working towards healthier relationships.",
    icon: "family",
  },
  {
    title: "Crisis support",
    body: "Trauma, bereavement and abuse support, when you need it most.",
    icon: "crisis",
  },
];

const REASONS: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Confidential",
    body: "Your privacy is protected. All sessions and information remain strictly confidential.",
    icon: "confidential",
  },
  {
    title: "Qualified",
    body: "UKZN Honours degree in Social Work with registered practice credentials.",
    icon: "qualified",
  },
  {
    title: "Compassionate",
    body: "A caring, non-judgmental approach that respects your unique journey.",
    icon: "compassionate",
  },
  {
    title: "Professional setting",
    body: "Located at Letada Medical Centre for your comfort and convenience.",
    icon: "place",
  },
  {
    title: "Virtual sessions",
    body: "Online counselling by video call for remote support from anywhere.",
    icon: "video",
  },
];

const AREAS = [
  "Stress and anxiety management",
  "HIV/AIDS support and guidance",
  "Family interventions and mediation",
  "Support for abuse and domestic violence",
  "Bereavement and loss counselling",
  "Marital and divorce-related support",
  "Professional social work assessments",
  "Trauma and crisis intervention",
  "Substance abuse counselling",
  "Virtual / online sessions",
  "Employee wellness programmes",
  "Spiritual guidance",
];

/* The hero footage is sunlight through leaves: average RGB around
   (150, 160, 115) and highlights blown out at luminance 253, so white copy
   is unreadable over it untouched. It used to sit under a flat
   rgba(12, 36, 54, 0.82) wash, which read as a blue haze over the greens.
   Darkening the video itself instead keeps its own colour — no tint, no
   milky overlay — and 0.42 puts even the brightest frame at 5.4:1 behind
   white text. AUDIT_BG below is that worst-case frame, measured. */
const HERO_FILTER = "brightness(0.42) saturate(1.2)";
const AUDIT_BG = "#6b6b6b";

/* Heading left, supporting copy right. The intro spans the full column
   width rather than stacking inside one narrow block with dead space beside it. */
function SectionIntro({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="reveal grid gap-x-16 gap-y-5 lg:grid-cols-12">
      <h2 className="rule text-3xl sm:text-4xl lg:col-span-5">{title}</h2>
      <p
        className="max-w-2xl text-lg lg:col-span-6 lg:col-start-7"
        style={{ color: "var(--text-soft)" }}
      >
        {children}
      </p>
    </div>
  );
}

/* Checked on the server, so no <video> is emitted until footage exists —
   otherwise both sources 404 and log console errors on every visit.
   Evaluated per render rather than once at module load, so dropping a file
   into public/video takes effect without restarting the server. */
function heroSources() {
  return ["hero.webm", "hero.mp4"].filter((f) =>
    existsSync(path.join(process.cwd(), "public", "video", f)),
  );
}

export default function HomePage() {
  const VIDEO = heroSources();

  return (
    <>
      <Reveal />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:font-semibold"
        style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        {/* ------------------------------------------------------------ hero */}
        {/* Centred, stacked headline with a question beneath it — the moc-pty
            hero composition, rather than the left-weighted one it replaced. */}
        <section className="relative isolate overflow-hidden">
          {VIDEO.length > 0 && (
            <video
              className="hero-video absolute inset-0 -z-10 h-full w-full object-cover"
              style={{ filter: HERO_FILTER }}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
            >
              {VIDEO.map((file) => (
                <source
                  key={file}
                  src={`/video/${file}`}
                  type={file.endsWith(".webm") ? "video/webm" : "video/mp4"}
                />
              ))}
            </video>
          )}

          <Image
            src="/images/hero-bg.png"
            alt=""
            fill
            priority
            aria-hidden="true"
            className="-z-20 object-cover"
            style={{ filter: HERO_FILTER }}
          />

          <div className={`${SHELL} py-28 text-center sm:py-40`}>
            <div className="mx-auto max-w-4xl reveal" data-audit-bg={AUDIT_BG}>
              <h1 className="text-[2.6rem] leading-[1.06] text-white sm:text-[4.25rem]">
                Professional
                <span className="block">social work services</span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-lg text-white/90">
                Compassionate support for individuals and families through life&rsquo;s
                challenges. A safe, confidential space for healing and growth.
              </p>
              <p className="mt-10 text-xl text-white sm:text-2xl">
                What are you carrying at the moment?
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <a
                  href="/book"
                  className="rounded-full px-8 py-4 text-[0.95rem] font-semibold"
                  style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
                >
                  Book a consultation
                </a>
                <a
                  href="#services"
                  className="rounded-full border-2 border-white/70 px-8 py-4 text-[0.95rem] font-semibold text-white transition-colors hover:bg-white hover:text-[#15608f]"
                >
                  View services
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- quick facts */}
        {/* Directly under the hero on purpose: someone in crisis should not
            have to scroll 3,000px to find a phone number. */}
        <section className="border-b" style={{ background: "var(--bg-soft)" }}>
          <div className={`${SHELL} grid gap-x-16 gap-y-7 py-9 sm:grid-cols-3`}>
            <a href="tel:+27641533469" className="group flex flex-col">
              <span
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--text-soft)" }}
              >
                Phone
              </span>
              <span className="mt-2 text-lg font-semibold transition-colors group-hover:text-[var(--brand)]">
                064 153 3469
              </span>
            </a>
            <div className="flex flex-col sm:border-l sm:pl-10">
              <span
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--text-soft)" }}
              >
                Where
              </span>
              <span className="mt-2 text-lg">Letada Medical Centre, Kraaifontein</span>
            </div>
            <div className="flex flex-col sm:border-l sm:pl-10">
              <span
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--text-soft)" }}
              >
                Hours
              </span>
              <span className="mt-2 text-lg">Mon&ndash;Fri, 08:00 &ndash; 17:00</span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- services */}
        <section id="services" className="scroll-mt-28 py-24 sm:py-32">
          <div className={SHELL}>
            <SectionIntro title="How I can help you">
              Professional social work services to help you navigate difficult times with
              compassion, understanding and expertise.
            </SectionIntro>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((service, i) => (
                <article
                  key={service.title}
                  className="reveal rounded-lg border p-10 text-center"
                  style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
                >
                  <span
                    className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: "var(--tint)", color: "var(--brand-dark)" }}
                  >
                    <Icon name={service.icon} />
                  </span>
                  <h3 className="text-xl">{service.title}</h3>
                  <p className="mx-auto mt-3 max-w-xs" style={{ color: "var(--text-soft)" }}>
                    {service.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ why choose */}
        {/* Centred heading over an icon grid — the "Why Us" pattern. Five items
            use flex-wrap centred, so the last row reads as deliberate rather
            than as an orphaned cell in a rigid 3-column grid. */}
        <section
          id="why"
          className="scroll-mt-28 border-y py-24 sm:py-32"
          style={{ background: "var(--bg-soft)" }}
        >
          <div className={SHELL}>
            <div className="mx-auto max-w-2xl text-center reveal">
              <h2 className="text-3xl sm:text-4xl">Why choose me</h2>
              <p className="mt-5 text-lg" style={{ color: "var(--text-soft)" }}>
                Professional qualifications and a safe, supportive environment for your
                healing journey.
              </p>
            </div>

            <div className="mt-20 flex flex-wrap justify-center gap-x-16 gap-y-16">
              {REASONS.map((reason, i) => (
                <div
                  key={reason.title}
                  className="reveal w-full max-w-xs text-center sm:w-[calc(50%-2rem)] lg:w-[calc(33.333%-2.7rem)]"
                  style={{ "--d": `${i * 70}ms` } as React.CSSProperties}
                >
                  <span
                    className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: "var(--tint)", color: "var(--brand-dark)" }}
                  >
                    <Icon name={reason.icon} />
                  </span>
                  <h3 className="text-lg">{reason.title}</h3>
                  <p className="mx-auto mt-2.5 max-w-xs" style={{ color: "var(--text-soft)" }}>
                    {reason.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- areas */}
        <section className="py-24 sm:py-32">
          <div className={SHELL}>
            <SectionIntro title={<>Supporting you through life&rsquo;s challenges</>}>
              Whether you are dealing with personal struggles, family difficulties or life
              transitions, professional support can make a meaningful difference. I provide
              evidence-based interventions tailored to your needs.
            </SectionIntro>

            <ul className="mt-16 grid list-none gap-x-16 sm:grid-cols-2 lg:grid-cols-3">
              {AREAS.map((area, i) => (
                <li
                  key={area}
                  className="reveal flex gap-4 border-b py-4"
                  style={{ "--d": `${Math.min(i * 40, 320)}ms` } as React.CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: "var(--green-dark)" }}
                  />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------- testimonial */}
        <section className="border-y py-24" style={{ background: "var(--bg-soft)" }}>
          <div className={`${SHELL} max-w-4xl text-center reveal`}>
            {/* Circular crop. The studio shot sits on a white ground, which as a
                rectangle would read as a white slab against the dark theme. */}
            <Image
              src="/images/phakama.png"
              alt="Phakama Ndamase"
              width={432}
              height={432}
              className="mx-auto mb-8 h-24 w-24 rounded-full object-cover object-top ring-4 ring-[color:var(--tint)]"
              style={{ background: "#ffffff" }}
            />
            <blockquote className="text-xl leading-relaxed sm:text-[1.6rem] sm:leading-[1.5]">
              &ldquo;Taking the first step towards healing takes courage. I&rsquo;m here to
              walk alongside you on your journey to wellbeing.&rdquo;
            </blockquote>
            <p className="mt-6 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                Phakama Ndamase
              </span>
              {" — "}Registered social worker
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------------- about */}
        {/* Three columns across the full width: portrait, story, practice
            details — rather than one narrow column with whitespace beside it. */}
        <section id="about" className="scroll-mt-28 py-24 sm:py-32">
          <div className={`${SHELL} grid items-start gap-x-16 gap-y-12 lg:grid-cols-12`}>
            <div className="reveal lg:col-span-3">
              <Image
                src="/images/phakama.png"
                alt="Phakama Ndamase, registered social worker"
                width={432}
                height={577}
                className="aspect-square w-full max-w-[260px] rounded-full object-cover object-top ring-4 ring-[color:var(--tint)]"
                style={{ background: "#ffffff" }}
              />
              <p className="mt-5 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                <span className="font-semibold" style={{ color: "var(--text)" }}>
                  Phakama Ndamase
                </span>
                <br />
                Registered social worker
              </p>
            </div>

            <div className="reveal lg:col-span-5" style={{ "--d": "80ms" } as React.CSSProperties}>
              <h2 className="rule text-3xl sm:text-4xl">About Mimschak Wellness</h2>
              <p className="mt-6 text-lg" style={{ color: "var(--text-soft)" }}>
                Mimschak Wellness is the private practice of Phakama Ndamase, a registered
                social worker holding an Honours degree in Social Work from the University
                of KwaZulu-Natal.
              </p>
              <p className="mt-5 text-lg" style={{ color: "var(--text-soft)" }}>
                The practice offers counselling, trauma and crisis intervention, family
                mediation and employee wellness support — in person at Letada Medical
                Centre in Windsor Park, Kraaifontein, or online by video call.
              </p>
            </div>

            <dl
              className="reveal grid gap-7 self-start rounded-lg border p-8 lg:col-span-4"
              style={{ background: "var(--surface)", "--d": "160ms" } as React.CSSProperties}
            >
              <div>
                <dt
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-soft)" }}
                >
                  Where
                </dt>
                <dd className="mt-2">
                  Letada Medical Centre
                  <br />
                  Windsor Park, Kraaifontein
                  <br />
                  Cape Town, 7530
                </dd>
              </div>
              <div>
                <dt
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-soft)" }}
                >
                  Hours
                </dt>
                <dd className="mt-2">Monday to Friday, 08:00 &ndash; 17:00</dd>
              </div>
              <div>
                <dt
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-soft)" }}
                >
                  Fees
                </dt>
                <dd className="mt-2">R250 &ndash; R1 250 depending on the service</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* --------------------------------------------------------- contact */}
        <section
          id="contact"
          className="scroll-mt-28 border-t py-28"
          style={{ background: "var(--bg-soft)" }}
        >
          <div className={`${SHELL} max-w-3xl text-center reveal`}>
            <h2 className="text-3xl sm:text-5xl">Ready to take the first step?</h2>
            <p className="mx-auto mt-6 max-w-xl text-lg" style={{ color: "var(--text-soft)" }}>
              Reach out to arrange a consultation. Sessions are available in person in
              Kraaifontein or online, wherever you are.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="tel:+27641533469"
                className="rounded-full px-8 py-4 text-[0.95rem] font-semibold"
                style={{ background: "var(--btn-bg)", color: "var(--btn-ink)" }}
              >
                064 153 3469
              </a>
              <a
                href="mailto:phakamandamase@gmail.com"
                className="rounded-full border px-8 py-4 text-[0.95rem] font-semibold"
                style={{ borderColor: "var(--line)", color: "var(--text)" }}
              >
                Email the practice
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat />
    </>
  );
}
