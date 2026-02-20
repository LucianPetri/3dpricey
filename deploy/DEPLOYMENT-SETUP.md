# 3DPricey Deployment Setup Guide

This guide explains how to set up your deployment environment with SSH access for GitLab CI/CD.

## Prerequisites

- Docker and Docker Compose installed on deployment server
- Git access to the repository
- SSH keypair for CI/CD authentication

## Step 1: Generate SSH Keypair for Deployment

On your **local machine**, generate a keypair for CI/CD deployments:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/3dpricey_deploy_key -N ""
```

This creates:
- `~/.ssh/3dpricey_deploy_key` (private key - for GitLab CI/CD)
- `~/.ssh/3dpricey_deploy_key.pub` (public key - for server)

## Step 2: Prepare Authorized Keys on Deployment Server

On your **deployment server**, create the SSH authorized_keys file:

```bash
mkdir -p /opt/3dpricey
cat ~/.ssh/3dpricey_deploy_key.pub >> /opt/3dpricey/ssh_authorized_keys
chmod 600 /opt/3dpricey/ssh_authorized_keys
chmod 700 /opt/3dpricey
```

## Step 3: Start Services with SSH Access

On your **deployment server**, run docker-compose:

```bash
cd /opt/3dpricey
export APP_ENV=prod  # or dev, staging
export DB_USER=postgres
export DB_PASSWORD=your_secure_password
# ... set all env vars from .env file ...

docker-compose --env-file .env.prod -f docker-compose.deploy.yml up -d ssh
```

The SSH service will be available on port 2222.

## Step 4: Configure GitLab CI/CD Variables

In **GitLab → Project → Settings → CI/CD → Variables**, add:

```
SSH_PRIVATE_KEY = (content of ~/.ssh/3dpricey_deploy_key)
PROD_HOST = your-prod-server.com
SSH_USER = deploy
```

For each environment (dev, staging, prod), also add:

```
DEV_HOST = dev-server-hostname
DEV_DB_USER = postgres
DEV_DB_PASSWORD = secure_password
DEV_JWT_SECRET = (min 32 random chars)
DEV_MINIO_ACCESS_KEY = minioadmin
DEV_MINIO_SECRET_KEY = minioadmin
DEV_MINIO_BUCKET = 3dpricey
DEV_MINIO_PUBLIC_URL = https://dev.printel.ro/storage
DEV_PANGOLIN_ENDPOINT = https://app.pangolin.net
DEV_NEWT_ID = your-newt-id
DEV_NEWT_SECRET = your-newt-secret

# Repeat for STAGING_* and PROD_*
```

## Step 5: Test SSH Connection

From GitLab runner, verify SSH works:

```bash
ssh -p 2222 -i ~/.ssh/3dpricey_deploy_key deploy@DEPLOY_HOST "echo 'SSH works!'"
```

## Step 6: Trigger Deployment

Push to your branch to trigger CI/CD:

```bash
git commit --allow-empty -m "Trigger CI/CD deployment"
git push origin main
```

Monitor deployment in GitLab → CI/CD → Pipelines.

## SSH Service Details

The SSH service in `docker-compose.deploy.yml`:
- **Port**: 2222 (maps to container port 22)
- **User**: `deploy` (created by linuxserver/openssh-server)
- **Key Auth**: Uses `/home/deploy/.ssh/authorized_keys`
- **Volume Mounts**:
  - `/opt/3dpricey` → allows git clone and docker-compose commands
  - `/var/run/docker.sock` → allows docker commands from SSH session

## Troubleshooting

### SSH Connection Refused

1. Check SSH service is running:
   ```bash
   docker ps | grep ssh
   ```

2. Check port 2222 is exposed:
   ```bash
   netstat -tlnp | grep 2222
   ```

3. Check authorized_keys has correct permissions (600):
   ```bash
   ls -la /opt/3dpricey/ssh_authorized_keys
   ```

### Git Clone Failures

Ensure git credentials are configured on the SSH service, or use a read-only deploy token from GitLab.

### Docker Command Not Found

SSH service needs `/var/run/docker.sock` mounted. Verify in docker-compose.deploy.yml.

## Security Notes

- Keep `SSH_PRIVATE_KEY` secret in GitLab
- Rotate deployment keys regularly
- Use separate deploy user (not root)
- Restrict SSH access to known CI/CD IPs if possible
