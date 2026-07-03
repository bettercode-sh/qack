import type { Command } from "commander";
import { createClient, getGlobalOptions } from "./context.js";
import { resolveBodyFormat } from "./get.js";
import {
  exitWithError,
  formatMessageBody,
  handleCommandError,
  printJson,
} from "../output.js";

export function registerWaitCommand(program: Command): void {
  program
    .command("wait")
    .description("Wait for a new message to arrive in an inbox")
    .argument("<address>", "Inbox email address")
    .option("--timeout <seconds>", "Total wait time in seconds", "300")
    .option("--since <message-id>", "Only return messages newer than this ID or ISO timestamp")
    .option("--text", "Print the plain-text body (default)")
    .option("--html", "Print the HTML body")
    .option("--raw", "Print the raw RFC 822 source")
    .action(async function (
      this: Command,
      address: string,
      options: {
        timeout: string;
        since?: string;
        text?: boolean;
        html?: boolean;
        raw?: boolean;
      },
    ) {
      try {
        const client = createClient(this);
        const { json } = getGlobalOptions(this);
        const totalTimeoutSec = Number.parseInt(options.timeout, 10);

        if (!Number.isFinite(totalTimeoutSec) || totalTimeoutSec < 1) {
          throw new Error("--timeout must be a positive integer");
        }

        const deadline = Date.now() + totalTimeoutSec * 1000;
        const format = resolveBodyFormat(options);

        while (true) {
          const remainingMs = deadline - Date.now();
          if (remainingMs <= 0) {
            exitWithError(`Timed out after ${totalTimeoutSec}s waiting for a message`, 2);
          }

          const requestTimeoutSec = Math.min(Math.ceil(remainingMs / 1000), 30);
          const message = await client.waitForMessage(
            address,
            options.since,
            requestTimeoutSec,
          );

          if (message) {
            if (json) {
              printJson(message);
            } else {
              const body = formatMessageBody(message, format);
              process.stdout.write(body);
              if (body.length > 0 && !body.endsWith("\n")) {
                process.stdout.write("\n");
              }
            }
            return;
          }
        }
      } catch (error) {
        handleCommandError(error);
      }
    });
}
