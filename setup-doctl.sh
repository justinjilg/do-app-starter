#!/bin/bash
# Setup script for doctl

echo "🔧 Setting up doctl for DigitalOcean management"
echo ""

# Add ~/bin to PATH if not already there
if ! grep -q 'export PATH="$HOME/bin:$PATH"' ~/.zshrc 2>/dev/null; then
    echo "Adding ~/bin to PATH in ~/.zshrc..."
    echo '' >> ~/.zshrc
    echo '# doctl CLI' >> ~/.zshrc
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
    echo "✅ Added to ~/.zshrc"
else
    echo "✅ ~/bin already in PATH"
fi

# Add useful aliases
if ! grep -q 'alias do=' ~/.zshrc 2>/dev/null; then
    echo ""
    echo "Adding doctl aliases to ~/.zshrc..."
    cat >> ~/.zshrc << 'EOF'

# doctl aliases
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
EOF
    echo "✅ Added doctl aliases"
else
    echo "✅ doctl aliases already configured"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To use doctl:"
echo "  1. Reload shell: source ~/.zshrc"
echo "  2. Authenticate: doctl auth init"
echo "  3. Create API token at: https://cloud.digitalocean.com/account/api/tokens"
echo ""
echo "Quick commands:"
echo "  do apps list              # List all apps"
echo "  do-status YOUR_APP_ID     # Check app status"
echo "  do-logs YOUR_APP_ID       # View logs"
echo ""
echo "See DOCTL-GUIDE.md for complete documentation"
