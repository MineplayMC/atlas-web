import { LogType, LogLine, LogStyle } from "@/types/console";

// Strips ANSI escape sequences from a string, handling both complete sequences
// (with ESC character \x1b) and orphaned ones where the ESC character has been
// dropped during transport (e.g. "[0;39m" instead of "\x1b[0;39m").
export function stripAnsiCodes(str: string): string {
  // Strip complete ANSI escape sequences (ESC + [ + params + command)
  const withoutEsc = str.replace(/\x1b\[[\d;]*[A-Za-z]/g, "");
  // Strip orphaned ANSI SGR codes where ESC was dropped (e.g. "[0;39m", "[1;31m")
  return withoutEsc.replace(/\[[\d;]+m/g, "");
}

export const LOG_STYLES: Record<LogType, LogStyle> = {
  error: {
    type: "error",
    variant: "red",
    color: "bg-red-500/40",
  },
  warning: {
    type: "warning",
    variant: "orange",
    color: "bg-orange-500/40",
  },
  debug: {
    type: "debug",
    variant: "yellow",
    color: "bg-yellow-500/40",
  },
  success: {
    type: "success",
    variant: "green",
    color: "bg-green-500/40",
  },
  info: {
    type: "info",
    variant: "blue",
    color: "bg-blue-600/40",
  },
  status: {
    type: "status",
    variant: "purple",
    color: "bg-purple-500/40",
  },
} as const;

export function parseLog(
  logString: string,
  lastLogLine: LogLine | null
): LogLine | null {
  // Updated regex to handle optional colon after the bracket: [15:47:11 INFO]: message
  const logRegex = /^\[(\d{2}:\d{2}:\d{2})\s+(\w+)]:?\s*(.+)$/;
  const logLevelRegex = /^(\w+):\s*(.+)$/;

  let line = stripAnsiCodes(logString.trim());
  if (line === "") return null;

  // Remove leading colon and space if present
  if (line.startsWith(": ")) {
    line = line.substring(2);
  }

  const logLevelMatch = line.match(logLevelRegex);
  if (logLevelMatch) {
    const [, level, message] = logLevelMatch;
    const returnLevel = level.toLowerCase();

    return {
      rawTimestamp: null,
      timestamp: null,
      logType: returnLevel,
      message: message.trim(),
    };
  }

  const match = line.match(logRegex);

  if (!match) {
    if (lastLogLine?.logType === "WARN") lastLogLine.logType = "warning";

    return {
      rawTimestamp: lastLogLine?.rawTimestamp || null,
      timestamp: lastLogLine?.timestamp
        ? new Date(lastLogLine?.timestamp)
        : null,
      logType: lastLogLine?.logType || "info",
      message: line,
    };
  }

  const [, time, level, message] = match;

  let returnLevel = level;

  if (returnLevel === "WARN") returnLevel = "warning";

  return {
    rawTimestamp: `[${time} ${level}]`,
    timestamp: new Date(`2024-12-14T${time}Z`),
    logType: returnLevel,
    message: message.trim(),
  };
}

export const getLogType = (
  message: string,
  oldType?: string | null
): LogStyle => {
  // If explicitly set to "status", always use status style
  if (oldType === "status") {
    return LOG_STYLES.status;
  }
  
  const lowerMessage = message.toLowerCase();

  if (
    /(?:^|\s)(?:info|inf|information):?\s/i.test(lowerMessage) ||
    /\[(?:info|information)\]/i.test(lowerMessage) ||
    /\b(?:status|state|current|progress)\b:?\s/i.test(lowerMessage) ||
    /\b(?:processing|executing|performing)\b/i.test(lowerMessage) ||
    oldType?.toLowerCase() === "info"
  ) {
    return LOG_STYLES.info;
  }

  if (
    /(?:^|\s)(?:error|err):?\s/i.test(lowerMessage) ||
    /\b(?:exception|failed|failure)\b/i.test(lowerMessage) ||
    /(?:stack\s?trace):\s*$/i.test(lowerMessage) ||
    /^\s*at\s+[\w.]+\s*\(?.+:\d+:\d+\)?/.test(lowerMessage) ||
    /\b(?:uncaught|unhandled)\s+(?:exception|error)\b/i.test(lowerMessage) ||
    /Error:\s.*(?:in|at)\s+.*:\d+(?::\d+)?/.test(lowerMessage) ||
    /\b(?:errno|code):\s*(?:\d+|[A-Z_]+)\b/i.test(lowerMessage) ||
    /\[(?:error|err|fatal)\]/i.test(lowerMessage) ||
    /\b(?:crash|critical|fatal)\b/i.test(lowerMessage) ||
    /\b(?:fail(?:ed|ure)?|broken|dead)\b/i.test(lowerMessage) ||
    oldType?.toLowerCase() === "error"
  ) {
    return LOG_STYLES.error;
  }

  if (
    /(?:^|\s)(?:warning|warn):?\s/i.test(lowerMessage) ||
    /\[(?:warn(?:ing)?|attention)\]/i.test(lowerMessage) ||
    /(?:deprecated|obsolete)\s+(?:since|in|as\s+of)/i.test(lowerMessage) ||
    /\b(?:caution|attention|notice):\s/i.test(lowerMessage) ||
    /(?:might|may|could)\s+(?:not|cause|lead\s+to)/i.test(lowerMessage) ||
    /(?:!+\s*(?:warning|caution|attention)\s*!+)/i.test(lowerMessage) ||
    /\b(?:deprecated|obsolete)\b/i.test(lowerMessage) ||
    /\b(?:unstable|experimental)\b/i.test(lowerMessage) ||
    oldType?.toLowerCase() === "warning"
  ) {
    return LOG_STYLES.warning;
  }

  if (
    /(?:successfully|complete[d]?)\s+(?:initialized|started|completed|created|done|deployed)/i.test(
      lowerMessage
    ) ||
    /\[(?:success|ok|done)\]/i.test(lowerMessage) ||
    /(?:listening|running)\s+(?:on|at)\s+(?:port\s+)?\d+/i.test(lowerMessage) ||
    /(?:connected|established|ready)\s+(?:to|for|on)/i.test(lowerMessage) ||
    /\b(?:loaded|mounted|initialized)\s+successfully\b/i.test(lowerMessage) ||
    /✓|√|✅|\[ok\]|done!/i.test(lowerMessage) ||
    /\b(?:success(?:ful)?|completed|ready)\b/i.test(lowerMessage) ||
    /\b(?:started|starting|active)\b/i.test(lowerMessage) ||
    oldType?.toLowerCase() === "success"
  ) {
    return LOG_STYLES.success;
  }

  if (
    /(?:^|\s)(?:info|inf):?\s/i.test(lowerMessage) ||
    /\[(log|debug|trace|server|db|api|http|request|response)\]/i.test(
      lowerMessage
    ) ||
    /\b(?:debug)\b:?/i.test(lowerMessage) ||
    oldType?.toLowerCase() === "debug"
  ) {
    return LOG_STYLES.debug;
  }

  return LOG_STYLES.info;
};

export function parseLogs(logString: string): LogLine[] {
  const lines = logString.split("\n").filter(line => line.trim() !== "");
  const parsedLogs: LogLine[] = [];
  let lastLogLine: LogLine | null = null;

  for (const line of lines) {
    const parsed = parseLog(line, lastLogLine);
    if (parsed) {
      parsedLogs.push(parsed);
      lastLogLine = parsed;
    }
  }

  return parsedLogs;
}