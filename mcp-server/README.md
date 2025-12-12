# DigitalOcean MCP Server

MCP (Model Context Protocol) server for DigitalOcean App Platform, Databases, and Spaces.

## Features

- **App Management**: List apps, get details, view deployments
- **Deployment Control**: Trigger new deployments, view deployment status
- **Logs**: View build, deploy, and runtime logs
- **Database Management**: List databases, get connection info
- **Environment Variables**: Update app environment variables
- **Spaces**: Basic Spaces listing (full management via S3 API)

## Installation

```bash
cd mcp-server
npm install
```

## Configuration

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your DigitalOcean API token:**
   ```bash
   # Get from: https://cloud.digitalocean.com/account/api/tokens
   DO_API_TOKEN=dop_v1_your_token_here
   ```

## Usage

### Standalone

```bash
npm start
```

### With Claude Code

Add to your Claude Code MCP configuration (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "digitalocean": {
      "command": "node",
      "args": ["/Users/Justin/Projects/do-app-starter/mcp-server/index.js"],
      "env": {
        "DO_API_TOKEN": "dop_v1_your_token_here"
      }
    }
  }
}
```

Or use the token from your environment:

```json
{
  "mcpServers": {
    "digitalocean": {
      "command": "node",
      "args": ["/Users/Justin/Projects/do-app-starter/mcp-server/index.js"]
    }
  }
}
```

(Make sure `DO_API_TOKEN` or `DIGITALOCEAN_TOKEN` is in your environment)

## Available Tools

### App Management

#### `list_apps`
List all your DigitalOcean apps.

**Example:**
```
List all my DigitalOcean apps
```

#### `get_app`
Get details about a specific app.

**Parameters:**
- `app_id` (required): The app ID

**Example:**
```
Get details for app 29c78f3e-a7e8-4fe0-a4b2-54b470b72097
```

#### `list_deployments`
List all deployments for an app.

**Parameters:**
- `app_id` (required): The app ID

**Example:**
```
List deployments for app 29c78f3e-a7e8-4fe0-a4b2-54b470b72097
```

#### `get_deployment`
Get details about a specific deployment.

**Parameters:**
- `app_id` (required): The app ID
- `deployment_id` (required): The deployment ID

#### `get_app_logs`
Get logs from an app deployment.

**Parameters:**
- `app_id` (required): The app ID
- `deployment_id` (required): The deployment ID
- `component_name` (optional): Component name (default: "web")
- `type` (optional): Log type - BUILD, DEPLOY, or RUN (default: RUN)
- `tail_lines` (optional): Number of lines (default: 100)

**Example:**
```
Get the last 50 runtime logs for my app
```

#### `create_deployment`
Trigger a new deployment.

**Parameters:**
- `app_id` (required): The app ID
- `force_build` (optional): Force rebuild (default: false)

**Example:**
```
Deploy my app again with a force rebuild
```

#### `update_env_vars`
Update environment variables for an app.

**Parameters:**
- `app_id` (required): The app ID
- `env_vars` (required): Array of environment variables
  - `key`: Variable name
  - `value`: Variable value
  - `scope`: RUN_TIME, BUILD_TIME, or RUN_AND_BUILD_TIME
  - `type`: GENERAL or SECRET

**Example:**
```json
{
  "app_id": "29c78f3e-a7e8-4fe0-a4b2-54b470b72097",
  "env_vars": [
    {
      "key": "JWT_SECRET",
      "value": "new-secret-key",
      "scope": "RUN_TIME",
      "type": "SECRET"
    }
  ]
}
```

### Database Management

#### `list_databases`
List all managed databases.

#### `get_database`
Get details about a specific database.

**Parameters:**
- `database_id` (required): The database UUID

#### `get_database_connection`
Get connection information for a database.

**Parameters:**
- `database_id` (required): The database UUID

**Returns:**
- Host, port, username, password
- SSL configuration
- Connection URI
- Full connection string

### Spaces Management

#### `list_spaces`
List DigitalOcean Spaces.

*Note: Full Spaces management requires the S3-compatible API.*

## Examples

### With Claude Code

Once configured, you can ask Claude:

```
"List all my DigitalOcean apps"

"Show me the latest deployment for my app"

"Get the runtime logs for my app"

"Update the JWT_SECRET environment variable for my app"

"Trigger a new deployment for my app"

"What's the connection string for my database?"
```

### Programmatic Usage

```javascript
// The MCP server communicates via stdio
// Use the MCP SDK client to interact with it

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./index.js'],
  env: {
    DO_API_TOKEN: 'your-token'
  }
});

const client = new Client({
  name: 'do-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: 'list_apps',
  arguments: {}
});

console.log(result);
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Test the server
node index.js
# Then send MCP protocol messages via stdin
```

## Security

- Never commit your `.env` file with API tokens
- Use encrypted secrets for sensitive environment variables
- Rotate API tokens regularly
- Use read-only tokens if you only need read operations

## Troubleshooting

### "Error: DO_API_TOKEN environment variable is required"

Make sure you've set the `DO_API_TOKEN` or `DIGITALOCEAN_TOKEN` environment variable:

```bash
export DO_API_TOKEN=dop_v1_your_token_here
```

Or add it to your `.env` file.

### "401 Unauthorized"

Your API token may be invalid or expired. Generate a new one at:
https://cloud.digitalocean.com/account/api/tokens

### "404 Not Found"

Check that the app ID, database ID, or deployment ID is correct.

## Resources

- [DigitalOcean API Documentation](https://docs.digitalocean.com/reference/api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## License

MIT
