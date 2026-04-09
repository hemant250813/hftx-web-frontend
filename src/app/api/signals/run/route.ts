import {
  listSignalEligibleSubscribers,
  updateSubscriberStatus,
} from "@/lib/subscriptions";
import {
  generateSignalsForSubscriber,
  summarizeSignals,
} from "@/lib/signal-engine";
import { sendSignalTemplate } from "@/lib/whatsapp";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const configuredToken = process.env.SIGNAL_RUN_TOKEN;

  if (!configuredToken) {
    return false;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");

  return bearer === configuredToken || queryToken === configuredToken;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { message: "Unauthorized signal run request." },
      { status: 401 },
    );
  }

  const subscribers = await listSignalEligibleSubscribers();
  const results = [];

  for (const subscriber of subscribers) {
    const signals = await generateSignalsForSubscriber(subscriber);
    const summary = summarizeSignals(subscriber, signals);

    let deliveryMode = "skipped";
    let lastError: string | null = null;

    for (const signal of signals.filter((item) => item.direction !== "WAIT")) {
      const result = await sendSignalTemplate({
        whatsapp: subscriber.whatsapp,
        symbol: signal.symbol,
        direction: signal.direction,
        entry: String(signal.entry),
        stopLoss: String(signal.stopLoss),
        tp1: String(signal.tp1),
      });

      deliveryMode = result.mode;

      if (!result.ok) {
        lastError = result.error || "Unknown WhatsApp delivery error.";
      }
    }

    await updateSubscriberStatus(subscriber.id, {
      lastSignalRunAt: new Date().toISOString(),
      lastSignalSummary: summary,
    });

    results.push({
      id: subscriber.id,
      name: subscriber.name,
      symbols: subscriber.selectedSymbols,
      summary,
      deliveryMode,
      lastError,
    });
  }

  return Response.json({
    processed: subscribers.length,
    results,
  });
}
