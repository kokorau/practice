---
name: fresh
description: Fetch latest master and create a new timestamped branch
disable-model-invocation: true
allowed-tools: Bash(git:*)
---

Create a fresh branch from the latest master:

1. Fetch from origin
2. Create a new branch from origin/master with timestamp

Run the following commands:

```bash
git fetch origin && git checkout -B "work/temp-$(date +%Y%m%d-%H%M%S)" origin/master
```

After completion, show the current branch with `git branch --show-current`.

Finally, run `/clear` to reset the conversation.
