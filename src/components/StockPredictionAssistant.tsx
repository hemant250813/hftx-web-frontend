"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import styles from "./StockPredictionAssistant.module.css";

type InsightResponse = {
  symbol: string;
  companyName: string;
  horizonLabel: string;
  currency: string;
  outlook: "Bullish" | "Bearish" | "Neutral";
  probabilityUp: number;
  confidence: number;
  currentPrice: number;
  projectedPrice: number;
  summary: string;
  recommendationStyle: string;
  caution: string;
  drivers: string[];
  history: { label: string; price: number }[];
  forecast: { label: string; price: number }[];
  dataSource: string;
  generatedWith: string;
  whyIncrease: string[];
  whyDecrease: string[];
};

const horizons = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "180d", label: "180 Days" },
];

const stylesOfTrading = [
  "Short-term trade",
  "Swing trade",
  "Long-term investment",
  "Portfolio allocation",
];

const initialForm = {
  symbol: "",
  currency: "",
  horizon: "",
  tradingStyle: "",
  investmentAmount: "",
  question:
    "What is the probability of this stock increasing, and how should I think about the setup?",
};

export default function StockPredictionAssistant() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState<InsightResponse | null>(null);
  const [error, setError] = useState("");
  const [symbolOptions, setSymbolOptions] = useState<string[]>([]);
  const [symbolStatus, setSymbolStatus] = useState("Loading COMEX symbols...");
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
          throw new Error(payload.message || "Unable to load symbols.");
        }

        if (!isMounted) {
          return;
        }

        const symbols = payload.symbols || [];
        setSymbolOptions(symbols);
        setSymbolStatus(
          symbols.length
            ? `${symbols.length} live symbols available from COMEX socket`
            : "No live COMEX symbols available right now",
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setSymbolStatus(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load COMEX symbols.",
        );
      }
    };

    void loadSymbols();

    return () => {
      isMounted = false;
    };
  }, []);

  const chatIntro = useMemo(
    () => [
      "Hello, I'm the HFTX AI market assistant.",
      "Pick a live COMEX symbol from the dropdown, set the duration, and I will return pricing context plus multiple analysis views.",
    ],
    [],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/stock-assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        });

        const payload = (await response.json()) as InsightResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message || "Unable to analyze this symbol.");
        }

        setResult(payload);
      } catch (submissionError) {
        setResult(null);
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Something went wrong while generating the analysis.",
        );
      }
    });
  };

  return (
    <section className={styles.shell} id="assistant">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>AI Market Assistant</p>
        <h2>The HFTX AI stock assistant is now the highlight of the experience.</h2>
        <p>
          Ask for a stock, choose your currency and time horizon, and get a
          probability-driven market view with fresher pricing, forecast charts,
          and clear reasons for why the move may rise or fall.
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.chatCard}>
          <div className={styles.chatHeader}>
            <span>Assistant Conversation</span>
            <span>{form.currency || "Select Currency"}</span>
          </div>

          <div className={styles.messages}>
            {chatIntro.map((message) => (
              <div className={styles.assistantMessage} key={message}>
                {message}
              </div>
            ))}

            <div className={styles.userPrompt}>
              <p>
                I want a forecast for{" "}
                <strong>{form.symbol || "COMEX instrument"}</strong>, with a{" "}
                <strong>{form.horizon || "time horizon"}</strong> horizon and{" "}
                <strong>{form.tradingStyle || "investment style"}</strong>.
              </p>
            </div>

            {result ? (
              <div className={styles.responseCard}>
                <div className={styles.responseTop}>
                  <div>
                    <p className={styles.responseLabel}>{result.companyName}</p>
                    <h3>{result.symbol}</h3>
                  </div>
                  <div className={styles.outlookTag}>{result.outlook}</div>
                </div>

                <div className={styles.statGrid}>
                  <div className={styles.stat}>
                    <span>Probability Up</span>
                    <strong>{result.probabilityUp}%</strong>
                  </div>
                  <div className={styles.stat}>
                    <span>Confidence</span>
                    <strong>{result.confidence}%</strong>
                  </div>
                  <div className={styles.stat}>
                    <span>Current Price</span>
                    <strong>
                      {result.currency} {result.currentPrice.toFixed(2)}
                    </strong>
                  </div>
                  <div className={styles.stat}>
                    <span>Projected Price</span>
                    <strong>
                      {result.currency} {result.projectedPrice.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <PredictionChart
                  history={result.history}
                  forecast={result.forecast}
                  symbol={result.symbol}
                />

                <AnalysisCharts result={result} />

                <p className={styles.summary}>{result.summary}</p>

                <div className={styles.driverList}>
                  {result.drivers.map((driver) => (
                    <span key={driver}>{driver}</span>
                  ))}
                </div>

                <div className={styles.reasonGrid}>
                  <div className={styles.reasonCard}>
                    <h4>Why It May Increase</h4>
                    <ul>
                      {result.whyIncrease.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.reasonCard}>
                    <h4>Why It May Decrease</h4>
                    <ul>
                      {result.whyDecrease.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={styles.notes}>
                  <p>
                    <strong>Best fit:</strong> {result.recommendationStyle}
                  </p>
                  <p>
                    <strong>Caution:</strong> {result.caution}
                  </p>
                  <p>
                    <strong>Sources:</strong> {result.dataSource} via{" "}
                    {result.generatedWith}
                  </p>
                </div>
              </div>
            ) : null}

            {error ? <div className={styles.error}>{error}</div> : null}
          </div>
        </div>

        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.topSelectors}>
            <label className={styles.field}>
              <span>Display Currency</span>
              <select
                required
                value={form.currency}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currency: event.target.value,
                  }))
                }
              >
                <option value="" disabled>
                  Select currency
                </option>
                {["USD", "EUR", "GBP", "INR", "AED"].map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Live COMEX Symbol</span>
              <select
                required
                value={form.symbol}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    symbol: event.target.value,
                  }))
                }
              >
                <option value="" disabled>
                  Select live socket symbol
                </option>
                {symbolOptions.map((symbol) => (
                  <option key={symbol} value={symbol}>
                    {symbol}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Time Horizon</span>
              <select
                required
                value={form.horizon}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    horizon: event.target.value,
                  }))
                }
              >
                <option value="" disabled>
                  Select time horizon
                </option>
                {horizons.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Investment Style</span>
              <select
                required
                value={form.tradingStyle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tradingStyle: event.target.value,
                  }))
                }
              >
                <option value="" disabled>
                  Select investment style
                </option>
                {stylesOfTrading.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Investment Amount</span>
              <input
                placeholder="10000"
                value={form.investmentAmount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    investmentAmount: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Question</span>
            <textarea
              rows={5}
              value={form.question}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  question: event.target.value,
                }))
              }
            />
          </label>

          <div className={styles.quickActions}>
            {symbolOptions.slice(0, 8).map((symbol) => (
              <button
                className={styles.quickChip}
                key={symbol}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    symbol,
                  }))
                }
                type="button"
              >
                {symbol}
              </button>
            ))}
          </div>
          <p className={styles.feedNote}>{symbolStatus}</p>

          <button className={styles.submit} disabled={isPending} type="submit">
            {isPending ? "Analyzing..." : "Generate AI Prediction"}
          </button>
        </form>
      </div>
    </section>
  );
}

