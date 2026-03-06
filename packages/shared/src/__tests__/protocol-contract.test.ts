/**
 * Protocol contract test.
 *
 * Verifies that every message type in the ServerToPluginMessage discriminated union
 * has a corresponding case statement in the Figma plugin's main.ts switch block.
 *
 * This test acts as a regression guard: if a new message type is added to messages.ts
 * but its handler is not wired into main.ts, this test will fail with a clear error.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Paths resolved relative to this file (packages/shared/src/__tests__/)
const MESSAGES_TS_PATH = path.resolve(__dirname, '../../src/messages.ts');
const MAIN_TS_PATH = path.resolve(__dirname, '../../../figma-plugin/src/main.ts');

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Extract all type literal values from the ServerToPluginMessage union in messages.ts.
 * Looks for patterns like: | { type: 'some_type'; ... }
 */
function extractMessageTypes(messagesContent: string): string[] {
  const typePattern = /type:\s*'([^']+)'/g;
  const types: string[] = [];
  let match: RegExpExecArray | null;

  // Find the ServerToPluginMessage type block
  const unionStart = messagesContent.indexOf('export type ServerToPluginMessage =');
  const unionEnd = messagesContent.indexOf('export type PluginToServerMessage');

  if (unionStart === -1) {
    throw new Error('Could not find ServerToPluginMessage type in messages.ts');
  }

  const unionBlock = messagesContent.slice(
    unionStart,
    unionEnd !== -1 ? unionEnd : messagesContent.length,
  );

  while ((match = typePattern.exec(unionBlock)) !== null) {
    types.push(match[1]);
  }

  return [...new Set(types)]; // deduplicate
}

/**
 * Extract all case values from the switch statement in main.ts.
 * Looks for patterns like: case 'some_type':
 */
function extractSwitchCases(mainContent: string): string[] {
  const casePattern = /case\s+'([^']+)'\s*:/g;
  const cases: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = casePattern.exec(mainContent)) !== null) {
    cases.push(match[1]);
  }

  return [...new Set(cases)];
}

describe('Protocol contract: ServerToPluginMessage types vs main.ts switch cases', () => {
  it('every ServerToPluginMessage type has a corresponding case in main.ts', () => {
    const messagesContent = readFile(MESSAGES_TS_PATH);
    const mainContent = readFile(MAIN_TS_PATH);

    const messageTypes = extractMessageTypes(messagesContent);
    const switchCases = extractSwitchCases(mainContent);

    expect(messageTypes.length).toBeGreaterThan(0);
    expect(switchCases.length).toBeGreaterThan(0);

    const missingCases = messageTypes.filter((type) => !switchCases.includes(type));

    if (missingCases.length > 0) {
      throw new Error(
        `The following ServerToPluginMessage types are missing case handlers in main.ts:\n` +
          missingCases.map((t) => `  - '${t}'`).join('\n') +
          `\n\nAdd corresponding case '${missingCases[0]}': blocks to the switch statement in:\n` +
          `  packages/figma-plugin/src/main.ts`,
      );
    }

    expect(missingCases).toEqual([]);
  });

  it('extracts at least the expected core message types from messages.ts', () => {
    const messagesContent = readFile(MESSAGES_TS_PATH);
    const messageTypes = extractMessageTypes(messagesContent);

    const expectedCoreTypes = [
      'ping',
      'build_scene',
      'get_document_info',
      'get_node_info',
      'modify_node',
      'delete_nodes',
    ];

    for (const coreType of expectedCoreTypes) {
      expect(messageTypes).toContain(coreType);
    }
  });
});
