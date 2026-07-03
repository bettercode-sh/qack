import type { Message } from "@qack/shared";
import { ApiError } from "./api-client.js";

export interface GlobalOptions {
  apiUrl: string;
  json: boolean;
}

export function writeStdout(line: string): void {
  process.stdout.write(`${line}\n`);
}

export function writeStderr(line: string): void {
  process.stderr.write(`${line}\n`);
}

export function printJson(data: unknown): void {
  writeStdout(JSON.stringify(data));
}

export function formatMessageBody(
  message: Message,
  format: "text" | "html" | "raw",
): string {
  switch (format) {
    case "html":
      return message.html ?? "";
    case "raw":
      return message.raw;
    case "text":
      return message.text ?? "";
  }
}

export function exitWithError(message: string, code = 1): never {
  writeStderr(message);
  process.exit(code);
}

export function handleCommandError(error: unknown): never {
  if (error instanceof ApiError) {
    exitWithError(`${error.body.error.code}: ${error.body.error.message}`);
  }

  if (error instanceof Error) {
    exitWithError(error.message);
  }

  exitWithError("Unknown error");
}
