#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const DO_API_TOKEN = process.env.DO_API_TOKEN || process.env.DIGITALOCEAN_TOKEN;
const DO_API_BASE = 'https://api.digitalocean.com/v2';

if (!DO_API_TOKEN) {
  console.error('Error: DO_API_TOKEN or DIGITALOCEAN_TOKEN environment variable is required');
  process.exit(1);
}

// Create axios instance with auth
const doApi = axios.create({
  baseURL: DO_API_BASE,
  headers: {
    'Authorization': `Bearer ${DO_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Create MCP server
const server = new Server(
  {
    name: 'digitalocean-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: 'list_apps',
    description: 'List all DigitalOcean App Platform apps',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_app',
    description: 'Get details about a specific app',
    inputSchema: {
      type: 'object',
      properties: {
        app_id: {
          type: 'string',
          description: 'The app ID',
        },
      },
      required: ['app_id'],
    },
  },
  {
    name: 'list_deployments',
    description: 'List deployments for an app',
    inputSchema: {
      type: 'object',
      properties: {
        app_id: {
          type: 'string',
          description: 'The app ID',
        },
      },
      required: ['app_id'],
    },
  },
  {
    name: 'get_deployment',
    description: 'Get details about a specific deployment',
    inputSchema: {
      type: 'object',
      properties: {
        app_id: {
          type: 'string',
          description: 'The app ID',
        },
        deployment_id: {
          type: 'string',
          description: 'The deployment ID',
        },
      },
      required: ['app_id', 'deployment_id'],
    },
  },
  {
    name: 'get_app_logs',
    description: 'Get logs for an app deployment',
    inputSchema: {
      type: 'object',
      properties: {
        app_id: {
          type: 'string',
          description: 'The app ID',
        },
        deployment_id: {
          type: 'string',
          description: 'The deployment ID',
        },
        component_name: {
          type: 'string',
          description: 'Component name (e.g., "web")',
          default: 'web',
        },
        type: {
          type: 'string',
          description: 'Log type: BUILD, DEPLOY, or RUN',
          enum: ['BUILD', 'DEPLOY', 'RUN'],
          default: 'RUN',
        },
        tail_lines: {
          type: 'number',
          description: 'Number of lines to tail',
          default: 100,
        },
      },
      required: ['app_id', 'deployment_id'],
    },
  },
  {
    name: 'list_databases',
    description: 'List all DigitalOcean managed databases',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_database',
    description: 'Get details about a specific database',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: {
          type: 'string',
          description: 'The database ID (UUID)',
        },
      },
      required: ['database_id'],
    },
  },
  {
    name: 'get_database_connection',
    description: 'Get connection details for a database',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: {
          type: 'string',
          description: 'The database ID (UUID)',
        },
      },
      required: ['database_id'],
    },
  },
  {
    name: 'list_spaces',
    description: 'List all DigitalOcean Spaces (object storage)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_deployment',
    description: 'Trigger a new deployment for an app',
    inputSchema: {
      type: 'object',
      properties: {
        app_id: {
          type: 'string',
          description: 'The app ID',
        },
        force_build: {
          type: 'boolean',
          description: 'Force rebuild even if source hasn\'t changed',
          default: false,
        },
      },
      required: ['app_id'],
    },
  },
  {
    name: 'update_env_vars',
    description: 'Update environment variables for an app',
    inputSchema: {
      type: 'object',
      properties: {
        app_id: {
          type: 'string',
          description: 'The app ID',
        },
        env_vars: {
          type: 'array',
          description: 'Array of environment variables',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: { type: 'string' },
              scope: {
                type: 'string',
                enum: ['RUN_TIME', 'BUILD_TIME', 'RUN_AND_BUILD_TIME'],
                default: 'RUN_TIME',
              },
              type: {
                type: 'string',
                enum: ['GENERAL', 'SECRET'],
                default: 'GENERAL',
              },
            },
            required: ['key', 'value'],
          },
        },
      },
      required: ['app_id', 'env_vars'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_apps': {
        const response = await doApi.get('/apps');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.apps, null, 2),
            },
          ],
        };
      }

      case 'get_app': {
        const response = await doApi.get(`/apps/${args.app_id}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.app, null, 2),
            },
          ],
        };
      }

      case 'list_deployments': {
        const response = await doApi.get(`/apps/${args.app_id}/deployments`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.deployments, null, 2),
            },
          ],
        };
      }

      case 'get_deployment': {
        const response = await doApi.get(
          `/apps/${args.app_id}/deployments/${args.deployment_id}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.deployment, null, 2),
            },
          ],
        };
      }

      case 'get_app_logs': {
        const params = {
          type: args.type || 'RUN',
          tail_lines: args.tail_lines || 100,
        };

        const response = await doApi.get(
          `/apps/${args.app_id}/deployments/${args.deployment_id}/components/${args.component_name || 'web'}/logs`,
          { params }
        );

        return {
          content: [
            {
              type: 'text',
              text: response.data.historic_urls?.[0]
                ? `Logs URL: ${response.data.historic_urls[0]}\n\nLive logs: ${response.data.live_url || 'Not available'}`
                : JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case 'list_databases': {
        const response = await doApi.get('/databases');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.databases, null, 2),
            },
          ],
        };
      }

      case 'get_database': {
        const response = await doApi.get(`/databases/${args.database_id}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.data.database, null, 2),
            },
          ],
        };
      }

      case 'get_database_connection': {
        const response = await doApi.get(`/databases/${args.database_id}`);
        const db = response.data.database;

        const connectionInfo = {
          host: db.connection.host,
          port: db.connection.port,
          user: db.connection.user,
          password: db.connection.password,
          database: db.connection.database,
          ssl: db.connection.ssl,
          uri: db.connection.uri,
          connection_string: `postgresql://${db.connection.user}:${db.connection.password}@${db.connection.host}:${db.connection.port}/${db.connection.database}?sslmode=require`,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(connectionInfo, null, 2),
            },
          ],
        };
      }

      case 'list_spaces': {
        // Note: Spaces don't have a direct v2 API endpoint, need to use Spaces API
        // For now, return a helpful message
        return {
          content: [
            {
              type: 'text',
              text: 'Spaces management requires the Spaces API (S3-compatible). Use the AWS S3 SDK or doctl CLI for Spaces operations.',
            },
          ],
        };
      }

      case 'create_deployment': {
        const payload = {
          force_build: args.force_build || false,
        };

        const response = await doApi.post(
          `/apps/${args.app_id}/deployments`,
          payload
        );

        return {
          content: [
            {
              type: 'text',
              text: `Deployment created successfully:\n${JSON.stringify(response.data.deployment, null, 2)}`,
            },
          ],
        };
      }

      case 'update_env_vars': {
        // First get the current app spec
        const appResponse = await doApi.get(`/apps/${args.app_id}`);
        const app = appResponse.data.app;

        // Update environment variables in the spec
        if (app.spec.services && app.spec.services.length > 0) {
          const service = app.spec.services[0];
          service.envs = service.envs || [];

          // Add/update environment variables
          args.env_vars.forEach((newEnv) => {
            const existingIndex = service.envs.findIndex(
              (e) => e.key === newEnv.key
            );

            const envVar = {
              key: newEnv.key,
              value: newEnv.value,
              scope: newEnv.scope || 'RUN_TIME',
              type: newEnv.type || 'GENERAL',
            };

            if (existingIndex >= 0) {
              service.envs[existingIndex] = envVar;
            } else {
              service.envs.push(envVar);
            }
          });
        }

        // Update the app with new spec
        const updateResponse = await doApi.put(`/apps/${args.app_id}`, {
          spec: app.spec,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Environment variables updated successfully. App will redeploy.\n${JSON.stringify(updateResponse.data.app.spec.services[0].envs, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error.response) {
      // DigitalOcean API error
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.response.data.message || error.response.statusText}\nStatus: ${error.response.status}`,
          },
        ],
        isError: true,
      };
    }

    throw error;
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DigitalOcean MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
