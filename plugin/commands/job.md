---
description: Tell Agentbury what this chat is working on (a short title shown above their desk)
argument-hint: short job title, e.g. Fix the sign-up form
allowed-tools: Bash(node:*)
---
!`node "${CLAUDE_PLUGIN_ROOT}/scripts/cli.mjs" job "$ARGUMENTS"`

Tell the user in one short line that the job title is set. Then carry on with what you were doing.
