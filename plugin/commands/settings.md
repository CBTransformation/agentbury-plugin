---
description: Change what Agentbury shares (project names, hidden words, a local-only log)
argument-hint: share-project on|off, hide WORD, unhide WORD, local-log on|off
allowed-tools: Bash(node:*)
---
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" settings $ARGUMENTS`

Show the user the output above as it is.
