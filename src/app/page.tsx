import styles from "./page.module.css";

const services = [
  {
    title: "Investment Services",
    description:
      "Strategic investment support for clients who need disciplined market insight, structured planning, and long-term value creation.",
  },
  {
    title: "Marketing & Trading",
    description:
      "Commercial marketing support paired with practical trading experience to help financial products reach the right audience with confidence.",
  },
  {
    title: "Fund Management",
    description:
      "We help manage funds with a focus on governance, transparency, portfolio direction, and informed capital allocation.",
  },
  {
    title: "Trading Software Solutions",
    description:
      "Custom software for trading platforms, internal dashboards, reporting flows, broker operations, and performance visibility.",
  },
  {
    title: "Currency Plugins",
    description:
      "Flexible plugins that extend trading systems with currency tools, pricing utilities, multi-pair workflows, and live operational add-ons.",
  },
  {
    title: "Reports & Analytics Plugins",
    description:
      "Reporting plugins built for performance summaries, operational reporting, management insights, and decision-ready financial views.",
  },
];

const highlights = [
  "Investment advisory support",
  "Trading and market operations",
  "Fund oversight and reporting",
  "Platform software development",
  "Currency and report plugins",
  "Clean, scalable client delivery",
];

const platformItems = [
  "Portfolio dashboards",
  "Trade reporting modules",
  "Currency conversion tools",
  "Manager review screens",
  "Client-facing analytics",
  "Plugin-ready architecture",
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBackground} />

        <header className={styles.navbar}>
          <a className={styles.logo} href="#top" aria-label="Moneyplant HK Ltd home">
            <span className={styles.logoWord}>Moneyplant</span>
            <span className={styles.logoMark}>HK</span>
          </a>

          <nav className={styles.navLinks} aria-label="Primary">
            <a href="#services">Services</a>
            <a href="#solutions">Solutions</a>
            <a href="#about">About</a>
            <a href="#contact" className={styles.navButton}>
              Contact
            </a>
          </nav>
        </header>

        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Moneyplant HK Ltd</p>
            <h1>
              Investment, trading, fund management, and software solutions in one
              modern platform business.
            </h1>
            <p className={styles.lead}>
              We provide investment services, marketing and trading support,
              manage funds, and create software solutions for trading platforms,
              including plugins for currency workflows and reports.
            </p>

            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#contact">
                Talk to Us
              </a>
              <a className={styles.secondaryButton} href="#services">
                Explore Services
              </a>
            </div>

            <ul className={styles.highlightList}>
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <aside className={styles.heroCard}>
            <p className={styles.cardLabel}>Company Focus</p>
            <h2>Built for clients who need finance expertise and delivery speed.</h2>

            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <strong>Investment</strong>
                <span>Structured financial services</span>
              </div>
              <div className={styles.metricCard}>
                <strong>Trading</strong>
                <span>Market-led execution thinking</span>
              </div>
              <div className={styles.metricCard}>
                <strong>Funds</strong>
                <span>Portfolio and reporting discipline</span>
              </div>
              <div className={styles.metricCard}>
                <strong>Software</strong>
                <span>Trading platform extensions</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section} id="services">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Services</p>
          <h2>Core services designed around financial operations and platform growth.</h2>
          <p>
            Moneyplant HK Ltd combines advisory, operational, and technical
            capabilities so clients can work with one team across finance,
            execution, and product delivery.
          </p>
        </div>

        <div className={styles.serviceGrid}>
          {services.map((service) => (
            <article className={styles.serviceCard} key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.solutionsSection}`} id="solutions">
        <div className={styles.splitLayout}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Software Solutions</p>
            <h2>Practical systems for trading platforms, reporting, and plugin delivery.</h2>
            <p>
              We build clean software experiences for teams that need trading
              tools, operational visibility, and extensible platform components
              without unnecessary complexity.
            </p>
          </div>

          <div className={styles.solutionPanel}>
            {platformItems.map((item) => (
              <div className={styles.solutionItem} key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="about">
        <div className={styles.aboutCard}>
          <div>
            <p className={styles.eyebrow}>About Us</p>
            <h2>A bright, professional brand built around trust, clarity, and measurable delivery.</h2>
          </div>
          <p>
            Our work spans investment services, marketing, trading support, fund
            management, and software development for trading environments. We aim
            to deliver reliable business value through clear communication,
            practical execution, and solutions that are easy for clients to use
            and grow.
          </p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.contactSection}`} id="contact">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Contact</p>
          <h2>Let&apos;s discuss your investment, trading, or platform project.</h2>
          <p>
            We support companies looking for financial services, fund management,
            platform software, and plugins for currency and reporting workflows.
          </p>
        </div>

        <div className={styles.contactCard}>
          <div>
            <span className={styles.contactLabel}>Company</span>
            <p>Moneyplant HK Ltd</p>
          </div>
          <div>
            <span className={styles.contactLabel}>Services</span>
            <p>Investment services, trading, fund management, software solutions</p>
          </div>
          <div>
            <span className={styles.contactLabel}>Specialty</span>
            <p>Trading platform software, currency plugins, reports plugins</p>
          </div>
          <a className={styles.primaryButton} href="mailto:info@moneyplant.hk">
            info@moneyplant.hk
          </a>
        </div>
      </section>
    </main>
  );
}
