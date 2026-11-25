---
description: Set this chat's name in Agentbury (e.g. Builder 3)
argument-hint: name
allowed-tools: Bash(node:*)
---
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" name "$ARGUMENTS"`

Tell the user in one short line that the name is set.
