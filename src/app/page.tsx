import type { CSSProperties } from "react";
import ContactForm from "@/components/ContactForm";
import SignalSubscription from "@/components/SignalSubscription";
import StockPredictionAssistant from "@/components/StockPredictionAssistant";
import styles from "./page.module.css";

const whatsappMessage =
  "Hello HFTX AI, I want to discuss a trading, AI, or software project.";
const whatsappNumber = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+447916699193"
).replace(/\D/g, "");
const whatsappHref = whatsappNumber
  ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
  : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

const capabilities = [
  "AI-powered trading applications",
  "News-driven algorithmic strategies",
  "Prop firm operations and trading infrastructure",
  "White-label trading software solutions",
  "Market data, analytics, and risk support",
  "Marketing, web design, and developer staffing",
];

const serviceCards = [
  {
    title: "Trading Intelligence",
    description:
      "We build trading platforms and algorithmic engines that turn live news, market context, and AI signals into faster decisions.",
  },
  {
    title: "Trading Software Solutions",
    description:
      "From broker tools to white-label platforms, market data pipelines, and custom dashboards, we create software around serious trading workflows.",
  },
  {
    title: "Growth Services",
    description:
      "HFTX AI also supports brands with marketing, web design, electronics integration, and software developers for high-impact delivery teams.",
  },
];

const metrics = [
  { value: "AI + News", label: "Signals fused into trading logic" },
  { value: "Global", label: "Built for worldwide trading operations" },
  { value: "24/7", label: "Support mindset for trading operations" },
  { value: "Multi-Service", label: "Trading, design, tech, and growth" },
];

const pillars = [
  {
    title: "High-Frequency Thinking",
    text: "Architecture designed for responsive data flow, real-time monitoring, and execution-ready systems.",
  },
  {
    title: "AI-Native Analysis",
    text: "We combine machine intelligence with news interpretation, market analysis, and risk-focused automation.",
  },
  {
    title: "Growth Mindset Delivery",
    text: "Every product is built to scale, adapt, and help clients move from idea to market advantage faster.",
  },
];

const tickerItems = [
  "NQ +1.84%",
  "BTC +3.12%",
  "XAU -0.44%",
  "NEWS SIGNAL: FED / CPI / EARNINGS",
  "RISK ENGINE ONLINE",
  "PROP DESK READY",
  "MARKET DATA STREAMING",
];

const motionFrames = [
  {
    title: "Sentiment Stack",
    tag: "News + X",
    description:
      "A practical summary of headline pressure, social momentum, and event bias so traders can see why a signal is strengthening or weakening.",
    type: "sentiment",
    points: ["Macro news", "Social sentiment", "Event bias"],
    values: ["Bullish 68%", "Neutral 21%", "Bearish 11%"],
  },
  {
    title: "Execution Ladder",
    tag: "Trade Planning",
    description:
      "A useful execution block showing entry structure, risk laddering, and staged profit-taking instead of decorative motion only.",
    type: "execution",
    points: ["Entry", "Stop loss", "Targets"],
    values: ["1924.4", "1918.2", "1931.8 / 1936.6"],
  },
  {
    title: "Risk Monitor",
    tag: "Exposure",
    description:
      "A quick risk panel for volatility, exposure status, and drawdown pressure so the user immediately understands whether conditions are clean or dangerous.",
    type: "risk",
    points: ["Volatility", "Exposure", "Drawdown"],
    values: ["Medium", "42%", "Controlled"],
  },
];

const chartCards = [
  {
    title: "Candlestick View",
    label: "Price Action",
    description:
      "A terminal-style chart surface for execution, momentum, and intraday direction.",
    type: "candles",
  },
  {
    title: "Trend & Volume",
    label: "Signal Overlay",
    description:
      "Area and histogram layers that suggest AI scoring, momentum shifts, and volume pressure.",
    type: "trend",
  },
  {
    title: "Allocation Wheel",
    label: "Portfolio Mix",
    description:
      "A circular composition for risk exposure, sector balance, or asset distribution visuals.",
    type: "radial",
  },
  {
    title: "Market Heatmap",
    label: "Cross-Asset Scan",
    description:
      "A grid-based signal board suited for volatility maps, winners/losers, and watchlists.",
    type: "heatmap",
  },
];

