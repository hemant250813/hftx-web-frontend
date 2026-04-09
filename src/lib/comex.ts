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

export function buildComexHistory(quote: ComexQuote): PricePoint[] {
  const anchors = [
    quote.previousClose || quote.open || quote.last,
    quote.open || quote.previousClose || quote.last,
    (quote.low + quote.open) / 2 || quote.last,
    quote.low || quote.last,
    (quote.low + quote.last) / 2 || quote.last,
    quote.bid || quote.last,
    quote.last,
    quote.ask || quote.last,
    (quote.last + quote.high) / 2 || quote.last,
    quote.high || quote.last,
    quote.last,
  ].map((value) => Number(value.toFixed(2)));

  return anchors.map((price, index) => ({
    label:
      index === anchors.length - 1
        ? "Now"
        : `T${String(index + 1).padStart(2, "0")}`,
    price,
  }));
}
