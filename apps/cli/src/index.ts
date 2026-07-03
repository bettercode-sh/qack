import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerCreateCommand } from "./commands/create.js";
import { registerDeleteCommand } from "./commands/delete.js";
import { registerGetCommand } from "./commands/get.js";
import { registerListCommand } from "./commands/list.js";
import { registerWaitCommand } from "./commands/wait.js";

const packageDir = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(packageDir, "..", "package.json"), "utf8"),
) as { version: string };

const program = new Command();

program
  .name("qack-mail")
  .description("Temporary email for CI/CD pipelines")
  .version(packageJson.version)
  .option(
    "--api-url <url>",
    "Qack API base URL",
    process.env.QACK_API_URL ?? "https://api.qack.dev",
  )
  .option("--json", "Output machine-readable JSON to stdout");

registerCreateCommand(program);
registerListCommand(program);
registerGetCommand(program);
registerWaitCommand(program);
registerDeleteCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
