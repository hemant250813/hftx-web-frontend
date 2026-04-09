export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new Response(challenge || "", { status: 200 });
  }

  return new Response("Webhook verification failed.", { status: 403 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.info("WhatsApp webhook event received.", payload);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Failed to parse WhatsApp webhook payload.", error);
    return Response.json({ received: false }, { status: 400 });
  }
}
