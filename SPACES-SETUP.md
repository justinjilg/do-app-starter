# ☁️ DigitalOcean Spaces Setup Guide

Quick guide to set up object storage for your app.

## Step 1: Create a Space (2 minutes)

### Via Web Dashboard (Easiest)

1. **Go to Spaces:**
   - https://cloud.digitalocean.com/spaces

2. **Click "Create a Space"**

3. **Configure Space:**
   - **Region:** Choose `NYC3` (same as app)
   - **Enable CDN:** Yes (recommended for faster file delivery)
   - **Space name:** `do-app-storage` (or your choice)
   - **Choose a project:** Select your project or "Default Project"
   - **File Listing:** Private (recommended)

4. **Click "Create a Space"**

5. **Note your Space details:**
   ```
   Space Name: do-app-storage
   Endpoint: nyc3.digitaloceanspaces.com
   CDN Endpoint: do-app-storage.nyc3.cdn.digitaloceanspaces.com
   ```

## Step 2: Generate Spaces API Keys (1 minute)

1. **Go to API Tokens:**
   - https://cloud.digitalocean.com/account/api/spaces

2. **Click "Generate New Key"**

3. **Name your key:**
   - Name: `do-app-storage-key`
   - Click "Generate Key"

4. **IMPORTANT: Copy and save these immediately!**
   ```
   Access Key: XXXXXXXXXXXXXXXX
   Secret Key: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

   You won't be able to see the Secret Key again!

## Step 3: Add to Your App (2 minutes)

### Option A: Via Web Dashboard (Recommended)

1. **Go to your app:**
   - https://cloud.digitalocean.com/apps/29c78f3e-a7e8-4fe0-a4b2-54b470b72097

2. **Click "Settings" tab**

3. **Scroll to "App-Level Environment Variables"**

4. **Click "Edit"**

5. **Add these variables:**

   | Variable | Value | Encrypt? |
   |----------|-------|----------|
   | `SPACES_ENDPOINT` | `nyc3.digitaloceanspaces.com` | ❌ No |
   | `SPACES_BUCKET` | `do-app-storage` | ❌ No |
   | `SPACES_KEY` | Your Access Key | ✅ Yes |
   | `SPACES_SECRET` | Your Secret Key | ✅ Yes |

6. **Click "Save"**

7. **The app will automatically redeploy** with new environment variables

### Option B: Via doctl CLI

Create a file with your variables:

```bash
# Save this as spaces-env.json
{
  "envs": [
    {
      "key": "SPACES_ENDPOINT",
      "value": "nyc3.digitaloceanspaces.com",
      "scope": "RUN_TIME"
    },
    {
      "key": "SPACES_BUCKET",
      "value": "do-app-storage",
      "scope": "RUN_TIME"
    },
    {
      "key": "SPACES_KEY",
      "value": "YOUR_ACCESS_KEY_HERE",
      "scope": "RUN_TIME",
      "type": "SECRET"
    },
    {
      "key": "SPACES_SECRET",
      "value": "YOUR_SECRET_KEY_HERE",
      "scope": "RUN_TIME",
      "type": "SECRET"
    }
  ]
}
```

Then update via API (doctl doesn't have direct env var management):

```bash
# Get current app spec
~/bin/doctl apps spec get $(cat .app-id) > current-spec.yaml

# Edit current-spec.yaml to add the environment variables under services.web.envs
# Then update:
~/bin/doctl apps update $(cat .app-id) --spec current-spec.yaml
```

## Step 4: Test Storage (After Deployment)

Once your app is deployed and Spaces are configured:

### Test Upload Endpoint

```bash
# Get your app URL
APP_URL=$(~/bin/doctl apps get $(cat .app-id) -o json | grep -o '"live_url":"[^"]*"' | cut -d'"' -f4)

# Test health check
curl $APP_URL/health/storage

# Expected response:
{
  "status": "connected",
  "bucket": "do-app-storage"
}

# Test file upload
echo "Test content" | base64 | curl -X POST $APP_URL/api/upload \
  -H "Content-Type: application/json" \
  -d "{\"filename\":\"test.txt\",\"content\":\"$(cat -)\",\"contentType\":\"text/plain\"}"

# Expected response:
{
  "success": true,
  "url": "https://do-app-storage.nyc3.digitaloceanspaces.com/test.txt"
}
```

### View Files in Space

1. Go to your Space: https://cloud.digitalocean.com/spaces
2. Click on `do-app-storage`
3. You should see uploaded files

## Pricing

**DigitalOcean Spaces Pricing:**
- **$5/month** includes:
  - 250 GB storage
  - 1 TB outbound transfer
- **Additional costs:**
  - Storage: $0.02/GB over 250GB
  - Transfer: $0.01/GB over 1TB

## Common Issues

### "Access Denied" Error

**Problem:** App can't access Space

**Solution:**
1. Verify Space name matches `SPACES_BUCKET` value
2. Verify API keys are correct
3. Check Space is in same region (NYC3)

### "Bucket not found" Error

**Problem:** Space doesn't exist or wrong name

**Solution:**
1. Double-check Space name (case-sensitive)
2. Verify Space was created successfully
3. Try accessing Space in dashboard

### Files Upload but Can't Access

**Problem:** Files uploaded but 403 when accessing URL

**Solution:**
1. Check Space file listing setting (should be Public for public files)
2. Or use signed URLs for private files:
   ```javascript
   const signedUrl = getSignedUrl('filename.txt', 3600); // 1 hour
   ```

## Advanced: CORS Configuration

If you're uploading from a frontend app, enable CORS:

1. Go to your Space → Settings
2. Add CORS configuration:
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

## Resources

- Spaces Documentation: https://docs.digitalocean.com/products/spaces/
- S3 API Compatibility: https://docs.digitalocean.com/products/spaces/reference/s3-sdk-examples/
- CDN Documentation: https://docs.digitalocean.com/products/spaces/how-to/enable-cdn/
