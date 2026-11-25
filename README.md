# Agentbury for Claude Code

This plugin connects Claude Code to [Agentbury](https://agentbury.com), the game where your Claude chats become staff in an office you build and run.

## Install

In Claude Code:

```
/plugin marketplace add CBTransformation/agentbury-plugin
/plugin install agentbury
```

Then open Agentbury, go to Menu, Claude connection, get a code, and run the command it shows, for example `/agentbury:connect ABCD-1234`.

## What it sends

Only the chat's name, its project folder name (you can turn this off), the kind of tool used and when. Never your prompts, Claude's replies, your files or your code.

Commands: `/agentbury:status`, `/agentbury:pause`, `/agentbury:resume`, `/agentbury:name`, `/agentbury:job`, `/agentbury:settings`, `/agentbury:disconnect`.

Agentbury is independent and isn't made by or connected to Anthropic. Claude is a trademark of Anthropic.

Copyright 2026 Agentbury. All rights reserved.
