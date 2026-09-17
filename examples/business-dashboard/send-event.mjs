#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const [agentId, state, ...descriptionParts] = process.argv.slice(2);
const description = descriptionParts.join(' ').trim();

if (!agentId || !state || !['start', 'working', 'waiting', 'completed', 'stop'].includes(state)) {
  console.error(
    'Usage: node send-event.mjs <agent-id> <start|working|waiting|completed|stop> [description]',
  );
  process.exit(1);
}

const configPath = path.join(os.homedir(), '.pixel-agents', 'server.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const sessionId = `business-${agentId}`;
const cwd = path.join(process.cwd(), 'business-agents', agentId);

const payloads = {
  start: { session_id: sessionId, hook_event_name: 'SessionStart', source: 'business-dashboard', cwd },
  working: {
    session_id: sessionId,
    hook_event_name: 'PreToolUse',
    tool_name: 'Task',
    tool_input: { description: description || 'Working' },
  },
  waiting: {
    session_id: sessionId,
    hook_event_name: 'Notification',
    notification_type: 'idle_prompt',
  },
  completed: { session_id: sessionId, hook_event_name: 'Stop' },
  stop: { session_id: sessionId, hook_event_name: 'SessionEnd', reason: 'stopped' },
};

const response = await fetch(`http://127.0.0.1:${config.port}/api/hooks/claude`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${config.token}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify(payloads[state]),
});

if (!response.ok) throw new Error(`Pixel Agents returned HTTP ${response.status}.`);
console.log(`${agentId}: ${state}${description ? ` — ${description}` : ''}`);

