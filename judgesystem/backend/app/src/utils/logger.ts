/**
 * Lightweight structured logger.
 * Outputs JSON-formatted log lines for production observability.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(formatEntry("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(formatEntry("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    console.error(formatEntry("error", message, meta));
  },
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatEntry("debug", message, meta));
    }
  },
};
