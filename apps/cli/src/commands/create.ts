import type { Command } from "commander";
import { createClient, getGlobalOptions } from "./context.js";
import { handleCommandError, printJson, writeStdout } from "../output.js";

export function registerCreateCommand(program: Command): void {
  program
    .command("create")
    .description("Create a temporary inbox")
    .option("--name <name>", "Custom local-part for the inbox address")
    .action(async function (this: Command, options: { name?: string }) {
      try {
        const client = createClient(this);
        const inbox = await client.createInbox(options.name);
        const { json } = getGlobalOptions(this);

        if (json) {
          printJson(inbox);
        } else {
          writeStdout(inbox.address);
        }
      } catch (error) {
        handleCommandError(error);
      }
    });
}
