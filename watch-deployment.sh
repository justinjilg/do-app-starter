#!/bin/bash
# Watch deployment progress for do-app-starter

APP_ID=$(cat .app-id 2>/dev/null)

if [ -z "$APP_ID" ]; then
    echo "❌ Error: .app-id file not found"
    echo "Run this script from the project directory"
    exit 1
fi

echo "🔍 Watching deployment for app: $APP_ID"
echo "Press Ctrl+C to stop"
echo ""

while true; do
    clear
    echo "🚀 DigitalOcean App Platform - Deployment Status"
    echo "═══════════════════════════════════════════════"
    echo ""

    # Get deployment info
    DEPLOYMENT=$(~/bin/doctl apps list-deployments $APP_ID 2>/dev/null | head -2)

    if [ $? -eq 0 ]; then
        echo "$DEPLOYMENT"
        echo ""

        # Check if deployment is complete
        if echo "$DEPLOYMENT" | grep -q "ACTIVE"; then
            echo "✅ Deployment COMPLETE!"
            echo ""

            # Get app URL
            APP_URL=$(~/bin/doctl apps get $APP_ID -o json 2>/dev/null | grep -o '"live_url":"[^"]*"' | cut -d'"' -f4)

            if [ ! -z "$APP_URL" ]; then
                echo "🌐 Your app is live at:"
                echo "$APP_URL"
                echo ""
                echo "Test endpoints:"
                echo "  Health: $APP_URL/health"
                echo "  Database: $APP_URL/health/db"
                echo "  Storage: $APP_URL/health/storage"
                echo ""
            fi

            # Show database info
            echo "📊 Database Information:"
            ~/bin/doctl databases list 2>/dev/null | grep -v "^ID"
            echo ""

            break
        fi
    else
        echo "❌ Error fetching deployment status"
        echo "Check your authentication or app ID"
        exit 1
    fi

    echo "⏱️  Refreshing in 10 seconds..."
    sleep 10
done

echo "✨ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up Spaces storage (see SPACES-SETUP.md)"
echo "2. Run database migrations (see README.md)"
echo "3. Test your API endpoints"
