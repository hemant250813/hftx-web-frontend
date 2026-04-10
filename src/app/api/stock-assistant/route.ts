import OpenAI from "openai";
import { buildComexHistory, fetchComexSocketQuote, type PricePoint } from "@/lib/comex";

export const runtime = "nodejs";

type RequestBody = {
  symbol?: string;
  horizon?:
    | "5m"
    | "15m"
    | "30m"
    | "1h"
    | "4h"
    | "1d"
    | "7d"
    | "30d"
    | "90d"
    | "180d";
  tradingStyle?: string;
  positionSide?: "buy" | "sell";
  sizingMode?: "lot" | "amount";
  lotSize?: string;
  investmentAmount?: string;
  question?: string;
  followUpQuestion?: string;
  context?: {
    summary?: string;
    tradePlan?: {
      direction?: string;
      entry?: number;
      stopLoss?: number;
      breakEven?: number;
      tp1?: number;
      tp2?: number;
    };
  };
  currency?: "USD" | "EUR" | "GBP" | "INR" | "AED";
};

type NewsItem = {
  title: string;
  publishedAt: string;
  source: string;
  url?: string;
  summary: string;
};

const horizonConfig = {
  "5m": { forecastPoints: 8, label: "5 Minutes", riskFactor: 0.45 },
  "15m": { forecastPoints: 8, label: "15 Minutes", riskFactor: 0.55 },
  "30m": { forecastPoints: 8, label: "30 Minutes", riskFactor: 0.65 },
  "1h": { forecastPoints: 9, label: "1 Hour", riskFactor: 0.78 },
  "4h": { forecastPoints: 10, label: "4 Hours", riskFactor: 0.92 },
  "1d": { forecastPoints: 10, label: "1 Day", riskFactor: 1.04 },
  "7d": { forecastPoints: 7, label: "7 Days", riskFactor: 1.1 },
  "30d": { forecastPoints: 10, label: "30 Days", riskFactor: 1.18 },
  "90d": { forecastPoints: 12, label: "90 Days", riskFactor: 1.35 },
  "180d": { forecastPoints: 12, label: "180 Days", riskFactor: 1.55 },
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
    const positionSide = body.positionSide === "sell" ? "sell" : "buy";
    const sizingMode = body.sizingMode === "amount" ? "amount" : "lot";
    const lotSize = Number(body.lotSize || "1");
    const investmentAmount = body.investmentAmount?.trim() || "Not provided";
    const question = body.question?.trim() || "What is the probability of this stock increasing?";
    const followUpQuestion = body.followUpQuestion?.trim() || "";
    const currency = body.currency || "USD";

    const marketData = await fetchMarketSeries(symbol);
    const newsContext = await fetchRecentNewsContext(symbol);
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
    const tradePlan = buildTradePlan({
      currentPrice: convertedCurrentPrice,
      projectedPrice: convertedProjectedPrice,
      outlook,
      volatility,
      horizonRiskFactor: horizonConfig[horizon].riskFactor,
      tradingStyle,
      currency,
      probabilityUp,
      positionSide,
      sizingMode,
      lotSize,
      investmentAmount,
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
      newsContext,
    });
    const resolvedDataSource = `${marketData.dataSource}${
      currency !== "USD" ? `, converted to ${currency}` : ""
    }`;

    if (followUpQuestion) {
      const followUpAnswer = await generateFollowUpAnswer({
        symbol,
        companyName: marketData.companyName,
        horizonLabel: horizonConfig[horizon].label,
        tradingStyle,
        currency,
        currentPrice: convertedCurrentPrice,
        projectedPrice: convertedProjectedPrice,
        summary: body.context?.summary || analysis.summary,
        tradePlan,
        followUpQuestion,
        outlook,
        probabilityUp,
        confidence,
        newsContext,
        positionSide,
      });

      return Response.json({
        followUpAnswer,
        generatedWith: analysis.generatedWith,
      });
    }

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
      tradePlan,
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
      history: buildComexHistory(socketQuote, 90),
      dataSource: "COMEX websocket feed with 3-month modeled history",
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
          .slice(0, 90)
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
            dataSource: "Alpha Vantage GLOBAL_QUOTE and TIME_SERIES_DAILY (3 months)",
          };
        }
      }
    } catch (error) {
      console.warn("Alpha Vantage fetch failed, using synthetic series.", error);
    }
  }

  return {
    companyName: symbol,
    history: buildSyntheticHistory(symbol, 90),
    dataSource: "Synthetic fallback market data (3 months modeled history)",
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

function buildSyntheticHistory(symbol: string, length = 90): PricePoint[] {
  const base =
    symbol
      .split("")
      .reduce((total, char) => total + char.charCodeAt(0), 0) % 120;
  const start = 80 + base;

  return Array.from({ length }).map((_, index) => {
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
  newsContext: NewsItem[];
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
        input.newsContext[0]
          ? `Recent news: ${input.newsContext[0].title}`
          : `Momentum score ${input.momentum.toFixed(3)}`,
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
          recentNews: input.newsContext,
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

async function generateFollowUpAnswer(input: {
  symbol: string;
  companyName: string;
  horizonLabel: string;
  tradingStyle: string;
  currency: string;
  currentPrice: number;
  projectedPrice: number;
  summary: string;
  tradePlan: ReturnType<typeof buildTradePlan>;
  followUpQuestion: string;
  outlook: "Bullish" | "Bearish" | "Neutral";
  probabilityUp: number;
  confidence: number;
  newsContext: NewsItem[];
  positionSide: "buy" | "sell";
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  if (!apiKey) {
    const newsLine = input.newsContext.length
      ? ` Recent news focus: ${input.newsContext[0].title}. Likely effect: ${input.newsContext[0].summary}`
      : " No live news connector is configured, so this answer is based mostly on price structure and volatility.";

    return `${input.symbol} follow-up: ${input.followUpQuestion}. Current bias is ${input.outlook.toLowerCase()} with ${input.probabilityUp}% upside probability and ${input.confidence}% confidence. The selected side is ${input.positionSide}. The active plan uses entry near ${input.currency} ${input.tradePlan.entry.toFixed(2)}, stop-loss near ${input.currency} ${input.tradePlan.stopLoss.toFixed(2)}, and targets near ${input.currency} ${input.tradePlan.tp1.toFixed(2)} / ${input.currency} ${input.tradePlan.tp2.toFixed(2)}.${newsLine}`;
  }

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.45,
    messages: [
      {
        role: "system",
        content:
          "You are a trading assistant continuing a conversation about an existing market setup. Give concise practical answers, grounded in the provided setup. If the user asks about news, explain how recent headlines may affect the market bias, volatility, and trade plan. Do not promise outcomes.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content ||
    `${input.symbol} remains ${input.outlook.toLowerCase()} on the current setup.`
  );
}

async function fetchRecentNewsContext(symbol: string): Promise<NewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const query = buildNewsQuery(symbol);
    const url = new URL("https://gnews.io/api/v4/search");
    url.searchParams.set("q", query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("max", "3");
    url.searchParams.set("sortby", "publishedAt");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      next: { revalidate: 900 },
    });
    const payload = (await response.json()) as {
      articles?: Array<{
        title?: string;
        description?: string;
        publishedAt?: string;
        url?: string;
        source?: { name?: string };
      }>;
    };

    return (payload.articles || [])
      .map((article) => ({
        title: article.title || "Recent market headline",
        publishedAt: article.publishedAt || "",
        source: article.source?.name || "GNews",
        url: article.url,
        summary:
          article.description ||
          "This headline may shift sentiment, volatility, and short-term trade expectations.",
      }))
      .slice(0, 3);
  } catch (error) {
    console.warn("Recent news fetch failed.", error);
    return [];
  }
}

function buildNewsQuery(symbol: string) {
  const aliases: Record<string, string> = {
    GC: "gold COMEX gold futures",
    SI: "silver COMEX silver futures",
    HG: "copper COMEX copper futures",
    NG: "natural gas futures energy",
    CL: "crude oil futures energy",
    ENQ: "nasdaq futures risk sentiment",
    NQ: "nasdaq futures risk sentiment",
    YM: "dow futures macro markets",
    ES: "s&p 500 futures macro markets",
  };

  const prefix = symbol.replace(/[A-Z]?\d+/g, "");
  return aliases[prefix] || `${symbol} commodity futures market`;
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

function buildTradePlan(input: {
  currentPrice: number;
  projectedPrice: number;
  outlook: "Bullish" | "Bearish" | "Neutral";
  volatility: number;
  horizonRiskFactor: number;
  tradingStyle: string;
  currency: string;
  probabilityUp: number;
  positionSide: "buy" | "sell";
  sizingMode: "lot" | "amount";
  lotSize: number;
  investmentAmount: string;
}) {
  const baseRisk = Math.max(
    input.currentPrice * Math.max(input.volatility, 0.0025) * input.horizonRiskFactor,
    input.currentPrice * 0.0025,
  );
  const sellBias = input.positionSide === "sell";
  const bias = sellBias ? -1 : 1;

  const entry =
    input.outlook === "Neutral"
      ? input.currentPrice
      : input.currentPrice - baseRisk * 0.18 * bias;
  const stopLoss =
    sellBias
      ? entry + baseRisk
      : entry - baseRisk;
  const tp1 =
    sellBias
      ? entry - baseRisk * 1.15
      : entry + baseRisk * 1.15;
  const tp2 =
    sellBias
      ? entry - baseRisk * 2.05
      : entry + baseRisk * 2.05;
  const breakEven =
    sellBias
      ? entry - baseRisk * 0.72
      : entry + baseRisk * 0.72;
  const sellZone =
    sellBias
      ? entry + baseRisk * 0.25
      : entry + baseRisk * 1.75;
  const buyZone =
    sellBias
      ? entry - baseRisk * 0.4
      : entry - baseRisk * 0.25;

  const normalizedLotSize = Number.isFinite(input.lotSize) && input.lotSize > 0 ? input.lotSize : 1;
  const estimatedAmount =
    input.sizingMode === "lot"
      ? roundPrice(input.currentPrice * normalizedLotSize)
      : roundPrice(Number(input.investmentAmount || "0") || input.currentPrice);

  return {
    direction: sellBias ? "Sell Bias" : "Buy Bias",
    positionSide: input.positionSide,
    entry: roundPrice(entry),
    buyZone: roundPrice(buyZone),
    sellZone: roundPrice(sellZone),
    stopLoss: roundPrice(stopLoss),
    breakEven: roundPrice(breakEven),
    tp1: roundPrice(tp1),
    tp2: roundPrice(tp2),
    invalidation:
      sellBias
        ? "Invalidate the setup if price holds above the stop-loss zone with momentum."
        : "Invalidate the setup if price loses the stop-loss zone and fails to recover quickly.",
    riskReward: `${(
      Math.abs(tp2 - entry) / Math.max(Math.abs(entry - stopLoss), 0.0001)
    ).toFixed(2)}R`,
    sizingMode: input.sizingMode,
    lotSize: roundPrice(normalizedLotSize),
    estimatedAmount,
    setupType:
      input.tradingStyle === "Portfolio allocation"
        ? "Staggered allocation setup"
        : input.tradingStyle === "Long-term investment"
          ? "Swing accumulation setup"
          : "Active trade setup",
    notes:
      input.probabilityUp >= 60
        ? `Bias favors upside continuation. Use ${input.currency} risk sizing carefully.`
        : "This setup is lower confidence. Consider lighter size and faster risk management.",
  };
}

function roundPrice(value: number) {
  return Number(value.toFixed(2));
}
