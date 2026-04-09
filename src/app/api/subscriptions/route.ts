import nodemailer from "nodemailer";
import { upsertSubscriber, updateSubscriberStatus } from "@/lib/subscriptions";
import { sendWelcomeTemplate } from "@/lib/whatsapp";

const recipient = "ceo@hftxai.com";

export const runtime = "nodejs";

type SubscriptionPayload = {
  name?: string;
  email?: string;
  whatsapp?: string;
  selectedSymbols?: string[];
  tradingStyle?: string;
  preferredHorizon?: string;
  notes?: string;
};

const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscriptionPayload;
    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const whatsapp = body.whatsapp?.trim() || "";
    const tradingStyle = body.tradingStyle?.trim() || "Scalping";
    const preferredHorizon = body.preferredHorizon?.trim() || "15m";
    const notes = body.notes?.trim() || "No additional notes.";
    const selectedSymbols = (body.selectedSymbols || [])
      .map((symbol) => symbol.trim())
      .filter(Boolean)
      .slice(0, 5);

    if (!name || !email || !whatsapp) {
      return Response.json(
        { message: "Name, email, and WhatsApp number are required." },
        { status: 400 },
      );
    }

    if (!isEmailValid(email)) {
      return Response.json(
        { message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    if (!selectedSymbols.length) {
      return Response.json(
        { message: "Please select at least 1 COMEX instrument." },
        { status: 400 },
      );
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser || recipient;

    const summary = {
      name,
      email,
      whatsapp,
      tradingStyle,
      preferredHorizon,
      selectedSymbols,
      notes,
      plan: "Free launch signup",
      futurePricePoint: "$10/month after 7-day free trial positioning",
    };

    const { subscriber, persisted } = await upsertSubscriber({
      name,
      email,
      whatsapp,
      selectedSymbols,
      tradingStyle,
      preferredHorizon,
      notes,
    });

    const welcomeResult = await sendWelcomeTemplate({
      name,
      whatsapp,
      symbols: selectedSymbols,
    });

    await updateSubscriberStatus(subscriber.id, {
      welcomeMessageStatus: welcomeResult.ok
        ? welcomeResult.delivered
          ? "sent"
          : "skipped"
        : "failed",
    });

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.info("Subscription request received without SMTP config.", {
        ...summary,
        persisted,
        welcomeResult,
      });

      return Response.json({
        message:
          welcomeResult.delivered
            ? "Free signal signup captured and welcome message sent on WhatsApp."
            : "Free signal signup captured. WhatsApp welcome delivery is ready once Meta credentials are added.",
        persisted,
        welcomeMessage: welcomeResult,
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: recipient,
      replyTo: email,
      subject: `HFTX AI signal subscription: ${name}`,
      text: [
        "New HFTX AI Signal Subscription",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `WhatsApp: ${whatsapp}`,
        `Trading Style: ${tradingStyle}`,
        `Preferred Horizon: ${preferredHorizon}`,
        `Selected Symbols: ${selectedSymbols.join(", ")}`,
        `Plan: Free launch signup`,
        `Future price point: $10/month after 7-day free trial positioning`,
        "",
        "Notes:",
        notes,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0b1520;">
          <h2>New HFTX AI Signal Subscription</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>WhatsApp:</strong> ${whatsapp}</p>
          <p><strong>Trading Style:</strong> ${tradingStyle}</p>
          <p><strong>Preferred Horizon:</strong> ${preferredHorizon}</p>
          <p><strong>Selected Symbols:</strong> ${selectedSymbols.join(", ")}</p>
          <p><strong>Plan:</strong> Free launch signup</p>
          <p><strong>Future price point:</strong> $10/month after 7-day free trial positioning</p>
          <p><strong>Notes:</strong></p>
          <p>${notes.replace(/\n/g, "<br />")}</p>
        </div>
      `,
    });

    return Response.json({
      message:
        welcomeResult.delivered
          ? "Free signal signup received, welcome message sent, and your details have been routed to the HFTX AI team."
          : "Free signal signup received. Your details have been routed to the HFTX AI team, and WhatsApp welcome delivery is ready once Meta credentials are added.",
      persisted,
      welcomeMessage: welcomeResult,
    });
  } catch (error) {
    console.error("Subscription form submission failed.", error);

    return Response.json(
      {
        message:
          "We could not start the free signal plan right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
