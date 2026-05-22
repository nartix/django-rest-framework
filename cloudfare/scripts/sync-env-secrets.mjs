#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const cloudfareDir = resolve(repoRoot, "cloudfare");
const envFile = process.env.CLOUDFLARE_SECRETS_ENV_FILE
  ? resolve(process.env.CLOUDFLARE_SECRETS_ENV_FILE)
  : resolve(repoRoot, ".env");
const wranglerConfig = process.env.WRANGLER_CONFIG
  ? resolve(process.env.WRANGLER_CONFIG)
  : resolve(cloudfareDir, "wrangler.jsonc");
const cloudflareEnv = process.env.CLOUDFLARE_ENV?.trim();
const dryRun = process.env.DRY_RUN === "true";

const REQUIRED_SECRET_NAMES = [
  "SECRET_KEY",
  "pg_master_host",
  "pg_master_port",
  "pg_master_user",
  "pg_master_password",
  "pg_master_database",
];

function parseDotEnv(contents) {
  const values = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    ...options,
  });

  if (result.status !== 0) {
    const spawnError = result.error?.message;
    const signal = result.signal ? `signal ${result.signal}` : undefined;
    const exitCode =
      result.status === null || result.status === undefined
        ? undefined
        : `exit code ${result.status}`;
    const detail = [spawnError, signal, exitCode].filter(Boolean).join("; ");

    throw new Error(`${command} ${args.join(" ")} failed: ${detail || "unknown error"}`);
  }
}

function putWorkerSecret(name, value) {
  const envArgs = cloudflareEnv ? ["--env", cloudflareEnv] : [];
  const envLabel = cloudflareEnv ? ` to ${cloudflareEnv}` : "";

  if (dryRun) {
    console.log(`[dry-run] would sync ${name}${envLabel}`);
    return;
  }

  run(
    "npm",
    [
      "exec",
      "--",
      "wrangler",
      "secret",
      "put",
      name,
      "--config",
      wranglerConfig,
      ...envArgs,
    ],
    { cwd: cloudfareDir, input: value },
  );

  console.log(`Synced ${name}${envLabel}`);
}

const envValues = parseDotEnv(readFileSync(envFile, "utf8"));
const missing = REQUIRED_SECRET_NAMES.filter((name) => !envValues.get(name));

if (missing.length > 0) {
  throw new Error(`Missing required values in ${envFile}: ${missing.join(", ")}`);
}

for (const name of REQUIRED_SECRET_NAMES) {
  putWorkerSecret(name, envValues.get(name));
}
