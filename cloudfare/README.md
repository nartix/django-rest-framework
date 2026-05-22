# Cloudflare Containers Deployment

This directory contains the Cloudflare-only deployment surface for the Django Rest Framework API. The root Docker deployment remains unchanged for local and future Docker/ECR use.

- `wrangler.jsonc` defines production and staging Worker environments, the Container image, the Durable Object binding, and the production custom domain.
- `src/index.ts` routes Worker requests into the Django/Gunicorn container on port `8000` and injects Worker secrets as container environment variables.
- `Dockerfile` builds a Cloudflare-specific Django container from the repository root context.
- `package.json` keeps Wrangler commands scoped to this directory.
- `scripts/sync-env-secrets.mjs` syncs PostgreSQL values from the repo `.env` file into Cloudflare Worker secrets.

The directory is named `cloudfare` to match the requested project layout.

The existing Docker Compose and ECR deployment files are intentionally left untouched. They can still be used for local or future Docker deployment.

Copy `../.env.example` to `../.env` and fill in the PostgreSQL values before running the secret sync commands.

## Implementation Plan

1. Keep the existing root deployment path in place: `Dockerfile.prod`, `docker-compose.yml`, and `.github/workflows/build-deploy-ecr.yml` continue to serve Docker/ECR usage.
2. Deploy Cloudflare as an alternate path from this directory with Workers + Containers.
3. Use staging first through `workers.dev`, then production through the custom domain.
4. Provide database settings to Cloudflare as Worker secrets so the container receives the same environment variable names the Django settings already use.

## Quick Start

Install the isolated Cloudflare dependencies once:

```bash
cd cloudfare
npm install --no-package-lock
```

## Staging

The staging environment deploys to `workers.dev`, not to `django-rest-framework.ferozfaiz.com`, so it is safe to test before production.

```bash
cd cloudfare
npm run secrets:sync:staging
npm run deploy:staging
```

The staging URL will look like:

```text
https://django-rest-framework-worker-staging.<your-workers-subdomain>.workers.dev
```

## Production

Production disables `workers.dev` and serves the API from the custom domain `django-rest-framework.ferozfaiz.com`.

```bash
cd cloudfare
npm run secrets:sync:production
npm run deploy:production
```

## Worker Secrets

The Django container needs the same PostgreSQL values used by the existing Docker deployment plus Django's `SECRET_KEY`. The sync script reads those values from the repo `.env` file and uploads them to the selected Cloudflare Worker environment.

Synced secret names:

- `SECRET_KEY`
- `pg_master_host`
- `pg_master_port`
- `pg_master_user`
- `pg_master_password`
- `pg_master_database`

Sync staging secrets:

```bash
cd cloudfare
npm run secrets:sync:staging
```

Sync production secrets:

```bash
cd cloudfare
npm run secrets:sync:production
```

To read a different env file, set `CLOUDFLARE_SECRETS_ENV_FILE`:

```bash
CLOUDFLARE_SECRETS_ENV_FILE=/path/to/.env.production npm run secrets:sync:production
```

To preview what would be synced without writing secrets:

```bash
DRY_RUN=true npm run secrets:sync:staging
```

You can still set secrets manually if needed:

```bash
cd cloudfare
npm exec -- wrangler secret put SECRET_KEY --config wrangler.jsonc
npm exec -- wrangler secret put pg_master_host --config wrangler.jsonc
npm exec -- wrangler secret put pg_master_port --config wrangler.jsonc
npm exec -- wrangler secret put pg_master_user --config wrangler.jsonc
npm exec -- wrangler secret put pg_master_password --config wrangler.jsonc
npm exec -- wrangler secret put pg_master_database --config wrangler.jsonc
```

For staging, add `--env staging` to each `wrangler secret put` command.

## Useful Commands

```bash
npm run dev
npm run deploy:staging
npm run deploy:production
npm run containers:list
npm run containers:images
npm run types
```

Run `npm run types` again after changing `wrangler.jsonc`.

## Required Cloudflare Credentials

Set these environment variables locally or as CI secrets before deploying:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The API token needs permissions to deploy Workers, Containers, Durable Objects, `workers.dev`, and the `django-rest-framework.ferozfaiz.com` Worker custom domain.

## Runtime Environment

The configured PostgreSQL host must be reachable from Cloudflare Containers. A private-only database endpoint will need an exposed endpoint, tunnel, or another Cloudflare-reachable database option before this deployment can serve requests successfully.

The Django container listens on port `8000` with Gunicorn, matching the current Docker deployment.

## DNS

`wrangler.jsonc` attaches the production Worker as a custom domain at `django-rest-framework.ferozfaiz.com`. The hostname must be in a Cloudflare-managed zone and cannot already have a conflicting DNS record.
