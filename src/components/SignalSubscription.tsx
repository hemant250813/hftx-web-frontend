"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import styles from "./SignalSubscription.module.css";

type SubscriptionPayload = {
  name: string;
  email: string;
  whatsapp: string;
  selectedSymbols: string[];
  tradingStyle: string;
  preferredHorizon: string;
  notes: string;
};

type SubscriptionResponse = {
  message?: string;
  persisted?: boolean;
  welcomeMessage?: {
    ok?: boolean;
    delivered?: boolean;
    mode?: "live" | "dry-run";
    error?: string;
  };
};

const initialForm: SubscriptionPayload = {
  name: "",
  email: "",
  whatsapp: "",
  selectedSymbols: [],
  tradingStyle: "Scalping",
  preferredHorizon: "15m",
  notes: "",
};

const horizons = ["5m", "15m", "30m", "1h", "4h", "1d"];
const stylesOfTrading = [
  "Scalping",
  "Hedging",
  "Intraday momentum",
  "News reaction",
  "Swing trade",
];

export default function SignalSubscription() {
  const [form, setForm] = useState(initialForm);
  const [isOpen, setIsOpen] = useState(false);
  const [symbolOptions, setSymbolOptions] = useState<string[]>([]);
  const [symbolStatus, setSymbolStatus] = useState("Loading COMEX instruments...");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    const loadSymbols = async () => {
      try {
        const response = await fetch("/api/comex-symbols");
        const payload = (await response.json()) as {
          symbols?: string[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load COMEX instruments.");
        }

        if (!isMounted) {
          return;
        }

        const symbols = payload.symbols || [];
        setSymbolOptions(symbols);
        setSymbolStatus(
          symbols.length
            ? `Choose up to 5 live instruments from ${symbols.length} available symbols.`
            : "No live COMEX instruments available right now.",
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setSymbolStatus(
          error instanceof Error
            ? error.message
            : "Unable to load COMEX instruments.",
        );
      }
    };

    void loadSymbols();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSymbol = (symbol: string) => {
    setForm((current) => {
      const exists = current.selectedSymbols.includes(symbol);

      if (exists) {
        return {
          ...current,
          selectedSymbols: current.selectedSymbols.filter((item) => item !== symbol),
        };
      }

      if (current.selectedSymbols.length >= 5) {
        setStatus("You can select up to 5 COMEX instruments in this plan.");
        return current;
      }

      setStatus("");
      return {
        ...current,
        selectedSymbols: [...current.selectedSymbols, symbol],
      };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const payload = (await response.json()) as SubscriptionResponse;

        if (!response.ok) {
          throw new Error(payload.message || "Unable to start your free signal plan.");
        }

        const details = [
          payload.message ||
            "Your free signal request has been received. We will contact you on WhatsApp.",
          payload.persisted === false
            ? "Subscriber storage is in fallback mode right now, so production database setup is still recommended."
            : "",
          payload.welcomeMessage?.mode === "dry-run"
            ? "Welcome message is prepared, but Meta WhatsApp credentials are still needed for live delivery."
            : "",
          payload.welcomeMessage?.error || "",
        ]
          .filter(Boolean)
          .join(" ");

        setStatus(details);
        setForm(initialForm);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Something went wrong while starting your free plan.",
        );
      }
    });
  };

  return (
    <section className={styles.shell} id="signals">
      <div className={styles.heroCard}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Signal Subscription</p>
          <h2>Free COMEX WhatsApp signals with your 5 chosen instruments.</h2>
          <p className={styles.description}>
            Users can start with a 7-day free trial and later move to a
            $10/month plan, but for now you are offering this onboarding flow
            as free. The focus is simple: pick 5 COMEX instruments and receive
            AI-driven trade signals on WhatsApp shaped by price action, news,
            sentiment, and macro event context.
          </p>

          <div className={styles.planStrip}>
            <div className={styles.planMetric}>
              <strong>7 Days</strong>
              <span>Free trial positioning</span>
            </div>
            <div className={styles.planMetric}>
              <strong>$10 / mo</strong>
              <span>Planned subscription price</span>
            </div>
            <div className={styles.planMetric}>
              <strong>5 Symbols</strong>
              <span>COMEX instruments per user</span>
            </div>
            <div className={styles.planMetric}>
              <strong>30 Min</strong>
              <span>Target signal-check cadence</span>
            </div>
          </div>

          <div className={styles.featureList}>
            <span>WhatsApp delivery</span>
            <span>Sentiment-led signals</span>
            <span>News and macro event scanning</span>
            <span>Scalping and hedging friendly</span>
          </div>
        </div>

        <div className={styles.offerCard}>
          <p className={styles.offerTag}>Current Offer</p>
          <h3>Launch free now</h3>
          <p>
            Subscribe users into the signal list now, collect their WhatsApp
            number and 5 preferred COMEX instruments, and prepare the product
            for the next automation phase.
          </p>
          <button
            className={styles.subscribeButton}
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            {isOpen ? "Hide Subscription Form" : "Subscribe Free"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <div>
              <p className={styles.eyebrow}>Free Signal Access</p>
              <h3>Choose your 5 COMEX instruments</h3>
            </div>
            <div className={styles.counter}>
              {form.selectedSymbols.length}/5 selected
            </div>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Name</span>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Your full name"
              />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="name@company.com"
              />
            </label>

            <label className={styles.field}>
              <span>WhatsApp Number</span>
              <input
                required
                value={form.whatsapp}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    whatsapp: event.target.value,
                  }))
                }
                placeholder="+44 7916 699193"
              />
            </label>

            <label className={styles.field}>
              <span>Trading Style</span>
              <select
                value={form.tradingStyle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tradingStyle: event.target.value,
                  }))
                }
              >
                {stylesOfTrading.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Preferred Horizon</span>
              <select
                value={form.preferredHorizon}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    preferredHorizon: event.target.value,
                  }))
                }
              >
                {horizons.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span>Signal Notes</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Tell us if you want more focus on gold, energy, hedging, fast scalp entries, macro reactions, or event-driven updates."
            />
          </label>

          <div className={styles.symbolHeader}>
            <div>
              <p className={styles.symbolTitle}>Available COMEX instruments</p>
              <p className={styles.symbolNote}>{symbolStatus}</p>
            </div>
            <p className={styles.symbolHint}>
              Signals are scoped to the 5 instruments selected here.
            </p>
          </div>

          <div className={styles.symbolGrid}>
            {symbolOptions.map((symbol) => {
              const isSelected = form.selectedSymbols.includes(symbol);

              return (
                <button
                  className={isSelected ? styles.symbolChipActive : styles.symbolChip}
                  key={symbol}
                  onClick={() => toggleSymbol(symbol)}
                  type="button"
                >
                  {symbol}
                </button>
              );
            })}
          </div>

          <div className={styles.selectedStrip}>
            {form.selectedSymbols.length ? (
              form.selectedSymbols.map((symbol) => (
                <span className={styles.selectedBadge} key={symbol}>
                  {symbol}
                </span>
              ))
            ) : (
              <span className={styles.emptyState}>Select up to 5 symbols to continue.</span>
            )}
          </div>

          <div className={styles.automationNote}>
            <strong>Planned automation:</strong> this signup flow is ready now.
            The 30-minute WhatsApp signal engine, news ingestion, Twitter/X
            sentiment, and war-event monitoring still need provider credentials
            plus a scheduled backend service outside simple Vercel request
            handlers.
          </div>

          <button className={styles.submitButton} disabled={isPending} type="submit">
            {isPending ? "Starting Free Plan..." : "Start Free Signal Plan"}
          </button>

          {status ? <p className={styles.status}>{status}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