function PredictionChart({
  history,
  forecast,
  symbol,
}: {
  history: { label: string; price: number }[];
  forecast: { label: string; price: number }[];
  symbol: string;
}) {
  const allPoints = [...history, ...forecast];
  const prices = allPoints.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const scale = max - min || 1;

  const historyPath = history
    .map((point, index) => {
      const x = 4 + (index / Math.max(history.length - 1, 1)) * 48;
      const y = 90 - ((point.price - min) / scale) * 70;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const forecastPath = forecast
    .map((point, index) => {
      const x = 52 + (index / Math.max(forecast.length - 1, 1)) * 44;
      const y = 90 - ((point.price - min) / scale) * 70;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartMeta}>
        <span>{symbol} Price Path</span>
        <span>History + AI Forecast</span>
      </div>
      <svg
        aria-label={`${symbol} prediction chart`}
        className={styles.chart}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="forecastStroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1dd3b0" />
            <stop offset="100%" stopColor="#ffe57d" />
          </linearGradient>
        </defs>
        <line className={styles.gridLine} x1="0" x2="100" y1="20" y2="20" />
        <line className={styles.gridLine} x1="0" x2="100" y1="50" y2="50" />
        <line className={styles.gridLine} x1="0" x2="100" y1="80" y2="80" />
        <line className={styles.divider} x1="50" x2="50" y1="10" y2="92" />
        <path className={styles.historyPath} d={historyPath} />
        <path className={styles.forecastPath} d={forecastPath} />
      </svg>
    </div>
  );
}

function AnalysisCharts({ result }: { result: InsightResponse }) {
  const rangeMin = Math.min(...result.history.map((point) => point.price));
  const rangeMax = Math.max(...result.history.map((point) => point.price));
  const rangeSpan = Math.max(rangeMax - rangeMin, 1);
  const currentPosition = ((result.currentPrice - rangeMin) / rangeSpan) * 100;
  const projectedPosition = ((result.projectedPrice - rangeMin) / rangeSpan) * 100;
  const momentumDelta = result.projectedPrice - result.currentPrice;
  const volatilityBar = Math.max(
    18,
    Math.min(96, Math.abs(momentumDelta / Math.max(result.currentPrice, 1)) * 800),
  );

  return (
    <div className={styles.analysisGrid}>
      <article className={styles.analysisCard}>
        <div className={styles.analysisTop}>
          <span>Probability Gauge</span>
          <span>{result.outlook}</span>
        </div>
        <div className={styles.probabilityTrack}>
          <div
            className={styles.probabilityFill}
            style={{ width: `${result.probabilityUp}%` }}
          />
        </div>
        <div className={styles.analysisNumbers}>
          <strong>{result.probabilityUp}%</strong>
          <span>Chance of upside in selected horizon</span>
        </div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.analysisTop}>
          <span>Range Position</span>
          <span>{result.currency}</span>
        </div>
        <div className={styles.rangeTrack}>
          <div className={styles.rangeMarker} style={{ left: `${currentPosition}%` }} />
          <div
            className={styles.rangeMarkerProjected}
            style={{ left: `${projectedPosition}%` }}
          />
        </div>
        <div className={styles.analysisNumbers}>
          <strong>
            {result.currency} {rangeMin.toFixed(2)} - {rangeMax.toFixed(2)}
          </strong>
          <span>Current and projected positioning inside recent range</span>
        </div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.analysisTop}>
          <span>Scenario Spread</span>
          <span>Upside / Downside</span>
        </div>
        <div className={styles.scenarioBars}>
          <div className={styles.scenarioRow}>
            <span>Bull case</span>
            <div className={styles.scenarioTrack}>
              <div
                className={styles.bullBar}
                style={{ width: `${Math.max(result.probabilityUp, 12)}%` }}
              />
            </div>
          </div>
          <div className={styles.scenarioRow}>
            <span>Bear case</span>
            <div className={styles.scenarioTrack}>
              <div
                className={styles.bearBar}
                style={{ width: `${Math.max(100 - result.probabilityUp, 12)}%` }}
              />
            </div>
          </div>
        </div>
      </article>

      <article className={styles.analysisCard}>
        <div className={styles.analysisTop}>
          <span>Momentum Pulse</span>
          <span>{momentumDelta >= 0 ? "Positive" : "Negative"}</span>
        </div>
        <div className={styles.momentumBars}>
          {Array.from({ length: 10 }).map((_, index) => {
            const height = 24 + ((index * 11 + volatilityBar) % 60);
            return (
              <span
                className={momentumDelta >= 0 ? styles.momentumUp : styles.momentumDown}
                key={`momentum-${index}`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
        <div className={styles.analysisNumbers}>
          <strong>
            {momentumDelta >= 0 ? "+" : ""}
            {momentumDelta.toFixed(2)} {result.currency}
          </strong>
          <span>Projected move between current and forecast target</span>
        </div>
      </article>
    </div>
  );
}
