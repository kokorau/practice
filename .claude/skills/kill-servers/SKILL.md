---
name: kill-servers
description: Kill vite and storybook dev servers
disable-model-invocation: true
allowed-tools: Bash(lsof:*), Bash(kill:*)
---

Kill all running vite (port 5173) and storybook (port 6006) dev servers:

```bash
lsof -ti:5173 | xargs kill -9 2>/dev/null; lsof -ti:6006 | xargs kill -9 2>/dev/null; echo "Done"
```

Report which servers were killed.
