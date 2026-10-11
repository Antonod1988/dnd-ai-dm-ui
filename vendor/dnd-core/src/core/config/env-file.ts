import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadLocalEnvFile(filePath = path.resolve(process.cwd(), ".env")): void {
  if (!existsSync(filePath)) {
    return;
  }
  const raw = readFileSync(filePath, "utf8");
  for (const rawLine of raw.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = normalized.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || process.env[key]) {
      continue;
    }
    process.env[key] = unquoteEnvValue(normalized.slice(separatorIndex + 1).trim());
  }
}

function unquoteEnvValue(value: string): string {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}
