# DigitalOcean App Platform Starter

🚀 **Fully automated deployment to DigitalOcean App Platform with PostgreSQL database and DO Spaces storage**

This starter project provides a complete, production-ready Node.js/Express application configured for automatic deployment to DigitalOcean App Platform with database and storage provisioning.

## Features

- ✅ **Automated Deployment** - Push to GitHub, auto-deploy to DigitalOcean
- ✅ **PostgreSQL Database** - Automatically provisioned and configured
- ✅ **DO Spaces Storage** - S3-compatible object storage integration
- ✅ **Health Checks** - Built-in health monitoring endpoints
- ✅ **Security** - Helmet.js, CORS, environment variables
- ✅ **Production Ready** - Error handling, logging, graceful shutdown

## Prerequisites

- DigitalOcean account ([Sign up](https://www.digitalocean.com/))
- GitHub account
- Node.js 18+ (for local development)
- PostgreSQL (for local development)

## Quick Start

### 1. Create DigitalOcean Space (for file storage)

1. Go to [DigitalOcean Spaces](https://cloud.digitalocean.com/spaces)
2. Click "Create a Space"
3. Choose region (e.g., NYC3)
4. Name your space (e.g., `my-app-storage`)
5. Note the endpoint (e.g., `nyc3.digitaloceanspaces.com`)

### 2. Generate Spaces API Keys

1. Go to [API Tokens](https://cloud.digitalocean.com/account/api/spaces)
2. Click "Generate New Key"
3. Name it (e.g., `app-storage-key`)
4. Save the Access Key and Secret Key

### 3. Deploy to DigitalOcean

#### Option A: Using DigitalOcean Dashboard (Recommended)

1. **Push this code to GitHub:**
   ```bash
   cd /Users/Justin/Projects/do-app-starter
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/do-app-starter.git
   git push -u origin main
   ```

2. **Create App on DigitalOcean:**
   - Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
   - Click "Create App"
   - Choose "GitHub" as source
   - Authorize DigitalOcean to access your GitHub
   - Select your repository (`yourusername/do-app-starter`)
   - Select branch: `main`
   - **Auto-deploy on push**: ✅ Enable

3. **App Platform will auto-detect `.do/app.yaml`:**
   - Database will be provisioned automatically
   - Environment variables will be set up
   - Click "Next" through the configuration

4. **Add Spaces Environment Variables:**
   - In the App settings, add these environment variables:
     - `SPACES_ENDPOINT` = `nyc3.digitaloceanspaces.com` (your region)
     - `SPACES_BUCKET` = `your-bucket-name`
     - `SPACES_KEY` = Your Spaces Access Key (encrypt as secret)
     - `SPACES_SECRET` = Your Spaces Secret Key (encrypt as secret)

5. **Launch App** - First deployment starts automatically

#### Option B: Using doctl CLI

```bash
# Install doctl
brew install doctl

# Authenticate
doctl auth init

# Create app from spec
doctl apps create --spec .do/app.yaml

# Get app ID and update environment variables
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### 4. Run Database Migrations

After first deployment, run the database schema:

```bash
# SSH into your app or use console
# Then run:
npm run db:migrate
```

Or execute the SQL directly in DigitalOcean's database console using `db/schema.sql`.

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Local Database

```bash
# Install PostgreSQL if not already installed
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb do_app_starter_dev

# Run migrations
npm run db:migrate
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your local and DO Spaces credentials:

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://localhost:5432/do_app_starter_dev
SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
SPACES_BUCKET=your-bucket-name
SPACES_KEY=your-access-key
SPACES_SECRET=your-secret-key
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs at http://localhost:8080

## API Endpoints

### Health Checks

- `GET /health` - Application health status
- `GET /health/db` - Database connection status
- `GET /health/storage` - DO Spaces connection status

### Items API (Example)

- `GET /api/items` - Get all items
- `POST /api/items` - Create new item
  ```json
  {
    "name": "Item name",
    "description": "Item description"
  }
  ```

### File Upload (Example)

- `POST /api/upload` - Upload file to DO Spaces
  ```json
  {
    "filename": "test.txt",
    "content": "base64-encoded-content",
    "contentType": "text/plain"
  }
  ```

## Deployment Workflow

### Automatic Deployment

Every push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "Add new feature"
git push origin main
# 🚀 Automatic deployment starts
```

### Manual Deployment

```bash
# Using doctl
doctl apps create-deployment YOUR_APP_ID
```

## Monitoring

### View Logs

```bash
# Using doctl
doctl apps logs YOUR_APP_ID --type run

# Or in DigitalOcean dashboard
# Apps → Your App → Runtime Logs
```

### Metrics

- Go to Apps → Your App → Insights
- View CPU, Memory, Request metrics
- Set up alerts for errors

## Scaling

### Manual Scaling

Edit `.do/app.yaml`:

```yaml
instance_count: 3  # Scale to 3 instances
instance_size_slug: professional-xs  # Upgrade instance size
```

Push changes to trigger redeployment.

### Auto-Scaling (Uncomment in app.yaml)

```yaml
autoscaling:
  min_instance_count: 1
  max_instance_count: 5
```

## Database Management

### Access Database

```bash
# Get connection details
doctl databases connection YOUR_DB_ID

# Connect via psql
psql "postgresql://user:pass@host:25060/db?sslmode=require"
```

### Backups

- Automatic daily backups enabled by default
- Restore from DigitalOcean dashboard: Databases → Backups

## Storage Management

### View Spaces Files

- Go to [Spaces](https://cloud.digitalocean.com/spaces)
- Click your Space to browse files
- Use Spaces API for programmatic access

### CDN (Optional)

Enable CDN for your Space:
- Spaces → Your Space → Settings → Enable CDN
- Get CDN URL: `your-space.nyc3.cdn.digitaloceanspaces.com`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production/development) | Yes |
| `DATABASE_URL` | PostgreSQL connection string (auto-injected in production) | Yes |
| `SPACES_ENDPOINT` | DO Spaces endpoint (e.g., nyc3.digitaloceanspaces.com) | Yes |
| `SPACES_BUCKET` | Your Spaces bucket name | Yes |
| `SPACES_KEY` | Spaces access key | Yes |
| `SPACES_SECRET` | Spaces secret key | Yes |
| `PORT` | Server port (default: 8080) | No |

## Costs

Estimated monthly costs for basic usage:

- **App Platform (Basic)**: $5/month (1 instance)
- **PostgreSQL Database**: $15/month (1GB RAM, 10GB storage)
- **Spaces Storage**: $5/month (250GB storage, 1TB transfer)
- **Total**: ~$25/month

Free tier available for first app: https://www.digitalocean.com/pricing/app-platform

## Troubleshooting

### App won't start

1. Check logs: `doctl apps logs YOUR_APP_ID`
2. Verify environment variables are set correctly
3. Check DATABASE_URL is injected by DigitalOcean
4. Ensure Node.js version matches (18+)

### Database connection fails

1. Verify DATABASE_URL environment variable
2. Check database is running: DigitalOcean → Databases
3. Run migrations: `npm run db:migrate`
4. Check SSL settings in `config/database.js`

### Spaces upload fails

1. Verify Spaces credentials (SPACES_KEY, SPACES_SECRET)
2. Check bucket name matches SPACES_BUCKET
3. Verify endpoint matches region (nyc3, sfo3, etc.)
4. Check bucket permissions (public-read for uploads)

### Deployment fails

1. Check build logs in App Platform console
2. Verify `package.json` scripts exist
3. Check `.do/app.yaml` syntax
4. Ensure GitHub repo is accessible

## Project Structure

```
do-app-starter/
├── .do/
│   └── app.yaml           # DigitalOcean app specification
├── config/
│   ├── database.js        # PostgreSQL configuration
│   └── spaces.js          # DO Spaces configuration
├── db/
│   └── schema.sql         # Database schema
├── scripts/
│   └── migrate.js         # Migration script
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
├── README.md              # This file
└── server.js              # Express application
```

## Next Steps

1. **Add Authentication** - JWT, OAuth, or session-based auth
2. **Add Frontend** - React, Vue, or static site
3. **Add Testing** - Jest, Mocha, or similar
4. **Add CI/CD** - GitHub Actions for testing before deploy
5. **Add Monitoring** - Sentry, LogRocket, or DataDog
6. **Add Email** - SendGrid, Mailgun integration
7. **Add Caching** - Redis for session/cache storage

## Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [DO Spaces Docs](https://docs.digitalocean.com/products/spaces/)
- [App Platform Pricing](https://www.digitalocean.com/pricing/app-platform)
- [doctl CLI Reference](https://docs.digitalocean.com/reference/doctl/)

## License

MIT

## Support

- [DigitalOcean Community](https://www.digitalocean.com/community)
- [App Platform Forum](https://www.digitalocean.com/community/tags/app-platform)
- [DigitalOcean Support](https://www.digitalocean.com/support/)
