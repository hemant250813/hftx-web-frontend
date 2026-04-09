import OpenAI from "openai";
import { buildComexHistory, fetchComexSocketQuote, type PricePoint } from "@/lib/comex";

export const runtime = "nodejs";

type RequestBody = {
  symbol?: string;
  horizon?: "7d" | "30d" | "90d" | "180d";
  tradingStyle?: string;
  investmentAmount?: string;
  question?: string;
  currency?: "USD" | "EUR" | "GBP" | "INR" | "AED";
};

const horizonConfig = {
  "7d": { forecastPoints: 7, label: "7 Days" },
  "30d": { forecastPoints: 10, label: "30 Days" },
  "90d": { forecastPoints: 12, label: "90 Days" },
  "180d": { forecastPoints: 12, label: "180 Days" },
} as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const symbol = body.symbol?.trim().toUpperCase() || "";

    if (!symbol) {
      return Response.json(
        { message: "Please provide a stock symbol or instrument name." },
        { status: 400 },
      );
    }

    const horizon = body.horizon && body.horizon in horizonConfig ? body.horizon : "30d";
    const tradingStyle = body.tradingStyle?.trim() || "Long-term investment";
    const investmentAmount = body.investmentAmount?.trim() || "Not provided";
    const question = body.question?.trim() || "What is the probability of this stock increasing?";
    const currency = body.currency || "USD";

    const marketData = await fetchMarketSeries(symbol);
    const currentPrice = marketData.history[marketData.history.length - 1]?.price ?? 100;
    const momentum =
      (currentPrice - marketData.history[0].price) / Math.max(marketData.history[0].price, 1);
    const volatility = calculateVolatility(marketData.history);
    const probabilityUp = clamp(
      Math.round(54 + momentum * 150 - volatility * 90),
      28,
      82,
    );
    const confidence = clamp(Math.round(68 - volatility * 55 + Math.abs(momentum) * 24), 42, 88);
    const outlook = deriveOutlook(probabilityUp);

    const forecast = buildForecastSeries(
      marketData.history,
      horizonConfig[horizon].forecastPoints,
      probabilityUp,
      volatility,
    );

    const projectedPrice = forecast[forecast.length - 1]?.price ?? currentPrice;
    const conversionRate = await fetchConversionRate("USD", currency);
    const convertedHistory = marketData.history.map((point) => ({
      ...point,
      price: convertPrice(point.price, conversionRate),
    }));
    const convertedForecast = forecast.map((point) => ({
      ...point,
      price: convertPrice(point.price, conversionRate),
    }));
    const convertedCurrentPrice = convertPrice(currentPrice, conversionRate);
    const convertedProjectedPrice = convertPrice(projectedPrice, conversionRate);
    const reasons = buildReasons({
      probabilityUp,
      momentum,
      volatility,
      horizonLabel: horizonConfig[horizon].label,
      tradingStyle,
    });

    const analysis = await generateAnalysis({
      symbol,
      companyName: marketData.companyName,
      currentPrice: convertedCurrentPrice,
      projectedPrice: convertedProjectedPrice,
      probabilityUp,
      confidence,
      outlook,
      horizonLabel: horizonConfig[horizon].label,
      tradingStyle,
      investmentAmount,
      question,
      volatility,
      momentum,
      dataSource: `${marketData.dataSource}${
        currency !== "USD" ? `, converted to ${currency}` : ""
      }`,
      reasons,
      currency,
    });
    const resolvedDataSource = `${marketData.dataSource}${
      currency !== "USD" ? `, converted to ${currency}` : ""
    }`;

    return Response.json({
      symbol,
      companyName: marketData.companyName,
      horizonLabel: horizonConfig[horizon].label,
      currency,
      outlook,
      probabilityUp,
      confidence,
      currentPrice: convertedCurrentPrice,
      projectedPrice: convertedProjectedPrice,
      summary: analysis.summary,
      recommendationStyle: analysis.recommendationStyle,
      caution: analysis.caution,
      drivers: analysis.drivers,
      whyIncrease: analysis.whyIncrease,
      whyDecrease: analysis.whyDecrease,
      history: convertedHistory,
      forecast: convertedForecast,
      dataSource: resolvedDataSource,
      generatedWith: analysis.generatedWith,
    });
  } catch (error) {
    console.error("Stock assistant failed.", error);

    return Response.json(
      { message: "We could not generate the stock outlook right now." },
      { status: 500 },
    );
  }
}

