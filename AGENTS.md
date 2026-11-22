# Agent instructions: 9am Crew

This repo is the 9am Crew app, which also holds Court6's class programming.

## Programming (workouts, cycles, coach notes)

Before reading, writing or changing any programming — in the app through the MCP connector, or in `docs/programming/` — follow these rules:

1. **Evidence first.** Every programming decision (every write, rewrite or change: structure, movements, loads, reps, formats, rest, warm-ups, cool-downs, coach notes, cycle plans) must be supported by exercise science. Check the research before proposing a change, tell the coach what the evidence says and how strong it is, and say when something is only convention or expert opinion. Never fill gaps from memory.
2. **Follow the rulebook:** [`docs/programming/RULES.md`](docs/programming/RULES.md). The app enforces part of it in [`src/lib/programming/rules.ts`](src/lib/programming/rules.ts); the rest is on you.
3. **Read live data first** (`get_days`, `get_cycle`), send whole days back, show the coach the preview, and only push when the coach says "push". Details: [`docs/programming/CONNECTOR.md`](docs/programming/CONNECTOR.md).

The same rules are built into the connector itself (`src/lib/mcp/standing-rules.ts`), so agents that only use the connector see them too.
