# Business agent dashboard starter

This starter turns the Pixel Agents office into a visual command centre for business workflows.
It does not give the agents their capabilities; it visualises status events from agents running in
n8n, Outlook/Microsoft Graph, ElevenLabs, an ERP integration, or another automation service.

## Run the local demo

Requirements: Node.js 20 or newer.

In terminal 1:

```bash
npx pixel-agents --port 3100
```

Open the private URL printed in the terminal. Do not share the `?token=` URL.

In terminal 2, from this repository:

```bash
node examples/business-dashboard/demo-agents.mjs
```

The demo creates six animated agents for Yate Supplies and Poplars. In the dashboard, turn on
**Settings > Always Show Labels**. Stop the demo with Ctrl+C.

## Send a real workflow status

Call the helper at the start and end of a workflow. The same events can later be sent by an n8n
Execute Command node or replaced with a small HTTPS bridge.

```bash
node examples/business-dashboard/send-event.mjs yate-inbox start
node examples/business-dashboard/send-event.mjs yate-inbox working "Drafting a customer reply"
node examples/business-dashboard/send-event.mjs yate-inbox waiting "Needs Scott's approval"
node examples/business-dashboard/send-event.mjs yate-inbox completed
node examples/business-dashboard/send-event.mjs yate-inbox stop
```

`start` must be sent before the first `working`, `waiting`, or `completed` event for a new session.

## Recommended production shape

Keep Pixel Agents and its bearer token private. Put a small authenticated bridge between business
systems and Pixel Agents. The bridge should accept a deliberately narrow event model:

```json
{
  "agentId": "yate-inbox",
  "agentName": "Yate Inbox & Orders",
  "state": "working",
  "description": "Checking order 12345"
}
```

Never expose the Pixel Agents token directly to browser code, n8n form users, email content, or an
internet-facing webhook. Add an audit log before connecting actions that can send email, update ERP
records, take payment, or place orders.

