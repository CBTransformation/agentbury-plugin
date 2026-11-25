#!/usr/bin/env node
// Agentbury hook. Reads the hook's JSON from stdin, turns it into a small activity event and sends it.
// It never prints anything (so nothing is added to Claude's context) and always exits 0 (so it never blocks Claude).
import { enqueue, flush, hashChat, loadConfig, loadState, projectName, redact, saveState, titleFromTranscript, toolCategory } from "./lib.mjs";

const type = process.argv[2] || "tool";

async function main() {
  const cfg = loadConfig();
  if (!cfg.token || cfg.paused) return;
  let input = "";
  for await (const chunk of process.stdin) { input += chunk; if (input.length > 1_000_000) break; }
  let hook = {};
  try { hook = JSON.parse(input || "{}"); } catch { return; }
  const sessionId = hook.session_id;
  if (!sessionId) return;
  const chat = hashChat(sessionId, cfg.salt);
  const state = loadState();
  if (hook.cwd) state.byCwd[hook.cwd] = { session: sessionId, at: Date.now() };

  // A name the player set with /agentbury:name wins, then the chat's own title, then the project folder.
  let name = state.names[chat];
  if (!name && (type === "session_start" || type === "prompt" || type === "stop" || !state.titles[chat])) {
    const t = titleFromTranscript(hook.transcript_path);
    if (t) state.titles[chat] = t;
  }
  name = name || state.titles[chat] || (cfg.shareProject ? projectName(hook.cwd) : null) || `Chat ${chat.slice(0, 4).toUpperCase()}`;
  name = redact(name, cfg.redact);
  saveState(state);

  const event = { chat, name, type, at: Date.now() };
  if (cfg.shareProject && hook.cwd) event.project = redact(projectName(hook.cwd), cfg.redact);
  if (type === "tool") event.tool = toolCategory(hook.tool_name);
  if (type === "subagent_start") {
    // The contractor gets their own id from the tool call, and points back at the chat that hired them.
    event.parent = chat;
    event.chat = hashChat(`${sessionId}:${hook.tool_use_id || Date.now()}`, cfg.salt);
    event.name = "Contractor";
    delete event.project;
  }
  enqueue(event, cfg);
  // Send in small bursts: always on stop and session events, otherwise at most every few seconds.
  const urgent = ["stop", "session_start", "session_end", "notification", "subagent_start", "subagent_stop", "prompt"].includes(type);
  const last = Number(state.lastFlush || 0);
  if (urgent || Date.now() - last > 4000) {
    state.lastFlush = Date.now();
    saveState(state);
    await flush(cfg, 1500);
  }
}

main().catch(() => {}).finally(() => process.exit(0));
