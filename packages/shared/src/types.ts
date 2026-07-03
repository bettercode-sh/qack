/** Core domain types shared between server and CLI. */

export interface Inbox {
  address: string;
  createdAt: string;
  expiresAt: string;
}

export interface MessageSummary {
  id: string;
  from: string;
  subject: string;
  receivedAt: string;
}

export interface Message extends MessageSummary {
  to: string[];
  text?: string;
  html?: string;
  headers: Record<string, string | string[]>;
  raw: string;
}

/** API request bodies */

export interface CreateInboxRequest {
  name?: string;
  /** Generate a human-looking local-part (e.g. jane.smith42) instead of random chars. */
  realistic?: boolean;
}

/** API query parameters */

export interface WaitForMessageQuery {
  since?: string;
  timeout?: number;
}

/** Standard error envelope returned by the server API */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/** Typed API responses (success bodies) */

export type CreateInboxResponse = Inbox;

export type ListMessagesResponse = MessageSummary[];

export type GetMessageResponse = Message;

export type WaitForMessageResponse = Message | null;