async function fetchMarketSeries(symbol: string) {
  const socketQuote = await fetchComexSocketQuote(symbol);
  if (socketQuote) {
    return {
      companyName: socketQuote.symbol,
      history: buildComexHistory(socketQuote),
      dataSource: "COMEX websocket feed",
    };
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (apiKey) {
    try {
      const quoteUrl = new URL("https://www.alphavantage.co/query");
      quoteUrl.searchParams.set("function", "GLOBAL_QUOTE");
      quoteUrl.searchParams.set("symbol", symbol);
      quoteUrl.searchParams.set("apikey", apiKey);

      const url = new URL("https://www.alphavantage.co/query");
      url.searchParams.set("function", "TIME_SERIES_DAILY");
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("outputsize", "compact");
      url.searchParams.set("apikey", apiKey);

      const [quoteResponse, response] = await Promise.all([
        fetch(quoteUrl.toString(), { next: { revalidate: 60 } }),
        fetch(url.toString(), { next: { revalidate: 3600 } }),
      ]);
      const quotePayload = (await quoteResponse.json()) as {
        "Global Quote"?: { "05. price"?: string };
      };
      const payload = (await response.json()) as {
        "Meta Data"?: { "2. Symbol"?: string };
        "Time Series (Daily)"?: Record<string, { "4. close": string }>;
      };

      const series = payload["Time Series (Daily)"];
      if (series) {
        const history = Object.entries(series)
          .slice(0, 30)
          .reverse()
          .map(([date, values]) => ({
            label: date.slice(5),
            price: Number(values["4. close"]),
          }))
          .filter((point) => Number.isFinite(point.price));

        if (history.length > 10) {
          const livePrice = Number(quotePayload["Global Quote"]?.["05. price"]);
          if (Number.isFinite(livePrice) && livePrice > 0) {
            history[history.length - 1] = {
              ...history[history.length - 1],
              label: "Now",
              price: livePrice,
            };
          }

          return {
            companyName: payload["Meta Data"]?.["2. Symbol"] || symbol,
            history,
            dataSource: "Alpha Vantage GLOBAL_QUOTE and TIME_SERIES_DAILY",
          };
        }
      }
    } catch (error) {
      console.warn("Alpha Vantage fetch failed, using synthetic series.", error);
    }
  }

  return {
    companyName: symbol,
    history: buildSyntheticHistory(symbol),
    dataSource: "Synthetic fallback market data",
  };
}

async function fetchConversionRate(fromCurrency: string, toCurrency: string) {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    return 1;
  }

  try {
    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "CURRENCY_EXCHANGE_RATE");
    url.searchParams.set("from_currency", fromCurrency);
    url.searchParams.set("to_currency", toCurrency);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });
    const payload = (await response.json()) as {
      "Realtime Currency Exchange Rate"?: {
        "5. Exchange Rate"?: string;
      };
    };
    const rate = Number(
      payload["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"],
    );

    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  } catch (error) {
    console.warn("Currency conversion fetch failed, using identity rate.", error);
    return 1;
  }
}

function buildSyntheticHistory(symbol: string): PricePoint[] {
  const base =
    symbol
      .split("")
      .reduce((total, char) => total + char.charCodeAt(0), 0) % 120;
  const start = 80 + base;

  return Array.from({ length: 30 }).map((_, index) => {
    const drift = index * (0.4 + (base % 7) * 0.03);
    const cycle = Math.sin(index / 3.1) * (3 + (base % 9));
    const pulse = Math.cos(index / 2.2) * 2.2;

    return {
      label: `D${index + 1}`,
      price: Number((start + drift + cycle + pulse).toFixed(2)),
    };
  });
}

function buildForecastSeries(
  history: PricePoint[],
  length: number,
  probabilityUp: number,
  volatility: number,
) {
  const current = history[history.length - 1]?.price ?? 100;
  const directionBias = (probabilityUp - 50) / 100;

  return Array.from({ length }).map((_, index) => {
    const step = index + 1;
    const drift = current * directionBias * 0.018 * step;
    const wave = Math.sin(step / 1.8) * current * Math.max(volatility, 0.02) * 0.14;

    return {
      label: `F${step}`,
      price: Number((current + drift + wave).toFixed(2)),
    };
  });
}

function calculateVolatility(history: PricePoint[]) {
  if (history.length < 2) {
    return 0.1;
  }

  const returns = history.slice(1).map((point, index) => {
    const prev = history[index].price;
    return (point.price - prev) / Math.max(prev, 1);
  });

  const avg = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - avg) ** 2, 0) / returns.length;

  return Math.sqrt(variance);
}

function deriveOutlook(probabilityUp: number) {
  if (probabilityUp >= 60) {
    return "Bullish" as const;
  }

  if (probabilityUp <= 44) {
    return "Bearish" as const;
  }

  return "Neutral" as const;
}

