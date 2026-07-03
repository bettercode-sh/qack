import type { Command } from "commander";
import { createClient, getGlobalOptions } from "./context.js";
import { handleCommandError, printJson, writeStdout } from "../output.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List messages in an inbox")
    .argument("<address>", "Inbox email address")
    .action(async function (this: Command, address: string) {
      try {
        const client = createClient(this);
        const messages = await client.listMessages(address);
        const { json } = getGlobalOptions(this);

        if (json) {
          printJson(messages);
          return;
        }

        for (const message of messages) {
          writeStdout(
            `${message.id}  ${message.from}  ${message.subject}  ${message.receivedAt}`,
          );
        }
      } catch (error) {
        handleCommandError(error);
      }
    });
}
