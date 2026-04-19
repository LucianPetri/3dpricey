# 3DPricey Deployment Setup Guide (Docker Stack)

This guide explains how to deploy 3DPricey with 3 environments (dev, staging, prod) on the same Docker host in the GitLab stack.

## Prerequisites

- Docker and Docker Compose installed on the same host as GitLab/Runner
- All services on the same Docker network
- Git access to the repository
- SSH keypair for CI/CD authentication

## Architecture

All 3 environments run on the same Docker host on a shared network:

```
GitLab Runner
  ↓ SSH port 22
Deployment Host (SSH)
  → /opt/3dpricey-dev
  → /opt/3dpricey-staging
  → /opt/3dpricey-prod
```

Each environment runs its own:
- PostgreSQL, Redis, MinIO
- Backend API, Frontend
- Newt service for Pangolin

## Step 1: Generate SSH Keypair for Deployment

On your **local machine**:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/3dpricey_deploy_key -N ""
```

Creates:
- `~/.ssh/3dpricey_deploy_key` (private key)
- `~/.ssh/3dpricey_deploy_key.pub` (public key)

## Step 2: Prepare Directories on Docker Host

On the **deployment host** (same machine where GitLab/Runner run):

```bash
# Create directories for each environment
for env in dev staging prod; do
  mkdir -p /opt/3dpricey-$env
  chmod 755 /opt/3dpricey-$env
done
```

## Step 3: Prepare the deploy env template

```bash
cp deploy/.env.example deploy/.env
```

Fill in `deploy/.env` before running Docker Compose. If your deployment platform imports
`deploy/docker-compose.deploy.yml` directly from the repository, this `deploy/.env` file is the
default companion file it should read.

## Step 4: Create per-environment env files when needed

For manual multi-environment deployments, copy the template for each target environment:

```bash
cp deploy/.env.example deploy/.env.dev
cp deploy/.env.example deploy/.env.staging
cp deploy/.env.example deploy/.env.prod
```

Example `deploy/.env.dev`:

```bash
APP_ENV=dev
GHCR_OWNER=your_github_username_or_org
IMAGE_TAG=v2.0.0
DB_USER=postgres
DB_PASSWORD=dev_secure_password_here
# Use at least 32 random bytes for production JWT secrets.
JWT_SECRET=dev_jwt_secret_here_change_me
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=3dpricey
PANGOLIN_ENDPOINT=https://app.pangolin.net
NEWT_ID=dev_newt_id_from_pangolin
NEWT_SECRET=dev_newt_secret_from_pangolin
PANGOLIN_BLUEPRINT_FILE=/blueprints/3dpricey-dev.yml
```

Repeat for staging and prod, updating `APP_ENV`, credentials, Newt values, and
`PANGOLIN_BLUEPRINT_FILE` for each environment.

## Step 5: Start All 3 Environments

```bash
# Dev
cd /opt/3dpricey-dev
docker compose --env-file deploy/.env.dev -f deploy/docker-compose.deploy.yml up -d

# Staging
cd /opt/3dpricey-staging
docker compose --env-file deploy/.env.staging -f deploy/docker-compose.deploy.yml up -d

# Prod
cd /opt/3dpricey-prod
docker compose --env-file deploy/.env.prod -f deploy/docker-compose.deploy.yml up -d
```

Verify all containers are running:

```bash
docker ps | grep 3dpricey
```

Should see 18 containers total (6 per environment × 3 envs).

## Step 6: Configure GitLab CI/CD Variables

In **GitLab → Project → Settings → CI/CD → Variables**, add these **protected variables**:

### Global Variables
```
SSH_PRIVATE_KEY_B64 = (base64 of ~/.ssh/3dpricey_deploy_key)
SSH_USER = deploy
SSH_PORT = 22
```

### Dev Environment
```
DEV_DB_USER = postgres
DEV_DB_PASSWORD = dev_secure_password_here
DEV_JWT_SECRET = dev_jwt_secret_min_32_chars_long_here_12345
DEV_MINIO_ACCESS_KEY = minioadmin
DEV_MINIO_SECRET_KEY = minioadmin
DEV_MINIO_BUCKET = 3dpricey
DEV_MINIO_PUBLIC_URL = https://dev.printel.ro/storage
DEV_PANGOLIN_ENDPOINT = https://app.pangolin.net
DEV_NEWT_ID = dev_newt_id_from_pangolin
DEV_NEWT_SECRET = dev_newt_secret_from_pangolin
```

### Staging & Prod
(Same as dev, replace `DEV_` with `STAGING_` or `PROD_`, update URLs)

## Step 7: Test Deployment

Commit and push to test the pipeline:

```bash
git commit --allow-empty -m "test: trigger CI/CD deployment"
git push origin dev
```

Monitor in **GitLab → CI/CD → Pipelines**.

Once dev deploys successfully:

```bash
git push origin staging
git push origin main
```

## Troubleshooting

### SSH Connection Refused

SSH into the host and check:

```bash
ss -tlnp | grep 22  # Should be listening
```

### Git Clone Fails

The deployment host needs internet access to clone from git.xaiko.cloud. Check:

```bash
ping git.xaiko.cloud
```

### Docker Compose Up Fails

Check if all images can be pulled:

```bash
cd /opt/3dpricey-dev
docker compose --env-file deploy/.env.dev -f deploy/docker-compose.deploy.yml pull
```

### Volumes/Permissions Issues

Ensure directories are writable:

```bash
ls -la /opt/3dpricey-*/
# Should see drwxr-xr-x (755)

docker exec 3dpricey-dev-postgres ls -la /var/lib/postgresql/data | head
# Should show postgres can write
```

## Accessing Services

Once deployed:

- **Dev Frontend:** https://dev.printel.ro (via Newt/Pangolin)
- **Dev API:** https://dev.printel.ro/api
- **Staging:** https://staging.printel.ro
- **Prod:** https://printel.ro

Check container status:

```bash
docker inspect 3dpricey-dev-postgres
docker logs 3dpricey-dev-backend
```

## Cleanup

To stop all environments:

```bash
for env in dev staging prod; do
  cd /opt/3dpricey-$env
  docker compose --env-file deploy/.env.$env -f deploy/docker-compose.deploy.yml down
done
```

To remove volumes (WARNING: deletes data):

```bash
for env in dev staging prod; do
  cd /opt/3dpricey-$env
  docker compose --env-file deploy/.env.$env -f deploy/docker-compose.deploy.yml down -v
done
```
