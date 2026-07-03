import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { simpleParser, type ParsedMail } from "mailparser";
import { SMTPServer, type SMTPServerAddress, type SMTPServerSession } from "smtp-server";
import type { Message } from "@qack/shared";
import type { ServerConfig } from "./config.js";
import type { Store } from "./store.js";

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function addressDomain(address: string): string {
  const at = address.lastIndexOf("@");
  return at === -1 ? "" : address.slice(at + 1);
}

function addressLocalPart(address: string): string {
  const at = address.lastIndexOf("@");
  return at === -1 ? address : address.slice(0, at);
}

function formatAddressField(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((entry) => formatAddressField(entry)).filter(Boolean).join(", ");
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text?: string }).text ?? "");
  }
  return String(value);
}

function headersToRecord(
  headers: Map<string, unknown> | undefined,
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  if (!headers) return result;

  for (const [key, value] of headers.entries()) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      result[key] = value.map((entry) => String(entry));
    } else {
      result[key] = String(value);
    }
  }

  return result;
}

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createSmtpServer(config: ServerConfig, store: Store): SMTPServer {
  return new SMTPServer({
    disabledCommands: ["AUTH"],
    authOptional: true,
    secure: false,
    size: config.maxMessageBytes,
    onRcptTo(
      address: SMTPServerAddress,
      _session: SMTPServerSession,
      callback: (err?: Error | null) => void,
    ) {
      const recipient = normalizeAddress(address.address);
      const domain = addressDomain(recipient);
      const localPart = addressLocalPart(recipient);
      const fullAddress = `${localPart}@${domain}`;

      if (domain !== config.mailDomain.toLowerCase()) {
        const error = new Error(`Relay not permitted for domain: ${domain}`) as Error & {
          responseCode?: number;
        };
        error.responseCode = 550;
        console.error(`[smtp] rejected rcpt ${recipient}: wrong domain`);
        callback(error);
        return;
      }

      if (!store.inboxExists(fullAddress)) {
        const error = new Error(`Mailbox unavailable: ${recipient}`) as Error & {
          responseCode?: number;
        };
        error.responseCode = 550;
        console.error(`[smtp] rejected rcpt ${recipient}: unknown inbox`);
        callback(error);
        return;
      }

      callback();
    },
    onData(
      stream: NodeJS.ReadableStream & { sizeExceeded?: boolean },
      session: SMTPServerSession,
      callback: (err?: Error | null) => void,
    ) {
      void (async () => {
        try {
          const readable = stream as Readable;
          const rawBuffer = await readStreamToBuffer(readable);

          if (stream.sizeExceeded) {
            const error = new Error("Message size exceeds fixed maximum message size") as Error & {
              responseCode?: number;
            };
            error.responseCode = 552;
            console.error("[smtp] rejected message: size exceeded");
            callback(error);
            return;
          }

          const parsed: ParsedMail = await simpleParser(rawBuffer);

          const recipients = session.envelope.rcptTo.map((entry) =>
            normalizeAddress(entry.address),
          );
          const from = formatAddressField(parsed.from);
          const subject = parsed.subject ?? "";
          const receivedAt = new Date().toISOString();
          const messageId = randomUUID();

          const message: Message = {
            id: messageId,
            from,
            subject,
            receivedAt,
            to: recipients,
            text: parsed.text ?? undefined,
            html: parsed.html === false ? undefined : parsed.html,
            headers: headersToRecord(parsed.headers),
            raw: rawBuffer.toString("utf8"),
          };

          for (const recipient of recipients) {
            store.addMessage(recipient, message);
          }

          console.error(
            `[smtp] accepted message to=${recipients.join(",")} from=${from} subject=${subject}`,
          );
          callback();
        } catch (error) {
          console.error("[smtp] failed to parse message:", error);
          callback(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    },
  });
}
