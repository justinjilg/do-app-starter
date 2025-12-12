# 🚀 Quick Start - Deploy in 5 Minutes

## Step 1: Create DigitalOcean Space (2 minutes)

1. Go to https://cloud.digitalocean.com/spaces
2. Click **"Create a Space"**
3. Choose region: **NYC3**
4. Name: `my-app-storage`
5. Click **"Create a Space"**

## Step 2: Get Spaces API Keys (1 minute)

1. Go to https://cloud.digitalocean.com/account/api/spaces
2. Click **"Generate New Key"**
3. Name: `app-storage`
4. **Save these somewhere safe:**
   - Access Key: `xxxxxxxxxxxxx`
   - Secret Key: `xxxxxxxxxxxxx`

## Step 3: Push to GitHub (1 minute)

```bash
# Create a new repository on GitHub first, then:
cd /Users/Justin/Projects/do-app-starter

# Add your GitHub repo as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push code
git push -u origin main
```

## Step 4: Deploy to DigitalOcean (1 minute)

1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Choose **"GitHub"** as source
4. Authorize DigitalOcean (if first time)
5. Select your repository: `YOUR_USERNAME/YOUR_REPO_NAME`
6. Select branch: `main`
7. Enable **"Autodeploy"** ✅
8. Click **"Next"**

## Step 5: Configure Environment Variables (30 seconds)

DigitalOcean will auto-detect `.do/app.yaml` and set up the database.

Add these environment variables in the App Platform UI:

| Variable | Value | Encrypt? |
|----------|-------|----------|
| `SPACES_ENDPOINT` | `nyc3.digitaloceanspaces.com` | No |
| `SPACES_BUCKET` | `my-app-storage` | No |
| `SPACES_KEY` | Your Access Key from Step 2 | **Yes** |
| `SPACES_SECRET` | Your Secret Key from Step 2 | **Yes** |

Click **"Save"** then **"Create Resources"**

## Done! 🎉

Your app will deploy automatically. After ~3 minutes:

1. Click on your app URL (e.g., `https://your-app-xxxxx.ondigitalocean.app`)
2. You'll see: `{"message": "DigitalOcean App Platform Starter"}`
3. Test health checks:
   - `/health` - App status
   - `/health/db` - Database connection
   - `/health/storage` - Spaces connection

## Run Database Migrations

After first deployment, run the schema:

1. In DigitalOcean dashboard: Apps → Your App → **Console**
2. Run: `npm run db:migrate`

Or use the database console:
1. Databases → Your Database → **Console**
2. Copy/paste contents of `db/schema.sql`

## Test the API

```bash
# Get all items
curl https://your-app-xxxxx.ondigitalocean.app/api/items

# Create an item
curl -X POST https://your-app-xxxxx.ondigitalocean.app/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item","description":"Created via API"}'
```

## Auto-Deploy Workflow

Every git push triggers automatic deployment:

```bash
# Make changes
echo "console.log('Hello');" >> server.js

# Commit and push
git add .
git commit -m "Add logging"
git push origin main

# 🚀 Automatic deployment starts!
# Check progress at: https://cloud.digitalocean.com/apps
```

## View Logs

```bash
# Install doctl CLI
brew install doctl

# Authenticate
doctl auth init

# List apps
doctl apps list

# View logs
doctl apps logs YOUR_APP_ID --type run
```

## Costs

- App Platform: **$5/month** (first app free)
- PostgreSQL: **$15/month**
- Spaces: **$5/month**
- **Total: ~$25/month** (first month may be free)

## Need Help?

- Check `README.md` for detailed documentation
- DigitalOcean Community: https://www.digitalocean.com/community
- App Platform Docs: https://docs.digitalocean.com/products/app-platform/
