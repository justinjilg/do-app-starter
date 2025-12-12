#!/bin/bash
# Setup script to add DigitalOcean MCP server to Claude Code

echo "🔧 Setting up DigitalOcean MCP Server for Claude Code"
echo ""

# Get the absolute path to the MCP server
MCP_SERVER_PATH="$(cd "$(dirname "$0")" && pwd)/index.js"
echo "MCP Server path: $MCP_SERVER_PATH"

# Get DO API token from .env
if [ -f "$(dirname "$0")/.env" ]; then
    DO_TOKEN=$(grep "^DO_API_TOKEN=" "$(dirname "$0")/.env" | cut -d'=' -f2-)
    echo "✅ Found DO_API_TOKEN in .env"
else
    echo "❌ .env file not found"
    echo "Please create .env file with DO_API_TOKEN"
    exit 1
fi

# Claude Code config path
CLAUDE_CONFIG="$HOME/.claude/config.json"

echo ""
echo "📝 Add this configuration to your Claude Code config:"
echo ""
echo "File: $CLAUDE_CONFIG"
echo ""
echo "Add to the 'mcpServers' section:"
echo ""
cat << EOF
{
  "mcpServers": {
    "digitalocean": {
      "command": "node",
      "args": ["$MCP_SERVER_PATH"],
      "env": {
        "DO_API_TOKEN": "$DO_TOKEN"
      }
    }
  }
}
EOF

echo ""
echo ""
echo "Or if you already have other MCP servers, merge with existing config:"
echo ""
cat << 'EOF'
{
  "mcpServers": {
    "your-existing-server": { ... },
    "digitalocean": {
      "command": "node",
      "args": ["FULL_PATH_TO_index.js"],
      "env": {
        "DO_API_TOKEN": "your_token_here"
      }
    }
  }
}
EOF

echo ""
echo ""
echo "🎯 After updating config, restart Claude Code to load the MCP server"
echo ""
echo "Then you can ask Claude:"
echo "  - List all my DigitalOcean apps"
echo "  - Show me the latest deployment"
echo "  - Get the runtime logs for my app"
echo "  - Update environment variables"
echo ""