const liveSignalDots = [
  { x: "6%", y: "76%", type: "bull", delay: "0s" },
  { x: "14%", y: "71%", type: "bull", delay: "0.15s" },
  { x: "22%", y: "73%", type: "bear", delay: "0.3s" },
  { x: "30%", y: "60%", type: "bull", delay: "0.45s" },
  { x: "38%", y: "64%", type: "bull", delay: "0.6s" },
  { x: "46%", y: "49%", type: "profit", delay: "0.75s" },
  { x: "56%", y: "54%", type: "bear", delay: "0.9s" },
  { x: "66%", y: "36%", type: "bull", delay: "1.05s" },
  { x: "76%", y: "42%", type: "profit", delay: "1.2s" },
  { x: "88%", y: "22%", type: "bull", delay: "1.35s" },
];

const signalCards = [
  { label: "Profit Booked", value: "+2.84R", tone: "profit" },
  { label: "Gold Scalp", value: "TP1 Hit", tone: "profit" },
  { label: "Risk Control", value: "Break-even Moved", tone: "neutral" },
];

const crossAssetTiles = [
  { symbol: "XAU", move: "+1.42%", tone: "bull", note: "Gold bid" },
  { symbol: "NQ", move: "-0.38%", tone: "bear", note: "Risk off" },
  { symbol: "BTC", move: "+2.16%", tone: "bull", note: "Momentum" },
  { symbol: "DXY", move: "-0.27%", tone: "neutral", note: "Dollar ease" },
  { symbol: "WTI", move: "+0.91%", tone: "bull", note: "Oil firm" },
  { symbol: "VIX", move: "+3.20%", tone: "bear", note: "Vol rise" },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <a
        aria-label="Chat with HFTX AI on WhatsApp"
        className={styles.whatsappFloat}
        href={whatsappHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className={styles.whatsappIcon}>W</span>
        <span>WhatsApp</span>
      </a>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.navbar}>
          <div>
            <p className={styles.brand}>HFTX AI</p>
            <p className={styles.brandSub}>Worldwide Trading Technology</p>
          </div>
          <div className={styles.navActions}>
            <a
              className={styles.navGhost}
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              WhatsApp
            </a>
            <a className={styles.navCta} href="#contact">
              Talk to Our Team
            </a>
          </div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>AI x Trading x Growth</p>
            <h1>
              Building intelligent trading systems for fast markets and ambitious
              companies.
            </h1>
            <p className={styles.heroText}>
              HFTX AI creates AI-powered trading applications, news-based algo
              systems, prop firm solutions, market-data products, digital growth
              experiences, and software teams for modern businesses.
            </p>

          <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#assistant">
                Try AI Assistant
              </a>
              <a className={styles.secondaryButton} href="#contact">
                Start a Project
              </a>
              <a className={styles.secondaryButton} href="#services">
                Explore Services
              </a>
            </div>

            <ul className={styles.capabilityList}>
              {capabilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className={styles.heroPanel}>
            <div className={styles.panelHeader}>
              <span>Live Direction</span>
              <span>Signal Engine</span>
            </div>
            <div className={styles.chartArea}>
              <div className={styles.grid} />
              <div className={styles.scanline} />
              <div className={styles.glowOrb} />
              <div className={styles.signalPathPrimary} />
              <div className={styles.signalPathSecondary} />
              <div className={styles.signalPathTertiary} />
              {liveSignalDots.map((dot, index) => (
                <span
                  className={`${styles.signalDot} ${
                    dot.type === "bear"
                      ? styles.signalDotBear
                      : dot.type === "profit"
                        ? styles.signalDotProfit
                        : styles.signalDotBull
                  }`}
                  key={`${dot.x}-${dot.y}-${index}`}
                  style={
                    {
                      left: dot.x,
                      top: dot.y,
                      animationDelay: dot.delay,
                    } as CSSProperties
                  }
                />
              ))}
              <div className={`${styles.signalCallout} ${styles.signalCalloutLeft}`}>
                <span>BUY leg active</span>
                <strong>Momentum building</strong>
              </div>
              <div className={`${styles.signalCallout} ${styles.signalCalloutRight}`}>
                <span>Profit booked</span>
                <strong>Partial secured +1.92R</strong>
              </div>
            </div>
            <div className={styles.signalStrip}>
              {signalCards.map((item) => (
                <div
                  className={styles.signalStripCard}
                  data-tone={item.tone}
                  key={item.label}
                >
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className={styles.panelStats}>
              {metrics.map((item) => (
                <div key={item.label} className={styles.statCard}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <StockPredictionAssistant />
      <SignalSubscription />

      <section className={styles.tickerSection} aria-label="Live market style ticker">
        <div className={styles.tickerTrack}>
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span key={`${item}-${index}`} className={styles.tickerItem}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.section} id="services">
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>What We Do</p>
          <h2>Technology and execution for trading-led businesses.</h2>
          <p>
            We work across trading software, AI research, growth systems, and
            technical delivery so clients can build, launch, and scale with one
            strategic partner.
          </p>
        </div>

        <div className={styles.cardGrid}>
          {serviceCards.map((card) => (
            <article key={card.title} className={styles.serviceCard}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.motionSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Market Motion</p>
          <h2>Trading visuals that present speed, intelligence, and real market focus.</h2>
          <p>
            These motion layers help communicate live data flow, AI-driven
            analysis, and execution discipline in a way that feels closer to a
            serious trading environment.
          </p>
        </div>

        <div className={styles.motionGrid}>
          {motionFrames.map((frame, index) => (
            <article className={styles.motionCard} key={frame.title}>
              <div className={styles.motionTop}>
                <span>{frame.tag}</span>
                <span>00:0{index + 1}</span>
              </div>
              <div className={styles.motionScreen}>
                {frame.type === "sentiment" ? (
                  <div className={styles.sentimentPanel}>
                    {frame.points.map((point, pointIndex) => (
                      <div className={styles.sentimentRow} key={point}>
                        <span>{point}</span>
                        <div className={styles.sentimentTrack}>
                          <div
                            className={styles.sentimentFill}
                            style={
                              {
                                "--fill-width": `${72 - pointIndex * 17}%`,
                              } as CSSProperties
                            }
                          />
                        </div>
                        <strong>{frame.values[pointIndex]}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}

                {frame.type === "execution" ? (
                  <div className={styles.executionPanel}>
                    {frame.points.map((point, pointIndex) => (
                      <div className={styles.executionStep} key={point}>
                        <span>{point}</span>
                        <strong>{frame.values[pointIndex]}</strong>
                      </div>
                    ))}
                    <div className={styles.executionRoute}>
                      <div className={styles.executionNode} />
                      <div className={styles.executionNode} />
                      <div className={styles.executionNode} />
                    </div>
                  </div>
                ) : null}

                {frame.type === "risk" ? (
                  <div className={styles.riskPanel}>
                    <div className={styles.riskGauge}>
                      <div className={styles.riskGaugeCore}>
                        <strong>42%</strong>
                        <span>Risk Load</span>
                      </div>
                    </div>
                    <div className={styles.riskStats}>
                      {frame.points.map((point, pointIndex) => (
                        <div className={styles.riskStat} key={point}>
                          <span>{point}</span>
                          <strong>{frame.values[pointIndex]}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <h3>{frame.title}</h3>
              <p>{frame.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Chart Systems</p>
          <h2>Different chart types for different layers of trading analysis.</h2>
          <p>
            HFTX AI can present market information through multiple chart styles,
            from execution-focused price views to allocation, heatmap, and signal
            dashboards.
          </p>
        </div>

        <div className={styles.chartGrid}>
          {chartCards.map((card) => (
            <article className={styles.chartCard} key={card.title}>
              <div className={styles.motionTop}>
                <span>{card.label}</span>
                <span>{card.type}</span>
              </div>

              <div className={styles.chartSurface}>
                {card.type === "candles" ? (
                  <div className={styles.candleChart}>
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div
                        className={styles.candle}
                        key={`candle-${index}`}
                        style={
                          {
                            "--body-height": `${28 + ((index * 9) % 48)}px`,
                            "--wick-height": `${68 + ((index * 11) % 70)}px`,
                            "--offset": `${12 + ((index * 17) % 44)}px`,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                ) : null}

                {card.type === "trend" ? (
                  <div className={styles.trendChart}>
                    <div className={styles.trendArea} />
                    <div className={styles.trendLine} />
                    <div className={styles.volumeBars}>
                      {Array.from({ length: 16 }).map((_, index) => (
                        <span
                          key={`bar-${index}`}
                          style={
                            {
                              "--bar-height": `${16 + ((index * 13) % 64)}px`,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {card.type === "radial" ? (
                  <div className={styles.radialChart}>
                    <div className={styles.radialRing} />
                    <div className={styles.radialCore}>
                      <strong>76%</strong>
                      <span>AI Conviction</span>
                    </div>
                  </div>
                ) : null}

                {card.type === "heatmap" ? (
                  <div className={styles.heatmap}>
                    {crossAssetTiles.map((tile, index) => (
                      <div
                        className={styles.heatCell}
                        data-tone={tile.tone}
                        key={tile.symbol}
                        style={
                          {
                            "--heat-opacity": `${0.25 + ((index % 3) * 0.16)}`,
                          } as CSSProperties
                        }
                      >
                        <span>{tile.symbol}</span>
                        <strong>{tile.move}</strong>
                        <small>{tile.note}</small>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.darkSection}`}>
        <div className={styles.sectionHeading}>
          <p className={styles.sectionEyebrow}>Core Advantage</p>
          <h2>Why HFTX AI stands out.</h2>
        </div>

        <div className={styles.pillarGrid}>
          {pillars.map((pillar) => (
            <article key={pillar.title} className={styles.pillarCard}>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.splitLayout}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionEyebrow}>Service Spectrum</p>
            <h2>Built for traders, brands, and product teams.</h2>
            <p>
              Alongside our trading and AI stack, we support companies with
              marketing strategy, web design, electronics-focused solutions, and
              access to experienced software developers.
            </p>
          </div>

          <div className={styles.featurePanel}>
            <div>
              <span className={styles.featureLabel}>Solutions</span>
              <p>Trading platforms</p>
              <p>White-label software</p>
              <p>Market data tools</p>
              <p>Analysis and risk systems</p>
            </div>
            <div>
              <span className={styles.featureLabel}>Growth</span>
              <p>Marketing execution</p>
              <p>Conversion-focused websites</p>
              <p>Developer augmentation</p>
              <p>Electronics support</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.contactSection}`} id="contact">
        <div className={styles.contactIntro}>
          <p className={styles.sectionEyebrow}>Contact & Support</p>
          <h2>Let&apos;s build your next trading or technology solution.</h2>
          <p>
            Send your requirements, support query, or partnership idea. Messages
            are routed to <a href="mailto:ceo@hftxai.com">ceo@hftxai.com</a>.
          </p>
          <div className={styles.contactActions}>
            <a
              className={styles.whatsappButton}
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              Contact on WhatsApp
            </a>
            <p className={styles.contactHint}>
              Direct WhatsApp support is connected to +44 7916 699193.
            </p>
          </div>
        </div>

        <ContactForm whatsappHref={whatsappHref} />
      </section>
    </main>
  );
}
