# Agentbury for Claude

Agentbury is a cosy office game at [agentbury.com](https://agentbury.com). This plugin turns your Claude chats into staff in an office you build and run. When a chat starts, it joins your office as a new starter. When it reads, edits, runs commands or waits for you, its character sits at a desk and does the same, live.

## Connect

1. Install the plugin.
2. In Agentbury, open Menu, then Claude connection, click Get my connect line, and open Already have the plugin.
3. Copy the command it shows into any Claude chat, for example `/agentbury:connect ABCD-1234`.

New chats then join your office. The plugin does nothing until you connect it.

## What it reads, sends and stores

The plugin runs a small Node.js script on Claude's hook events: a chat starting and ending, a message being sent, a tool being used, a sub-agent starting and stopping, and a notification. The script never prints anything and never blocks Claude.

**What it reads on your computer:** the hook's own details (the chat's session id, its folder and the tool's name), and the chat's title from the end of the chat's transcript file. It reads only the title line, nothing else in the transcript.

**What it sends:** to `https://agentbury.com/api/events` only, over HTTPS, signed with the connection key you got when you connected. Each event holds:

- a chat id, made by hashing the session id with a random value kept on your computer, so it can't be turned back into the real session id
- the chat's name: a name you gave it with `/agentbury:name`, or the chat's title, or a short made-up name like "Chat 3F2A"
- the kind of event and when it happened
- for tool events, a broad kind of tool only: edit, command, read, browser, message, agent or other
- the project folder's name, only if you turn that on with `/agentbury:settings`
- a short job title, only when you set one yourself with `/agentbury:job`

When you connect, it also sends this computer's name once, so you can tell your computers apart in the game.

It never sends your prompts, Claude's replies, your files, your code, file paths or command text. You can list words to hide (client or project names) in `/agentbury:settings`, and they are replaced with *** before anything leaves your computer.

**What it stores:** a folder called `.agentbury` in your home folder. It holds your connection key and settings, a small state file and a queue of events waiting to be sent. Events that can't be sent within a day are deleted.

## Commands

- `/agentbury:connect CODE` connects this computer to your office
- `/agentbury:status` shows whether it's connected
- `/agentbury:pause` and `/agentbury:resume` stop and restart sending
- `/agentbury:name NAME` names the current chat
- `/agentbury:job TITLE` says what the current chat is working on, shown above its desk
- `/agentbury:settings` shows the settings: sharing the project name, words to hide and a local log
- `/agentbury:disconnect` removes the connection key from this computer

## Privacy and support

Read the privacy policy at [agentbury.com/privacy](https://agentbury.com/privacy) and the terms at [agentbury.com/terms](https://agentbury.com/terms). For help, email help@agentbury.com.

Agentbury is independent and isn't made by or connected to Anthropic. Claude is a trademark of Anthropic.

Copyright 2026 Agentbury. All rights reserved.
