import type { Command } from "commander";
import { createClient } from "./context.js";
import { handleCommandError, writeStderr } from "../output.js";

export function registerDeleteCommand(program: Command): void {
  program
    .command("delete")
    .description("Delete an inbox and all its messages")
    .argument("<address>", "Inbox email address")
    .action(async function (this: Command, address: string) {
      try {
        const client = createClient(this);
        await client.deleteInbox(address);
        writeStderr(`Deleted inbox ${address}`);
      } catch (error) {
        handleCommandError(error);
      }
    });
}
