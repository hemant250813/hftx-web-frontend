import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SubscriberRecord = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  selectedSymbols: string[];
  tradingStyle: string;
  preferredHorizon: string;
  notes: string;
  planStatus: "trial" | "active" | "paused" | "cancelled";
  trialStartsAt: string;
  trialEndsAt: string;
  createdAt: string;
  updatedAt: string;
  welcomeMessageStatus: "pending" | "sent" | "skipped" | "failed";
  lastSignalRunAt: string | null;
  lastSignalSummary: string | null;
};

type SubscriberStore = {
  subscribers: SubscriberRecord[];
};

const defaultStore: SubscriberStore = {
  subscribers: [],
};

const storePath =
  process.env.SIGNAL_SUBSCRIPTIONS_FILE ||
  path.join(process.cwd(), "data", "subscribers.json");

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

async function ensureStoreFile() {
  const directory = path.dirname(storePath);
  await mkdir(directory, { recursive: true });
}

async function readStore(): Promise<SubscriberStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as SubscriberStore;

    return {
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers : [],
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return defaultStore;
    }

    console.warn("Unable to read subscription store, using empty store.", error);
    return defaultStore;
  }
}

async function writeStore(store: SubscriberStore) {
  try {
    await ensureStoreFile();
    await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
    return true;
  } catch (error) {
    console.warn("Unable to write subscription store.", error);
    return false;
  }
}

function buildId(email: string, whatsapp: string) {
  const seed = `${email.toLowerCase()}-${normalizePhone(whatsapp)}`;
  return Buffer.from(seed).toString("base64url");
}

export async function upsertSubscriber(input: {
  name: string;
  email: string;
  whatsapp: string;
  selectedSymbols: string[];
  tradingStyle: string;
  preferredHorizon: string;
  notes: string;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const id = buildId(input.email, input.whatsapp);

  const existingIndex = store.subscribers.findIndex((item) => item.id === id);
  const existing = existingIndex >= 0 ? store.subscribers[existingIndex] : null;

  const record: SubscriberRecord = {
    id,
    name: input.name,
    email: input.email,
    whatsapp: input.whatsapp,
    selectedSymbols: input.selectedSymbols.slice(0, 5),
    tradingStyle: input.tradingStyle,
    preferredHorizon: input.preferredHorizon,
    notes: input.notes,
    planStatus: existing?.planStatus || "trial",
    trialStartsAt: existing?.trialStartsAt || now,
    trialEndsAt: existing?.trialEndsAt || trialEndsAt,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    welcomeMessageStatus: existing?.welcomeMessageStatus || "pending",
    lastSignalRunAt: existing?.lastSignalRunAt || null,
    lastSignalSummary: existing?.lastSignalSummary || null,
  };

  if (existingIndex >= 0) {
    store.subscribers[existingIndex] = record;
  } else {
    store.subscribers.push(record);
  }

  const persisted = await writeStore(store);

  return {
    subscriber: record,
    persisted,
  };
}

export async function listSubscribers() {
  const store = await readStore();
  return store.subscribers;
}

export async function listSignalEligibleSubscribers() {
  const subscribers = await listSubscribers();
  const now = Date.now();

  return subscribers.filter((subscriber) => {
    if (subscriber.planStatus === "paused" || subscriber.planStatus === "cancelled") {
      return false;
    }

    const trialEnd = new Date(subscriber.trialEndsAt).getTime();
    return Number.isFinite(trialEnd) ? trialEnd >= now : true;
  });
}

export async function updateSubscriberStatus(
  id: string,
  updates: Partial<
    Pick<
      SubscriberRecord,
      "welcomeMessageStatus" | "lastSignalRunAt" | "lastSignalSummary" | "planStatus"
    >
  >,
) {
  const store = await readStore();
  const index = store.subscribers.findIndex((item) => item.id === id);

  if (index < 0) {
    return false;
  }

  store.subscribers[index] = {
    ...store.subscribers[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return writeStore(store);
}
