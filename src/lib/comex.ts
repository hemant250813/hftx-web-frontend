import WebSocket from "ws";

export type PricePoint = {
  label: string;
  price: number;
};

export type ComexQuote = {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: string;
};

export async function fetchComexSocketQuote(
  symbol: string,
  socketUrl = process.env.COMEX_SOCKET_URL || "ws://138.201.81.161:9999",
): Promise<ComexQuote | null> {
  return new Promise((resolve) => {
    let settled = false;
    const upperSymbol = symbol.toUpperCase();
    const ws = new WebSocket(socketUrl);

    const finish = (quote: ComexQuote | null) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {}
      resolve(quote);
    };

    const timeout = setTimeout(() => finish(null), 3500);

    ws.on("message", (raw) => {
      try {
        const parsed = JSON.parse(String(raw)) as unknown;
        if (!Array.isArray(parsed)) {
          return;
        }

        for (const row of parsed) {
          if (!Array.isArray(row) || row.length < 10) {
            continue;
          }

          const rowSymbol = String(row[0] || row[1] || "").toUpperCase();
          if (rowSymbol !== upperSymbol) {
            continue;
          }

          const quote: ComexQuote = {
            symbol: rowSymbol,
            last: Number(row[2]),
            bid: Number(row[3]),
            ask: Number(row[4]),
            open: Number(row[5]),
            high: Number(row[6]),
            low: Number(row[7]),
            previousClose: Number(row[8]),
            timestamp: String(row[9] || ""),
          };

          if (Number.isFinite(quote.last) && quote.last > 0) {
            finish(quote);
            return;
          }
        }
      } catch {
        // Ignore malformed websocket payloads and keep listening briefly.
      }
    });

    ws.on("error", () => finish(null));
    ws.on("close", () => finish(null));
  });
}

export async function collectComexSymbols(
  socketUrl = process.env.COMEX_SOCKET_URL || "ws://138.201.81.161:9999",
) {
  return new Promise<string[]>((resolve) => {
    const symbols = new Set<string>();
    let settled = false;
    const ws = new WebSocket(socketUrl);

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {}
      resolve([...symbols].sort());
    };

    const timeout = setTimeout(finish, 4500);

    ws.on("message", (raw) => {
      try {
        const parsed = JSON.parse(String(raw)) as unknown;
        if (!Array.isArray(parsed)) {
          return;
        }

        for (const row of parsed) {
          if (!Array.isArray(row) || row.length < 2) {
            continue;
          }

          const symbol = String(row[0] || row[1] || "").toUpperCase();
          if (symbol) {
            symbols.add(symbol);
          }
        }

        if (symbols.size >= 120) {
          finish();
        }
      } catch {
        // Ignore malformed payloads.
      }
    });

    ws.on("error", finish);
    ws.on("close", finish);
  });
}

export function buildComexHistory(quote: ComexQuote, length = 90): PricePoint[] {
  const floor = Math.max(quote.low || quote.last * 0.992, quote.last * 0.9);
  const ceiling = Math.max(quote.high || quote.last * 1.008, quote.last);
  const base = quote.previousClose || quote.open || quote.last;
  const total = Math.max(length, 12);

  const series = Array.from({ length: total }).map((_, index) => {
    const progress = index / Math.max(total - 1, 1);
    const intradayBias = (quote.last - base) * progress;
    const cyclic = Math.sin(index / 5.2) * (ceiling - floor) * 0.18;
    const secondary = Math.cos(index / 8.3) * (ceiling - floor) * 0.1;
    const interpolated = base + intradayBias + cyclic + secondary;
    const clamped = Math.min(ceiling, Math.max(floor, interpolated));

    return {
      label:
        index === total - 1
          ? "Now"
          : `D${String(total - index).padStart(2, "0")}`,
      price: Number(clamped.toFixed(2)),
    };
  });

  if (series.length) {
    series[series.length - 1] = {
      label: "Now",
      price: Number(quote.last.toFixed(2)),
    };
  }

  return series;
}
