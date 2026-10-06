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

/* Phakama's biography, as she supplied it. Kept as data so the wording can be
   edited without touching the layout below. */
const BIO_BEFORE_LIST = [
  "Phakama Ndamase is a qualified and experienced social worker whose career is grounded in compassion, professionalism, and a deep commitment to improving the well-being of individuals, families, and communities.",
  "She began her professional journey in 2007 at the Pietermaritzburg Child and Youth Care Centre. In this role, she supported and managed Child Care Workers through counselling, performance management, and rehabilitative interventions. She also facilitated group programmes for children experiencing challenges such as substance abuse, low self-esteem, bereavement, academic difficulties, teenage pregnancy, and the need for age-appropriate sexual health education.",
  "Later in 2007, Phakama joined the Child and Family Welfare Society of Pietermaritzburg, where she worked until 2013. She gained extensive experience in statutory social work and family reunification services. Her responsibilities included attending court proceedings, managing child-protection cases, and counselling parents experiencing parenting difficulties, abusive behavioural patterns, and other family-related challenges.",
  "This work exposed her to some of South Africa’s most complex social challenges, including poverty, HIV/AIDS, sexual and physical abuse, neglect, substance abuse, and family breakdown. These experiences strengthened her understanding of community needs and shaped her compassionate, person-centred approach to social work.",
  "In 2013, Phakama established her private practice and began working with ICAS, an employee wellness organisation serving government departments and the corporate sector. Through this partnership, she has supported employees experiencing workplace and personal challenges, including:",
];

const ICAS_SUPPORT = [
  "Workplace conflict and employee–manager relationship difficulties",
  "Stress, anxiety, and poor work performance",
  "Family and marital difficulties",
  "Grief and bereavement",
  "Substance abuse",
  "Financial challenges",
  "HIV/AIDS, cancer, and other chronic illnesses",
  "Trauma following robberies, accidents, workplace incidents, and employee deaths",
];

