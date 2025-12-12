# 🔧 doctl CLI Guide - DigitalOcean Command Line Management

Complete guide to managing your DigitalOcean App Platform deployment using `doctl`.

## Installation

`doctl` is installed at: `~/bin/doctl`

Add to your PATH permanently:
```bash
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Or use the full path: `~/bin/doctl`

## Authentication

### Step 1: Create API Token

1. Go to https://cloud.digitalocean.com/account/api/tokens
2. Click **"Generate New Token"**
3. Name: `doctl-access`
4. Scopes: **Read and Write**
5. Click **"Generate Token"**
6. **Copy the token immediately** (you won't see it again!)

### Step 2: Authenticate doctl

```bash
~/bin/doctl auth init
# Paste your API token when prompted
```

Verify authentication:
```bash
~/bin/doctl account get
```

## App Platform Deployment

### Create App from Spec File

```bash
# Deploy using .do/app.yaml
~/bin/doctl apps create --spec .do/app.yaml

# Output will show:
# - App ID
# - App URL
# - Deployment status
```

### Update Existing App

```bash
# Get your app ID first
~/bin/doctl apps list

# Update app with new spec
~/bin/doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Deploy from GitHub (Alternative)

```bash
# Create app connected to GitHub repo
~/bin/doctl apps create \
  --github-repo "yourusername/do-app-starter" \
  --github-branch "main" \
  --github-deploy-on-push true
```

## App Management

### List All Apps

```bash
~/bin/doctl apps list

# Output shows:
# ID, Spec Name, Default Ingress, Active Deployment, In Progress, Created, Updated
```

### Get App Details

```bash
~/bin/doctl apps get YOUR_APP_ID
```

### Get App Spec (Current Configuration)

```bash
# View current app configuration
~/bin/doctl apps spec get YOUR_APP_ID

# Save to file
~/bin/doctl apps spec get YOUR_APP_ID > current-spec.yaml
```

### Update App Spec

```bash
# After modifying .do/app.yaml
~/bin/doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

## Deployment Management

### List Deployments

```bash
~/bin/doctl apps list-deployments YOUR_APP_ID
```

### Create New Deployment

```bash
# Trigger manual deployment
~/bin/doctl apps create-deployment YOUR_APP_ID
```

### Get Deployment Status

```bash
~/bin/doctl apps get-deployment YOUR_APP_ID DEPLOYMENT_ID
```

### View Deployment Logs

```bash
# Runtime logs (application output)
~/bin/doctl apps logs YOUR_APP_ID --type run

# Build logs
~/bin/doctl apps logs YOUR_APP_ID --type build

# Deploy logs
~/bin/doctl apps logs YOUR_APP_ID --type deploy

# Follow logs in real-time
~/bin/doctl apps logs YOUR_APP_ID --type run --follow
```

## Environment Variables

### List Environment Variables

```bash
# Not directly supported - view via spec
~/bin/doctl apps spec get YOUR_APP_ID | grep -A 20 "envs:"
```

### Update Environment Variables

Edit `.do/app.yaml` and add/modify envs section:

```yaml
services:
  - name: web
    envs:
      - key: NEW_VAR
        value: new_value
        type: SECRET  # or leave out for public
```

Then update:
```bash
~/bin/doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

## Database Management

### List Databases

```bash
~/bin/doctl databases list
```

### Get Database Details

```bash
~/bin/doctl databases get YOUR_DB_ID
```

### Get Database Connection Info

```bash
~/bin/doctl databases connection YOUR_DB_ID

# Get connection string
~/bin/doctl databases connection YOUR_DB_ID --format "postgresql://{{.User}}:{{.Password}}@{{.Host}}:{{.Port}}/{{.Database}}?sslmode=require"
```

### Create Database Backup

```bash
# Backups are automatic, but you can trigger one
~/bin/doctl databases backups list YOUR_DB_ID
```

### Database Maintenance

```bash
# Check maintenance window
~/bin/doctl databases get YOUR_DB_ID | grep -i maintenance

# Update maintenance window (Sundays at 2am UTC)
~/bin/doctl databases maintenance-window update YOUR_DB_ID \
  --day sunday \
  --hour 2
```

## Spaces (Storage) Management

### List Spaces

```bash
~/bin/doctl compute spaces list
```

### Create New Space

```bash
~/bin/doctl compute spaces create your-space-name \
  --region nyc3
```

### List Files in Space

```bash
~/bin/doctl compute spaces ls spaces://your-bucket-name --recursive
```

### Upload File to Space

```bash
~/bin/doctl compute spaces upload your-bucket-name local-file.txt remote-file.txt
```

### Download File from Space

```bash
~/bin/doctl compute spaces download your-bucket-name remote-file.txt local-file.txt
```

## Monitoring & Debugging

### View App Metrics

```bash
# Get app insights (requires Pro plan or higher)
~/bin/doctl apps get YOUR_APP_ID --format json | jq '.spec.ingress'
```

### Check App Health

```bash
# Get app URL
APP_URL=$(~/bin/doctl apps get YOUR_APP_ID --format json | jq -r '.default_ingress')

# Check health endpoint
curl $APP_URL/health
```

### View Recent Activity

```bash
~/bin/doctl apps list-deployments YOUR_APP_ID --format ID,Created,UpdatedAt,Progress
```

## Scaling

### Update Instance Count

Edit `.do/app.yaml`:
```yaml
services:
  - name: web
    instance_count: 3  # Scale to 3 instances
```

