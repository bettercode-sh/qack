import type { Command } from "commander";
import { ApiClient } from "../api-client.js";
import type { GlobalOptions } from "../output.js";

export type { GlobalOptions };

const DEFAULT_API_URL = "https://api.qack.dev";

export function getGlobalOptions(command: Command): GlobalOptions {
  const opts = command.optsWithGlobals();
  return {
    apiUrl: (opts.apiUrl as string | undefined) ?? process.env.QACK_API_URL ?? DEFAULT_API_URL,
    json: Boolean(opts.json),
  };
}

export function createClient(command: Command): ApiClient {
  const { apiUrl } = getGlobalOptions(command);
  return new ApiClient(apiUrl.replace(/\/$/, ""));
}
