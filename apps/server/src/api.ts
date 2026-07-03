import { Hono } from "hono";
import type {
  CreateInboxRequest,
  CreateInboxResponse,
  GetMessageResponse,
  ListMessagesResponse,
  Message,
  WaitForMessageResponse,
} from "@qack/shared";
import { Store, StoreError } from "./store.js";

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function decodeAddressParam(address: string): string {
  try {
    return decodeURIComponent(address).trim().toLowerCase();
  } catch {
    return address.trim().toLowerCase();
  }
}

export function createApiApp(store: Store): Hono {
  const app = new Hono();

  app.get("/healthz", (c) => c.text("ok", 200));

  app.post("/v1/inboxes", async (c) => {
    let body: CreateInboxRequest = {};
    const contentType = c.req.header("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        body = (await c.req.json()) as CreateInboxRequest;
      } catch {
        return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
      }
    }

    try {
      const inbox: CreateInboxResponse = store.createInbox({
        name: body.name,
        realistic: body.realistic,
      });
      return jsonResponse(inbox, 201);
    } catch (error) {
      if (error instanceof StoreError) {
        if (error.code === "CONFLICT") {
          return errorResponse(error.code, error.message, 409);
        }
        if (error.code === "INVALID_NAME") {
          return errorResponse(error.code, error.message, 422);
        }
      }
      throw error;
    }
  });

  app.get("/v1/inboxes/:address/messages/wait", async (c) => {
    const address = decodeAddressParam(c.req.param("address"));
    const since = c.req.query("since");
    const timeoutSec = Math.min(
      Math.max(Number.parseInt(c.req.query("timeout") ?? "30", 10) || 30, 1),
      30,
    );

    try {
      const message: WaitForMessageResponse = await store.waitForMessage(
        address,
        since,
        timeoutSec * 1000,
      );

      if (!message) {
        return c.body(null, 204);
      }

      return jsonResponse<Message>(message);
    } catch (error) {
      if (error instanceof StoreError && error.code === "NOT_FOUND") {
        return errorResponse(error.code, error.message, 404);
      }
      throw error;
    }
  });

  app.get("/v1/inboxes/:address/messages/:id", (c) => {
    const address = decodeAddressParam(c.req.param("address"));
    const id = c.req.param("id");

    const message: GetMessageResponse | null = store.getMessage(address, id);
    if (!message) {
      if (!store.getInbox(address)) {
        return errorResponse("NOT_FOUND", `Inbox not found: ${address}`, 404);
      }
      return errorResponse("NOT_FOUND", `Message not found: ${id}`, 404);
    }

    return jsonResponse(message);
  });

  app.get("/v1/inboxes/:address/messages", (c) => {
    const address = decodeAddressParam(c.req.param("address"));

    try {
      const messages: ListMessagesResponse = store.listMessages(address);
      return jsonResponse(messages);
    } catch (error) {
      if (error instanceof StoreError && error.code === "NOT_FOUND") {
        return errorResponse(error.code, error.message, 404);
      }
      throw error;
    }
  });

  app.delete("/v1/inboxes/:address", (c) => {
    const address = decodeAddressParam(c.req.param("address"));

    if (!store.deleteInbox(address)) {
      return errorResponse("NOT_FOUND", `Inbox not found: ${address}`, 404);
    }

    return c.body(null, 204);
  });

  return app;
}
