import type { Command } from "commander";
import { createClient, getGlobalOptions } from "./context.js";
import {
  formatMessageBody,
  handleCommandError,
  printJson,
} from "../output.js";

type BodyFormat = "text" | "html" | "raw";

function resolveBodyFormat(options: {
  text?: boolean;
  html?: boolean;
  raw?: boolean;
}): BodyFormat {
  const flags = [options.text, options.html, options.raw].filter(Boolean);
  if (flags.length > 1) {
    throw new Error("Use only one of --text, --html, or --raw");
  }

  if (options.html) {
    return "html";
  }
  if (options.raw) {
    return "raw";
  }
  return "text";
}

export function registerGetCommand(program: Command): void {
  program
    .command("get")
    .description("Get a full message from an inbox")
    .argument("<address>", "Inbox email address")
    .argument("<message-id>", "Message ID")
    .option("--text", "Print the plain-text body (default)")
    .option("--html", "Print the HTML body")
    .option("--raw", "Print the raw RFC 822 source")
    .action(async function (
      this: Command,
      address: string,
      messageId: string,
      options: { text?: boolean; html?: boolean; raw?: boolean },
    ) {
      try {
        const client = createClient(this);
        const message = await client.getMessage(address, messageId);
        const { json } = getGlobalOptions(this);

        if (json) {
          printJson(message);
          return;
        }

        const format = resolveBodyFormat(options);
        const body = formatMessageBody(message, format);
        process.stdout.write(body);
        if (body.length > 0 && !body.endsWith("\n")) {
          process.stdout.write("\n");
        }
      } catch (error) {
        handleCommandError(error);
      }
    });
}

export { resolveBodyFormat, type BodyFormat };
