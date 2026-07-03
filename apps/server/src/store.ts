import { EventEmitter } from "node:events";
import { randomBytes } from "node:crypto";
import type { Inbox, Message, MessageSummary } from "@qack/shared";
import type { ServerConfig } from "./config.js";

const CUSTOM_NAME_RE = /^[a-z0-9-]{1,64}$/;
const LOCAL_PART_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export class StoreError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

interface InboxRecord {
  address: string;
  createdAt: Date;
  expiresAt: Date;
  messages: Message[];
}

function toInbox(record: InboxRecord): Inbox {
  return {
    address: record.address,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  };
}

function toSummary(message: Message): MessageSummary {
  return {
    id: message.id,
    from: message.from,
    subject: message.subject,
    receivedAt: message.receivedAt,
  };
}

function generateLocalPart(): string {
  const bytes = randomBytes(10);
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += LOCAL_PART_CHARS[bytes[i]! % LOCAL_PART_CHARS.length];
  }
  return result;
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function isIsoTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

export class Store {
  private readonly inboxes = new Map<string, InboxRecord>();
  private readonly events = new EventEmitter();
  private readonly sweeper: NodeJS.Timeout;

  constructor(private readonly config: ServerConfig) {
    this.events.setMaxListeners(0);
    this.sweeper = setInterval(() => this.sweepExpired(), 60_000);
    this.sweeper.unref();
  }

  stop(): void {
    clearInterval(this.sweeper);
    this.events.removeAllListeners();
  }

  createInbox(name?: string): Inbox {
    const localPart = name ? this.validateCustomName(name) : generateLocalPart();
    const address = `${localPart}@${this.config.mailDomain}`;

    if (this.inboxes.has(address)) {
      throw new StoreError("CONFLICT", `Inbox already exists: ${address}`);
    }

    const now = new Date();
    const record: InboxRecord = {
      address,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.inboxTtlMinutes * 60_000),
      messages: [],
    };

    this.inboxes.set(address, record);
    return toInbox(record);
  }

  getInbox(address: string): Inbox | null {
    const record = this.getLiveRecord(address);
    return record ? toInbox(record) : null;
  }

  deleteInbox(address: string): boolean {
    const normalized = normalizeAddress(address);
    return this.inboxes.delete(normalized);
  }

  addMessage(address: string, message: Message): void {
    const record = this.getLiveRecord(address);
    if (!record) {
      throw new StoreError("NOT_FOUND", `Inbox not found: ${address}`);
    }

    record.messages.push(message);
    this.events.emit(normalizeAddress(address), message);
  }

  listMessages(address: string): MessageSummary[] {
    const record = this.getLiveRecord(address);
    if (!record) {
      throw new StoreError("NOT_FOUND", `Inbox not found: ${address}`);
    }

    return record.messages.map(toSummary);
  }

  getMessage(address: string, id: string): Message | null {
    const record = this.getLiveRecord(address);
    if (!record) {
      return null;
    }

    return record.messages.find((message) => message.id === id) ?? null;
  }

  inboxExists(address: string): boolean {
    return this.getLiveRecord(address) !== null;
  }

  waitForMessage(
    address: string,
    since: string | undefined,
    timeoutMs: number,
  ): Promise<Message | null> {
    const normalized = normalizeAddress(address);
    const record = this.getLiveRecord(normalized);
    if (!record) {
      throw new StoreError("NOT_FOUND", `Inbox not found: ${address}`);
    }

    const existing = this.findMessageAfterSince(record.messages, since);
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = (message: Message | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.events.off(normalized, onMessage);
        resolve(message);
      };

      const onMessage = (message: Message) => {
        if (!since) {
          finish(message);
          return;
        }
        if (this.isMessageAfterSince(message, since, record.messages)) {
          finish(message);
        }
      };

      const timer = setTimeout(() => finish(null), timeoutMs);
      timer.unref?.();

      this.events.on(normalized, onMessage);
    });
  }

  private validateCustomName(name: string): string {
    const normalized = name.trim().toLowerCase();
    if (!CUSTOM_NAME_RE.test(normalized)) {
      throw new StoreError(
        "INVALID_NAME",
        "Name must be 1-64 characters and contain only lowercase letters, numbers, and hyphens",
      );
    }
    return normalized;
  }

  private getLiveRecord(address: string): InboxRecord | null {
    const normalized = normalizeAddress(address);
    const record = this.inboxes.get(normalized);
    if (!record) {
      return null;
    }

    if (record.expiresAt <= new Date()) {
      this.inboxes.delete(normalized);
      return null;
    }

    return record;
  }

  private sweepExpired(): void {
    const now = new Date();
    for (const [address, record] of this.inboxes) {
      if (record.expiresAt <= now) {
        this.inboxes.delete(address);
        this.events.removeAllListeners(address);
      }
    }
  }

  private findMessageAfterSince(
    messages: Message[],
    since: string | undefined,
  ): Message | null {
    for (const message of messages) {
      if (this.isMessageAfterSince(message, since, messages)) {
        return message;
      }
    }
    return null;
  }

  private isMessageAfterSince(
    message: Message,
    since: string | undefined,
    messages: Message[],
  ): boolean {
    if (!since) {
      return false;
    }

    if (isIsoTimestamp(since)) {
      return message.receivedAt > since;
    }

    const sinceMessage = messages.find((entry) => entry.id === since);
    if (!sinceMessage) {
      return true;
    }

    return message.receivedAt > sinceMessage.receivedAt;
  }
}