const BIO_AFTER_LIST = [
  "Phakama provides individual counselling, group interventions, workplace wellness presentations, trauma support, and critical-incident debriefing. Her interventions help individuals regain emotional stability, strengthen coping skills, and improve their functioning in their personal and professional lives.",
  "Since 2014, she has also provided hospital-based social work services at Medical Towers Hospital in Isipingo, Durban. Doctors refer patients to her for psychosocial support relating to stress, substance abuse, relationship difficulties, financial concerns, chronic illness, and child-welfare matters.",
  "Her corporate wellness experience includes providing counselling and wellness services to employees at organisations such as Unilever and Tongaat Hulett. She has also facilitated wellness talks and debriefing sessions following traumatic workplace events.",
  "In addition to her clinical and workplace experience, Phakama serves as a social work supervisor at the University of South Africa. She has had the privilege of mentoring second-, third-, and fourth-year social work students through workshops and small-group supervision. This role enables her to share her practical experience while helping to develop confident, ethical, and compassionate future professionals.",
  "Phakama is passionate about providing accessible support through face-to-face and telephonic counselling. She believes in creating a safe, respectful, and non-judgemental space where individuals can express themselves, develop healthy coping strategies, and work towards meaningful change.",
  "For Phakama, social work is more than a profession—it is a calling. Her purpose is to serve, empower, and uplift others while supporting their emotional, social, family, and workplace well-being.",
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
        <section className="border-b" style={{ background: "var(--tint)" }}>
          <div className={`${SHELL} grid gap-x-16 gap-y-7 py-9 sm:grid-cols-3`}>
            <a href="tel:+27641533469" className="group flex flex-col">
              <span
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--green-dark)" }}
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
                style={{ color: "var(--green-dark)" }}
              >
                Where
              </span>
              <span className="mt-2 text-lg">Letada Medical Centre, Kraaifontein</span>
            </div>
            <div className="flex flex-col sm:border-l sm:pl-10">
              <span
                className="text-xs font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--green-dark)" }}
              >
                Hours
              </span>
              <span className="mt-2 text-lg">Mon&ndash;Fri, 08:00 &ndash; 17:00</span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- services */}
        <section id="services" className="scroll-mt-28 py-24 sm:py-32" style={{ background: "var(--tint)" }}>
          <div className={SHELL}>
            <SectionIntro title="How I can help you">
              Professional social work services to help you navigate difficult times with
              compassion, understanding and expertise.
            </SectionIntro>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((service, i) => (
                <article
                  key={service.title}
                  className="reveal card-lift relative overflow-hidden rounded-xl p-10 text-center"
                  style={{ "--d": `${i * 80}ms` } as React.CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className="absolute right-5 top-3 text-4xl font-semibold"
                    style={{ fontFamily: "var(--font-display), Georgia, serif", color: "rgb(26 117 173 / 0.14)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="icon-badge mx-auto mb-5 h-14 w-14">
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
        <section id="why" className="band-navy scroll-mt-28 py-24 sm:py-32">
          <div className={SHELL}>
            <div className="mx-auto max-w-2xl text-center reveal">
              <p className="eyebrow-leaf text-xs font-semibold uppercase tracking-[0.22em]">
                Why Mimshack Wellness
              </p>
              <h2 className="mt-3 text-3xl sm:text-4xl">Why choose me</h2>
              <p className="band-soft mt-5 text-lg">
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
                  <span className="icon-badge mx-auto mb-5 h-14 w-14">
                    <Icon name={reason.icon} />
                  </span>
                  <h3 className="text-lg">{reason.title}</h3>
                  <p className="band-soft mx-auto mt-2.5 max-w-xs">
                    {reason.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- areas */}
        <section className="band-mint py-24 sm:py-32">
          <div className={SHELL}>
            <SectionIntro title={<>Supporting you through life&rsquo;s challenges</>}>
              Whether you are dealing with personal struggles, family difficulties or life
              transitions, professional support can make a meaningful difference. I provide
              evidence-based interventions tailored to your needs.
            </SectionIntro>

            <ul className="mt-14 flex list-none flex-wrap gap-3">
              {AREAS.map((area, i) => (
                <li
                  key={area}
                  className="reveal chip-mint"
                  style={{ "--d": `${Math.min(i * 40, 320)}ms` } as React.CSSProperties}
                >
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------- testimonial */}
        <section className="py-24" style={{ background: "var(--tint)" }}>
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
            <span
              aria-hidden="true"
              className="block text-7xl leading-none"
              style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--green-dark)" }}
            >
              &ldquo;
            </span>
            <blockquote
              className="mt-2 text-xl leading-relaxed sm:text-[1.7rem] sm:leading-[1.45]"
              style={{ fontFamily: "var(--font-display), Georgia, serif", color: "var(--heading)" }}
            >
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
        {/* Portrait sidebar beside the story. The biography runs long, so on
            large screens the portrait stays in view as it scrolls past rather
            than leaving an empty column beside the text. The sticky offset
            clears the sticky site header. On phones it all stacks. */}
        <section id="about" className="scroll-mt-28 py-24 sm:py-32">
          <div className={`${SHELL} grid items-start gap-x-16 gap-y-12 lg:grid-cols-12`}>
            <aside className="reveal lg:sticky lg:top-28 lg:col-span-3">
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
            </aside>

            <div className="grid gap-x-16 gap-y-12 lg:col-span-9 lg:grid-cols-9">
              <div className="reveal lg:col-span-5" style={{ "--d": "80ms" } as React.CSSProperties}>
                <h2 className="rule text-3xl sm:text-4xl">About Mimshak Wellness</h2>
                <p className="mt-6 text-lg" style={{ color: "var(--text-soft)" }}>
                  Mimshak Wellness is the private practice of Phakama Ndamase, a registered
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
                className="reveal on-navy grid gap-7 self-start rounded-xl p-8 lg:col-span-4"
                style={{ "--d": "160ms" } as React.CSSProperties}
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

              {/* Full biography. Prose is held to a readable measure; the
                  bullet list may run a little wider since its lines are short. */}
              <article
                aria-labelledby="bio-heading"
                className="reveal border-t pt-14 lg:col-span-9"
              >
                <h2 id="bio-heading" className="rule text-3xl sm:text-4xl">
                  About Phakama Ndamase
                </h2>
                <div className="max-w-[46rem]">
                  {BIO_BEFORE_LIST.map((para, i) => (
                    <p
                      key={para}
                      className={`${i === 0 ? "mt-6" : "mt-5"} text-lg`}
                      style={{ color: "var(--text-soft)" }}
                    >
                      {para}
                    </p>
                  ))}

                  <ul className="mt-6 grid list-none gap-x-10 sm:grid-cols-2">
                    {ICAS_SUPPORT.map((item) => (
                      <li key={item} className="flex gap-4 border-b py-3">
                        <span
                          aria-hidden="true"
                          className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: "var(--green-dark)" }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {BIO_AFTER_LIST.map((para, i) => (
                    <p
                      key={para}
                      className={`${i === 0 ? "mt-8" : "mt-5"} text-lg`}
                      style={{ color: "var(--text-soft)" }}
                    >
                      {para}
                    </p>
                  ))}

                  <p className="mt-10 text-[0.95rem]" style={{ color: "var(--text-soft)" }}>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>
                      Phakama Ndamase
                    </span>
                    <br />
                    Social Worker
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- contact */}
        <section id="contact" className="band-navy scroll-mt-28 py-28">
          <div className={`${SHELL} max-w-3xl text-center reveal`}>
            <p className="eyebrow-leaf text-xs font-semibold uppercase tracking-[0.22em]">
              Take the first step
            </p>
            <h2 className="mt-3 text-3xl sm:text-5xl">Ready to take the first step?</h2>
            <p className="band-soft mx-auto mt-6 max-w-xl text-lg">
              Reach out to arrange a consultation. Sessions are available in person in
              Kraaifontein or online, wherever you are.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="tel:+27641533469"
                className="rounded-full px-8 py-4 text-[0.95rem] font-semibold"
                style={{ background: "#ffffff", color: "var(--navy)" }}
              >
                064 153 3469
              </a>
              <a
                href="mailto:phakamandamase@gmail.com"
                className="rounded-full border px-8 py-4 text-[0.95rem] font-semibold text-white"
                style={{ borderColor: "rgb(255 255 255 / 0.5)" }}
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
