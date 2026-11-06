import type { Metadata } from "next";

import { SHELL, SiteFooter, SiteHeader, WhatsAppFloat } from "../chrome";
import { Icon, type IconName } from "../icons";

export const metadata: Metadata = {
  title: "Corporate Wellness and Employee Assistance | Mimshack Wellness",
  description:
    "Confidential counselling, trauma and critical incident support, wellness workshops and manager support for businesses, NGOs, schools and other employers in Cape Town.",
};

const SERVICES: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Employee counselling and psychosocial support",
    body: "Confidential one-to-one counselling for workplace stress, burnout, grief, family and relationship difficulties, and other personal concerns.",
    icon: "counselling",
  },
  {
    title: "Workplace trauma and critical incident support",
    body: "Support after workplace accidents, traumatic events, the death of a colleague and other distressing incidents.",
    icon: "crisis",
  },
  {
    title: "Employee wellness workshops",
    body: "Interactive workshops on emotional wellbeing, stress management, resilience, communication, healthy workplace relationships and self-care.",
    icon: "family",
  },
  {
    title: "Management and leadership support",
    body: "Guidance for managers on responding well to employees who are struggling, and on building a psychologically supportive workplace.",
    icon: "qualified",
  },
];

const PACKAGE = [
  "Individual counselling sessions for employees",
  "Group wellness workshops",
  "Trauma and bereavement support",
  "Consultations for managers",
  "Employee wellness education",
  "Anonymised wellness reporting for the organisation",
];

const WHY = [
  "Professional social work expertise",
  "A compassionate, confidential approach",
  "Support tailored to your organisation",
  "Flexible delivery: online, or face to face depending on location and scheduling",
];

/** Corporate wellness and employee assistance, for employers. */
export default function CorporateWellnessPage() {
  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* ------------------------------------------------------------ intro */}
        <section className="band-navy py-16 sm:py-20">
          <div className={SHELL}>
            <p className="eyebrow-leaf text-xs font-semibold uppercase tracking-[0.22em]">For employers</p>
            <h1 className="mt-3 max-w-3xl text-3xl sm:text-[2.8rem] sm:leading-tight">
              Corporate Wellness and Employee Assistance
            </h1>
            <p className="band-soft mt-4 text-xl italic">Invest in your people. Strengthen your organisation.</p>
            <div className="band-soft mt-6 grid max-w-3xl gap-4 text-lg">
              <p>
                Your employees are the foundation of your organisation. Personal challenges, workplace stress,
                grief, trauma and emotional difficulties affect their wellbeing, their relationships and their work.
              </p>
              <p>
                Mimshack Wellness partners with businesses, NGOs, healthcare organisations, schools and other
                employers to give their people professional, confidential and accessible psychosocial support.
              </p>
            </div>
            <a
              href="#partner"
              className="mt-8 inline-block rounded-full px-7 py-3.5 font-semibold"
              style={{ background: "#ffffff", color: "var(--navy)" }}
            >
              Arrange a consultation
            </a>
          </div>
        </section>

        {/* --------------------------------------------------------- services */}
        <section className="py-20 sm:py-24" style={{ background: "var(--tint)" }}>
          <div className={SHELL}>
            <h2 className="text-3xl sm:text-4xl">Our services</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <article key={s.title} className="card-lift rounded-xl p-8">
                  <span className="icon-badge h-12 w-12">
                    <Icon name={s.icon} />
                  </span>
                  <h3 className="mt-5 text-xl">{s.title}</h3>
                  <p className="mt-2.5" style={{ color: "var(--text-soft)" }}>
                    {s.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- packages */}
        <section className="band-mint py-20 sm:py-24">
          <div className={`${SHELL} grid gap-12 lg:grid-cols-2`}>
            <div>
              <h2 className="text-3xl sm:text-4xl">Monthly wellness packages</h2>
              <p className="mt-5 text-lg" style={{ color: "var(--text-soft)" }}>
                We offer monthly employee wellness packages, shaped around your organisation&rsquo;s needs and
                budget. Whether you have a small team or a large workforce, we will put together a package that
                fits.
              </p>
            </div>
            <div className="card-lift rounded-xl p-8">
              <p className="font-semibold" style={{ color: "var(--heading)" }}>
                A package can include:
              </p>
              <ul className="mt-4 grid list-none gap-3">
                {PACKAGE.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="mt-0.5 font-bold" style={{ color: "var(--green-dark)" }}>
                      &#10003;
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- why */}
        <section className="py-20 sm:py-24">
          <div className={SHELL}>
            <h2 className="text-3xl sm:text-4xl">Why partner with Mimshack Wellness</h2>
            <ul className="mt-8 grid list-none gap-4 sm:grid-cols-2">
              {WHY.map((item) => (
                <li key={item} className="flex gap-3 rounded-lg border p-5" style={{ background: "var(--surface)" }}>
                  <span aria-hidden="true" className="font-bold" style={{ color: "var(--green-dark)" }}>
                    &#10003;
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------------------------------------- partner */}
        <section id="partner" className="band-navy scroll-mt-28 py-20 sm:py-24">
          <div className={`${SHELL} max-w-3xl text-center`}>
            <h2 className="text-3xl sm:text-4xl">Partner with us</h2>
            <p className="band-soft mx-auto mt-5 max-w-2xl text-xl italic">
              Your employees deserve support. Your organisation deserves a wellness partner who understands people.
            </p>
            <p className="band-soft mx-auto mt-5 max-w-2xl text-lg">
              Contact us to arrange a consultation and receive a proposal tailored to your organisation.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="mailto:phakama.ndamase@mimschakwellness.com?subject=Corporate%20wellness%20enquiry"
                className="rounded-full px-7 py-3.5 font-semibold"
                style={{ background: "#ffffff", color: "var(--navy)" }}
              >
                phakama.ndamase@mimschakwellness.com
              </a>
              <a
                href="tel:+27641533469"
                className="rounded-full border px-7 py-3.5 font-semibold text-white"
                style={{ borderColor: "rgb(255 255 255 / 0.5)" }}
              >
                Corporate enquiries: 064 153 3469
              </a>
            </div>
            <p className="band-soft mt-8 text-[0.95rem] italic">
              Confidentiality and professional ethics are at the heart of everything we do.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
      <WhatsAppFloat message="Hi Mimshack Wellness, I would like to find out about corporate wellness for our organisation. " />
    </>
  );
}
