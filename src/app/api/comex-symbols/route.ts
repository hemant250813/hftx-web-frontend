import { collectComexSymbols } from "@/lib/comex";

export const runtime = "nodejs";

export async function GET() {
  try {
    const symbols = await collectComexSymbols();

    return Response.json({
      symbols,
      count: symbols.length,
    });
  } catch (error) {
    console.error("Failed to collect COMEX symbols.", error);

    return Response.json(
      {
        symbols: [],
        count: 0,
        message: "Unable to load COMEX symbols right now.",
      },
      { status: 500 },
    );
  }
}
