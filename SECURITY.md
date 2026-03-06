# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| latest (main) | ✅ |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please report it privately by emailing:

**gregory@jarod-xp.dev**

Include as much detail as possible:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested mitigations if you have them

You can expect an acknowledgement within 48 hours. We will work with you to understand and resolve the issue before any public disclosure.

## Scope

This project is a local tool — the MCP server and Figma plugin both run on the user's own machine and communicate only with the local Figma desktop app via WebSocket. There is no hosted backend or user data storage.

Relevant areas:
- The WebSocket relay between the MCP server and the Figma plugin
- Input handling in MCP tool parameters (injection risks)
- The Figma REST API integration (`FIGMA_API_TOKEN` handling)
