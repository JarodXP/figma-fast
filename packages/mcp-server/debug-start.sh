#!/bin/bash
# Debug wrapper for the MCP server — logs stderr to /tmp for troubleshooting.
# Usage: ./debug-start.sh [args...]
exec 2>/tmp/figma-fast-mcp-debug.log
echo "Starting figma-fast MCP server" >&2
echo "PATH=$PATH" >&2
echo "NODE=$(which node 2>&1)" >&2
echo "CWD=$(pwd)" >&2
echo "Args: $@" >&2
node "$(dirname "$0")/dist/index.js" "$@"
echo "Exit code: $?" >&2
