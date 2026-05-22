import { Container, getRandom } from "@cloudflare/containers";
import { env as workerEnv } from "cloudflare:workers";

const DEFAULT_INSTANCE_COUNT = 1;

const STATIC_CONTAINER_ENV = {
  DJANGO_SETTINGS_MODULE: "portfolio.settings",
  PYTHONDONTWRITEBYTECODE: "1",
  PYTHONUNBUFFERED: "1",
};

const CONTAINER_SECRET_NAMES = [
  "SECRET_KEY",
  "pg_master_host",
  "pg_master_port",
  "pg_master_user",
  "pg_master_password",
  "pg_master_database",
] as const;

type ContainerSecretName = (typeof CONTAINER_SECRET_NAMES)[number];
type SecretBindings = Partial<Record<ContainerSecretName, string>>;

export interface Env extends SecretBindings {
  DJANGO_REST_FRAMEWORK_API: DurableObjectNamespace<DjangoRestFrameworkAPI>;
  CONTAINER_INSTANCE_COUNT?: string;
}

function buildContainerEnv(envSource: SecretBindings): Record<string, string> {
  const containerEnv: Record<string, string> = { ...STATIC_CONTAINER_ENV };

  for (const name of CONTAINER_SECRET_NAMES) {
    const value = envSource[name];

    if (typeof value === "string" && value.length > 0) {
      containerEnv[name] = value;
    }
  }

  return containerEnv;
}

function missingRequiredSecrets(envSource: SecretBindings): ContainerSecretName[] {
  return CONTAINER_SECRET_NAMES.filter((name) => !envSource[name]);
}

function getContainerInstanceCount(env: Env): number {
  const configuredCount = Number(env.CONTAINER_INSTANCE_COUNT);

  if (Number.isInteger(configuredCount) && configuredCount > 0) {
    return configuredCount;
  }

  return DEFAULT_INSTANCE_COUNT;
}

export class DjangoRestFrameworkAPI extends Container {
  defaultPort = 8000;
  requiredPorts = [8000];
  sleepAfter = "5m";
  envVars = buildContainerEnv(workerEnv as unknown as SecretBindings);

  override onStart() {
    console.log("DjangoRestFrameworkAPI container started");
  }

  override onStop({ exitCode, reason }: { exitCode?: number; reason?: string }) {
    console.log("DjangoRestFrameworkAPI container stopped", { exitCode, reason });
  }

  override onError(error: unknown) {
    console.error("DjangoRestFrameworkAPI container error", error);
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const missing = missingRequiredSecrets(env);

    if (missing.length > 0) {
      return new Response(`Missing Cloudflare Worker secrets: ${missing.join(", ")}`, {
        status: 500,
      });
    }

    const container = await getRandom(
      env.DJANGO_REST_FRAMEWORK_API,
      getContainerInstanceCount(env),
    );

    return container.fetch(request);
  },
};
