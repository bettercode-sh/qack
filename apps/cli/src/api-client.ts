import type {
  ApiErrorBody,
  CreateInboxResponse,
  GetMessageResponse,
  ListMessagesResponse,
  Message,
} from "@qack/shared";

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body?.error?.code && body?.error?.message) {
      return new ApiError(response.status, body);
    }
  } catch {
    // fall through
  }

  return new ApiError(response.status, {
    error: {
      code: "HTTP_ERROR",
      message: response.statusText || `HTTP ${response.status}`,
    },
  });
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function encodeAddress(address: string): string {
  return encodeURIComponent(address.trim().toLowerCase());
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async createInbox(name?: string): Promise<CreateInboxResponse> {
    const response = await fetch(`${this.baseUrl}/v1/inboxes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(name ? { name } : {}),
    });

    return parseJsonResponse<CreateInboxResponse>(response);
  }

  async listMessages(address: string): Promise<ListMessagesResponse> {
    const response = await fetch(
      `${this.baseUrl}/v1/inboxes/${encodeAddress(address)}/messages`,
    );

    return parseJsonResponse<ListMessagesResponse>(response);
  }

  async getMessage(address: string, messageId: string): Promise<GetMessageResponse> {
    const response = await fetch(
      `${this.baseUrl}/v1/inboxes/${encodeAddress(address)}/messages/${encodeURIComponent(messageId)}`,
    );

    return parseJsonResponse<GetMessageResponse>(response);
  }

  async deleteInbox(address: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/inboxes/${encodeAddress(address)}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 204) {
      throw await parseErrorResponse(response);
    }
  }

  async waitForMessage(
    address: string,
    since: string | undefined,
    timeoutSec: number,
  ): Promise<Message | null> {
    const params = new URLSearchParams();
    if (since) {
      params.set("since", since);
    }
    params.set("timeout", String(timeoutSec));

    const response = await fetch(
      `${this.baseUrl}/v1/inboxes/${encodeAddress(address)}/messages/wait?${params}`,
    );

    return parseJsonResponse<Message | null>(response);
  }
}
