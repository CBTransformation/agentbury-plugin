# Agentbury for Claude Code

This plugin connects Claude Code to [Agentbury](https://agentbury.com), the game where your Claude chats become staff in an office you build and run.

## Install

The easiest way: in Agentbury, open Menu, then Claude connection, and click **Get my connect line**. Paste the line into PowerShell on Windows or Terminal on a Mac and press Enter. It adds this plugin to Claude and connects your computer. Then close Claude and open it again. It needs Node.js 18 or newer.

Or in Claude Code:

```
/plugin marketplace add CBTransformation/agentbury-plugin
/plugin install agentbury
```

Then get your code from the same Claude connection screen and run the command it shows, for example `/agentbury:connect ABCD-1234`.

## What it sends

Only the chat's name, the kind of tool used and when, and the project folder name if you turn that on. Never your prompts, Claude's replies, your files or your code. The plugin's own [README](plugin/README.md) lists exactly what it reads, sends and stores.

Commands: `/agentbury:status`, `/agentbury:pause`, `/agentbury:resume`, `/agentbury:name`, `/agentbury:job`, `/agentbury:settings`, `/agentbury:disconnect`.

Agentbury is independent and isn't made by or connected to Anthropic. Claude is a trademark of Anthropic.

Copyright 2026 Agentbury. All rights reserved.
