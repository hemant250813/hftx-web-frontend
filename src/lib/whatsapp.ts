type WhatsAppTemplateParameter = {
  type: "text";
  text: string;
};

type TemplateSendResult = {
  ok: boolean;
  delivered: boolean;
  mode: "live" | "dry-run";
  messageId?: string;
  error?: string;
};

const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  return {
    accessToken,
    phoneNumberId,
    templateNamespace: process.env.WHATSAPP_TEMPLATE_NAMESPACE,
    welcomeTemplate: process.env.WHATSAPP_WELCOME_TEMPLATE || "signal_welcome",
    signalTemplate: process.env.WHATSAPP_SIGNAL_TEMPLATE || "signal_update",
  };
}

async function postTemplateMessage(input: {
  to: string;
  templateName: string;
  bodyParameters?: string[];
}) {
  const config = getWhatsAppConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    return {
      ok: true,
      delivered: false,
      mode: "dry-run",
      error:
        "WhatsApp credentials are not configured yet. Message prepared but not sent.",
    } satisfies TemplateSendResult;
  }

  const endpoint = `https://graph.facebook.com/${graphVersion}/${config.phoneNumberId}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(input.to),
      type: "template",
      template: {
        name: input.templateName,
        language: {
          code: "en",
        },
        ...(config.templateNamespace
          ? { namespace: config.templateNamespace }
          : {}),
        ...(input.bodyParameters?.length
          ? {
              components: [
                {
                  type: "body",
                  parameters: input.bodyParameters.map(
                    (text) =>
                      ({
                        type: "text",
                        text,
                      }) satisfies WhatsAppTemplateParameter,
                  ),
                },
              ],
            }
          : {}),
      },
    }),
  });

  const payload = (await response.json()) as {
    messages?: { id?: string }[];
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      ok: false,
      delivered: false,
      mode: "live",
      error: payload.error?.message || "Failed to send WhatsApp template message.",
    } satisfies TemplateSendResult;
  }

  return {
    ok: true,
    delivered: true,
    mode: "live",
    messageId: payload.messages?.[0]?.id,
  } satisfies TemplateSendResult;
}

export async function sendWelcomeTemplate(input: {
  name: string;
  whatsapp: string;
  symbols: string[];
}) {
  const config = getWhatsAppConfig();
  return postTemplateMessage({
    to: input.whatsapp,
    templateName: config.welcomeTemplate,
    bodyParameters: [
      input.name,
      input.symbols.slice(0, 5).join(", "),
      "7 days",
    ],
  });
}

export async function sendSignalTemplate(input: {
  whatsapp: string;
  symbol: string;
  direction: string;
  entry: string;
  stopLoss: string;
  tp1: string;
}) {
  const config = getWhatsAppConfig();
  return postTemplateMessage({
    to: input.whatsapp,
    templateName: config.signalTemplate,
    bodyParameters: [
      input.symbol,
      input.direction,
      input.entry,
      input.stopLoss,
      input.tp1,
    ],
  });
}
