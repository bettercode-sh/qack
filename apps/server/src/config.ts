export interface ServerConfig {
  port: number;
  smtpPort: number;
  mailDomain: string;
  inboxTtlMinutes: number;
  maxMessageBytes: number;
  rateLimitCreatePerMinute: number;
  rateLimitApiPerMinute: number;
  maxInboxes: number;
  maxMessagesPerInbox: number;
  maxTotalMessageBytes: number;
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid ${name}: expected integer, got "${raw}"`);
  }
  return value;
}

export function loadConfig(): ServerConfig {
  return {
    port: readInt("PORT", 8080),
    smtpPort: readInt("SMTP_PORT", 2525),
    mailDomain: process.env.MAIL_DOMAIN ?? "qack.dev",
    inboxTtlMinutes: readInt("INBOX_TTL_MINUTES", 60),
    maxMessageBytes: readInt("MAX_MESSAGE_BYTES", 5_242_880),
    rateLimitCreatePerMinute: readInt("RATE_LIMIT_CREATE_PER_MINUTE", 10),
    rateLimitApiPerMinute: readInt("RATE_LIMIT_API_PER_MINUTE", 120),
    maxInboxes: readInt("MAX_INBOXES", 10_000),
    maxMessagesPerInbox: readInt("MAX_MESSAGES_PER_INBOX", 50),
    maxTotalMessageBytes: readInt("MAX_TOTAL_MESSAGE_BYTES", 268_435_456),
  };
}