Deploy changes:
```bash
~/bin/doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Update Instance Size

Edit `.do/app.yaml`:
```yaml
services:
  - name: web
    instance_size_slug: professional-xs  # Upgrade size
```

Available sizes:
- `basic-xxs` - $5/month
- `basic-xs` - $12/month
- `basic-s` - $25/month
- `professional-xs` - $12/month (better performance)
- `professional-s` - $25/month
- `professional-m` - $50/month

### Enable Auto-Scaling

Edit `.do/app.yaml`:
```yaml
services:
  - name: web
    autoscaling:
      min_instance_count: 1
      max_instance_count: 5
```

## Cost Management

### View App Costs

```bash
# List app tier
~/bin/doctl apps get YOUR_APP_ID --format json | jq '.tier'
```

### View Database Costs

```bash
~/bin/doctl databases list --format ID,Name,Engine,Size
```

## Cleanup & Deletion

### Delete App

```bash
~/bin/doctl apps delete YOUR_APP_ID
# Confirm with 'y'
```

### Delete Database

```bash
~/bin/doctl databases delete YOUR_DB_ID
# Confirm with 'y'
```

### Delete Space

```bash
~/bin/doctl compute spaces delete your-bucket-name --force
```

## Useful Aliases

Add to `~/.zshrc`:

```bash
# doctl shortcuts
alias do='~/bin/doctl'
alias do-apps='~/bin/doctl apps list'
alias do-logs='~/bin/doctl apps logs'
alias do-deploy='~/bin/doctl apps create-deployment'

# Quick app status function
do-status() {
  APP_ID=$1
  echo "📊 App Status:"
  ~/bin/doctl apps get $APP_ID --format ID,Spec.Name,DefaultIngress,ActiveDeployment
  echo "\n📝 Recent Deployments:"
  ~/bin/doctl apps list-deployments $APP_ID --format ID,Created,Progress
  echo "\n🔍 App URL:"
  ~/bin/doctl apps get $APP_ID --format json | jq -r '.default_ingress'
}
```

Usage after reloading shell:
```bash
source ~/.zshrc

do apps list
do-logs YOUR_APP_ID --type run --follow
do-status YOUR_APP_ID
```

## Complete Deployment Workflow

### Initial Setup

```bash
# 1. Authenticate
~/bin/doctl auth init

# 2. Create app from spec
~/bin/doctl apps create --spec .do/app.yaml

# 3. Save app ID
APP_ID="copy-from-output"
echo $APP_ID > .app-id

# 4. Get database ID (auto-created by app spec)
~/bin/doctl databases list

# 5. Run database migrations
# Get database connection string
~/bin/doctl databases connection YOUR_DB_ID
# Connect and run db/schema.sql
```

### Daily Workflow

```bash
# 1. Make code changes
git add .
git commit -m "New feature"

# 2. Push to GitHub (triggers auto-deploy)
git push origin main

# 3. Watch deployment
APP_ID=$(cat .app-id)
~/bin/doctl apps logs $APP_ID --type deploy --follow

# 4. Verify deployment
~/bin/doctl apps list-deployments $APP_ID | head -5

# 5. Test app
APP_URL=$(~/bin/doctl apps get $APP_ID --format json | jq -r '.default_ingress')
curl $APP_URL/health
```

### Emergency Rollback

```bash
# 1. List recent deployments
~/bin/doctl apps list-deployments YOUR_APP_ID

# 2. Get previous working deployment spec
~/bin/doctl apps get-deployment YOUR_APP_ID PREVIOUS_DEPLOYMENT_ID

# 3. Update app spec to previous version
git checkout PREVIOUS_COMMIT -- .do/app.yaml
~/bin/doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

## Troubleshooting

### App Won't Start

```bash
# Check build logs
~/bin/doctl apps logs YOUR_APP_ID --type build

# Check deploy logs
~/bin/doctl apps logs YOUR_APP_ID --type deploy

# Check runtime logs
~/bin/doctl apps logs YOUR_APP_ID --type run
```

### Database Connection Issues

```bash
# Verify database is running
~/bin/doctl databases get YOUR_DB_ID --format Status,Connection

# Test connection
~/bin/doctl databases connection YOUR_DB_ID
# Use the connection string to test with psql
```

### Environment Variable Issues

```bash
# View current spec including envs
~/bin/doctl apps spec get YOUR_APP_ID > debug-spec.yaml
cat debug-spec.yaml | grep -A 30 "envs:"
```

## Resources

- doctl Reference: https://docs.digitalocean.com/reference/doctl/
- App Platform Docs: https://docs.digitalocean.com/products/app-platform/
- API Reference: https://docs.digitalocean.com/reference/api/

## Quick Reference Card

```bash
# Authentication
~/bin/doctl auth init

# Apps
~/bin/doctl apps list
~/bin/doctl apps create --spec .do/app.yaml
~/bin/doctl apps get YOUR_APP_ID
~/bin/doctl apps update YOUR_APP_ID --spec .do/app.yaml
~/bin/doctl apps delete YOUR_APP_ID
~/bin/doctl apps logs YOUR_APP_ID --type run --follow

# Deployments
~/bin/doctl apps list-deployments YOUR_APP_ID
~/bin/doctl apps create-deployment YOUR_APP_ID

# Databases
~/bin/doctl databases list
~/bin/doctl databases get YOUR_DB_ID
~/bin/doctl databases connection YOUR_DB_ID

# Spaces
~/bin/doctl compute spaces list
~/bin/doctl compute spaces ls spaces://bucket --recursive
```