async function generateAnalysis(input: {
  symbol: string;
  companyName: string;
  currentPrice: number;
  projectedPrice: number;
  probabilityUp: number;
  confidence: number;
  outlook: "Bullish" | "Bearish" | "Neutral";
  horizonLabel: string;
  tradingStyle: string;
  investmentAmount: string;
  question: string;
  volatility: number;
  momentum: number;
  dataSource: string;
  reasons: {
    whyIncrease: string[];
    whyDecrease: string[];
  };
  currency: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    return {
      summary: `${input.symbol} shows a ${input.outlook.toLowerCase()} setup over ${input.horizonLabel}. The current scenario model suggests a ${input.probabilityUp}% probability of upside, with confidence at ${input.confidence}%. This view is based on price trend, recent volatility, and horizon-specific projection logic.`,
      recommendationStyle: `${input.tradingStyle} with staged entries and risk controls`,
      caution:
        "Use this as scenario analysis only. Earnings, macro news, liquidity, and sudden volatility can invalidate the projection quickly.",
      drivers: [
        `${input.horizonLabel} horizon selected`,
        `Estimated volatility ${input.volatility.toFixed(3)}`,
        `Momentum score ${input.momentum.toFixed(3)}`,
      ],
      whyIncrease: input.reasons.whyIncrease,
      whyDecrease: input.reasons.whyDecrease,
      generatedWith: "rule-based fallback engine",
    };
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a financial market analysis assistant for a website. Provide concise scenario-based analysis, not guaranteed advice. Respond as JSON with keys summary, recommendationStyle, caution, drivers, whyIncrease, whyDecrease. drivers must be an array of 3 short strings. whyIncrease and whyDecrease must each be arrays of 3 short reasons.",
      },
      {
        role: "user",
        content: JSON.stringify({
          symbol: input.symbol,
          companyName: input.companyName,
          currentPrice: input.currentPrice,
          projectedPrice: input.projectedPrice,
          probabilityUp: input.probabilityUp,
          confidence: input.confidence,
          outlook: input.outlook,
          horizonLabel: input.horizonLabel,
          tradingStyle: input.tradingStyle,
          investmentAmount: input.investmentAmount,
          question: input.question,
          volatility: input.volatility,
          momentum: input.momentum,
          dataSource: input.dataSource,
          currency: input.currency,
          whyIncrease: input.reasons.whyIncrease,
          whyDecrease: input.reasons.whyDecrease,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content) as {
    summary?: string;
    recommendationStyle?: string;
    caution?: string;
    drivers?: string[];
    whyIncrease?: string[];
    whyDecrease?: string[];
  };

  return {
    summary:
      parsed.summary ||
      `${input.symbol} has a ${input.outlook.toLowerCase()} probability setup over ${input.horizonLabel}.`,
    recommendationStyle:
      parsed.recommendationStyle || `${input.tradingStyle} with defined risk limits`,
    caution:
      parsed.caution ||
      "This output is scenario analysis and should be validated with live market context.",
    drivers: Array.isArray(parsed.drivers) ? parsed.drivers.slice(0, 3) : [],
    whyIncrease: Array.isArray(parsed.whyIncrease)
      ? parsed.whyIncrease.slice(0, 3)
      : input.reasons.whyIncrease,
    whyDecrease: Array.isArray(parsed.whyDecrease)
      ? parsed.whyDecrease.slice(0, 3)
      : input.reasons.whyDecrease,
    generatedWith: model,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function convertPrice(value: number, conversionRate: number) {
  return Number((value * conversionRate).toFixed(2));
}

function buildReasons(input: {
  probabilityUp: number;
  momentum: number;
  volatility: number;
  horizonLabel: string;
  tradingStyle: string;
}) {
  const whyIncrease = [
    input.momentum >= 0
      ? "Recent price momentum is positive, which supports continuation."
      : "The setup could rebound if recent selling pressure begins to fade.",
    input.probabilityUp >= 60
      ? `The current model favors upside over ${input.horizonLabel}.`
      : `Upside remains possible if new buying interest strengthens across ${input.horizonLabel}.`,
    input.volatility < 0.03
      ? "Volatility is relatively controlled, which can support cleaner trend development."
      : "Higher volatility can create upside bursts if the move resolves in favor of buyers.",
  ];

  const whyDecrease = [
    input.momentum < 0
      ? "Recent momentum is weak, which can continue dragging price lower."
      : "Positive momentum can fail if buyers lose control near resistance.",
    input.volatility >= 0.03
      ? "Elevated volatility increases the chance of sharp downside swings."
      : "Even in calmer conditions, sentiment can reverse quickly on new information.",
    `${input.tradingStyle} setups still need disciplined risk control because the probability is not certainty.`,
  ];

  return {
    whyIncrease,
    whyDecrease,
  };
}
