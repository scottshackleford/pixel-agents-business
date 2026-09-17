#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const agents = [
  {
    id: 'yate-inbox',
    name: 'Yate Inbox & Orders',
    activities: [
      ['Read', { file_path: 'New customer emails' }],
      ['Task', { description: 'Drafting order-status reply' }],
      ['Write', { file_path: 'Order enquiry response' }],
    ],
  },
  {
    id: 'yate-operations',
    name: 'Yate Delivery Status',
    activities: [
      ['Read', { file_path: 'Today\'s delivery plan' }],
      ['Task', { description: 'Checking delayed routes' }],
      ['Write', { file_path: 'Operations update' }],
    ],
  },
  {
    id: 'yate-reporting',
    name: 'Yate Management Reporting',
    activities: [
      ['Read', { file_path: 'Sales and margin data' }],
      ['Task', { description: 'Analysing daily performance' }],
      ['Write', { file_path: 'Management summary' }],
    ],
  },
  {
    id: 'poplars-events',
    name: 'Poplars Bookings & Events',
    activities: [
      ['Read', { file_path: 'New event enquiries' }],
      ['Task', { description: 'Preparing event proposal' }],
      ['Write', { file_path: 'Booking follow-up' }],
    ],
  },
  {
    id: 'poplars-marketing',
    name: 'Poplars Marketing',
    activities: [
      ['Read', { file_path: 'Campaign calendar' }],
      ['Task', { description: 'Creating social content' }],
      ['Write', { file_path: 'Campaign draft' }],
    ],
  },
  {
    id: 'voice-reception',
    name: 'Voice Receptionist',
    activities: [
      ['Read', { file_path: 'Call routing rules' }],
      ['Task', { description: 'Handling an incoming call' }],
      ['Write', { file_path: 'Call summary' }],
    ],
  },
];

const serverConfigPath = path.join(os.homedir(), '.pixel-agents', 'server.json');

async function loadServer() {
  let raw;
  try {
    raw = await fs.readFile(serverConfigPath, 'utf8');
  } catch {
    throw new Error(
      'Pixel Agents is not running. Start it first with: npx pixel-agents --port 3100',
    );
  }
  const config = JSON.parse(raw);
  if (!config.port || !config.token) throw new Error('Pixel Agents server.json is invalid.');
  return config;
}

async function post(config, body) {
  const response = await fetch(`http://127.0.0.1:${config.port}/api/hooks/claude`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Pixel Agents returned HTTP ${response.status}.`);
}

function event(agent, hookEventName, extra = {}) {
  return {
    session_id: `business-${agent.id}`,
    hook_event_name: hookEventName,
    cwd: path.join(process.cwd(), 'business-agents', agent.name),
    ...extra,
  };
}

const config = await loadServer();

for (const agent of agents) {
  await post(config, event(agent, 'SessionStart', { source: 'business-dashboard' }));
  const [toolName, toolInput] = agent.activities[0];
  await post(config, event(agent, 'PreToolUse', { tool_name: toolName, tool_input: toolInput }));
}

console.log(`Business dashboard demo is live with ${agents.length} agents.`);
console.log('Open the Pixel Agents URL and enable Settings > Always Show Labels.');
console.log('Press Ctrl+C to stop the demo and remove the agents.');

let tick = 0;
const timer = setInterval(async () => {
  const agent = agents[tick % agents.length];
  const activityIndex = Math.floor(tick / agents.length) % agent.activities.length;
  const [toolName, toolInput] = agent.activities[activityIndex];
  try {
    await post(config, event(agent, 'PostToolUse'));
    await post(config, event(agent, 'PreToolUse', { tool_name: toolName, tool_input: toolInput }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    clearInterval(timer);
    process.exitCode = 1;
  }
  tick += 1;
}, 2500);

async function shutdown() {
  clearInterval(timer);
  await Promise.allSettled(
    agents.map((agent) =>
      post(config, event(agent, 'SessionEnd', { reason: 'business-dashboard-stopped' })),
    ),
  );
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

