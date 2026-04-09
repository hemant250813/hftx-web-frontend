import { fetchComexSocketQuote } from "@/lib/comex";
import type { SubscriberRecord } from "@/lib/subscriptions";

export type SignalInsight = {
  symbol: string;
  direction: "BUY" | "SELL" | "WAIT";
  confidence: number;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  breakEven: number;
  reason: string;
  newsStatus: string;
  sentimentStatus: string;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function buildSignalFromQuote(symbol: string, quote: Awaited<ReturnType<typeof fetchComexSocketQuote>>) {
  if (!quote) {
    return {
      symbol,
      direction: "WAIT",
      confidence: 32,
      entry: 0,
      stopLoss: 0,
      tp1: 0,
      tp2: 0,
      breakEven: 0,
      reason:
        "No live quote was available from the COMEX socket during this cycle, so the model is standing down.",
      newsStatus: "News connectors not configured",
      sentimentStatus: "Sentiment connectors not configured",
    } satisfies SignalInsight;
  }

  const baseline = quote.previousClose || quote.open || quote.last;
  const momentum = quote.last - baseline;
  const range = Math.max((quote.high || quote.last) - (quote.low || quote.last), quote.last * 0.0035);
  const direction: SignalInsight["direction"] =
    momentum > quote.last * 0.0015 ? "BUY" : momentum < -quote.last * 0.0015 ? "SELL" : "WAIT";

  const confidence = Math.max(
    38,
    Math.min(82, 50 + Math.abs((momentum / Math.max(quote.last, 1)) * 2000)),
  );

  const entry = quote.last;
  const stopDistance = range * 0.35;
  const targetDistance = range * 0.55;

  return {
    symbol,
    direction,
    confidence: round(confidence),
    entry: round(entry),
    stopLoss: round(direction === "SELL" ? entry + stopDistance : entry - stopDistance),
    tp1: round(direction === "SELL" ? entry - targetDistance : entry + targetDistance),
    tp2: round(
      direction === "SELL" ? entry - targetDistance * 1.55 : entry + targetDistance * 1.55,
    ),
    breakEven: round(direction === "SELL" ? entry - stopDistance * 0.4 : entry + stopDistance * 0.4),
    reason:
      direction === "BUY"
        ? "Price is holding above the session baseline with positive short-term momentum from the live COMEX feed."
        : direction === "SELL"
          ? "Price is trading below the session baseline with weakening momentum from the live COMEX feed."
          : "Momentum is mixed, so the engine prefers patience until price commits with stronger direction.",
    newsStatus: "News and macro connectors can be added next",
    sentimentStatus: "Twitter/X and sentiment connectors can be added next",
  };
}

export async function generateSignalsForSubscriber(subscriber: SubscriberRecord) {
  const signals = await Promise.all(
    subscriber.selectedSymbols.map(async (symbol) =>
      buildSignalFromQuote(symbol, await fetchComexSocketQuote(symbol)),
    ),
  );

  return signals;
}

export function summarizeSignals(subscriber: SubscriberRecord, signals: SignalInsight[]) {
  const activeSignals = signals.filter((signal) => signal.direction !== "WAIT");

  if (!activeSignals.length) {
    return `No active trade signal was generated for ${subscriber.name}'s selected symbols in this cycle.`;
  }

  return activeSignals
    .map(
      (signal) =>
        `${signal.symbol}: ${signal.direction} near ${signal.entry} | SL ${signal.stopLoss} | TP1 ${signal.tp1} | TP2 ${signal.tp2} | Confidence ${signal.confidence}%`,
    )
    .join(" || ");
}
