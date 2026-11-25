#!/usr/bin/env node
// Agentbury commands: connect, job, name, status, pause, resume, settings, disconnect.
import { hostname } from "node:os";
import { enqueue, flush, hashChat, loadConfig, loadState, redact, saveConfig, saveState, DIR } from "./lib.mjs";

const [cmd, ...args] = process.argv.slice(2);
const cfg = loadConfig();
const out = (s) => process.stdout.write(`${s}\n`);
const DEFAULT_SERVER = process.env.AGENTBURY_SERVER || "https://agentbury.com";

/** The chat this command was typed in: the most recent one seen in this folder. */
function currentChat() {
  const state = loadState();
  const here = state.byCwd[process.cwd()];
  const latest = here || Object.values(state.byCwd).sort((a, b) => b.at - a.at)[0];
  return latest ? hashChat(latest.session, cfg.salt) : null;
}

async function main() {
  switch (cmd) {
    case "connect": {
      const code = (args[0] || "").trim().toUpperCase();
      const server = (args[1] || cfg.server || DEFAULT_SERVER).replace(/\/$/, "");
      if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(code)) return out("Paste the 8-character code from Agentbury: Menu, Claude connection, Connect a computer. For example: /agentbury:connect ABCD-1234");
      try {
        const r = await fetch(`${server}/api/pair`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.includes("-") ? code : `${code.slice(0, 4)}-${code.slice(4)}`, device: cfg.device || hostname() }) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return out(data.message || "That code didn't work. Make a new one in Agentbury and try again.");
        cfg.server = server; cfg.token = data.token; cfg.paused = false;
        saveConfig(cfg);
        return out(`Connected to ${data.company || "your office"}. New chats on this computer will turn up as new starters. Agentbury only sees which kind of tool a chat uses and when. It never sees your prompts, replies, code or files.`);
      } catch {
        return out(`Couldn't reach ${server}. Check your internet connection and try again.`);
      }
    }
    case "job": {
      const chat = currentChat();
      if (!cfg.token) return out("Agentbury isn't connected yet. Run /agentbury:connect first.");
      if (!chat) return out("Couldn't tell which chat this is. Send one message first, then try again.");
      const job = redact(args.join(" ").replace(/^"|"$/g, "").trim(), cfg.redact).slice(0, 60);
      enqueue({ chat, type: "job", job, at: Date.now() }, cfg);
      await flush(cfg, 3000);
      return out(job ? `Job set: ${job}` : "Job cleared.");
    }
    case "name": {
      const chat = currentChat();
      if (!chat) return out("Couldn't tell which chat this is. Send one message first, then try again.");
      const name = redact(args.join(" ").replace(/^"|"$/g, "").trim(), cfg.redact).slice(0, 40);
      const state = loadState();
      if (name) state.names[chat] = name; else delete state.names[chat];
      saveState(state);
      enqueue({ chat, name: name || undefined, type: "tool", tool: "other", at: Date.now() }, cfg);
      await flush(cfg, 3000);
      return out(name ? `This chat is now called ${name} in Agentbury.` : "Name cleared.");
    }
    case "status": {
      const r = cfg.token ? await flush(cfg, 3000) : { sent: 0 };
      return out([
        `Agentbury: ${cfg.token ? (cfg.paused ? "connected, paused" : "connected") : "not connected"}${cfg.server ? ` to ${cfg.server}` : ""}`,
        `This computer is called: ${cfg.device}`,
        `Project folder names: ${cfg.shareProject ? "shared" : "not shared"}`,
        `Hidden words: ${cfg.redact.length ? cfg.redact.join(", ") : "none"}`,
        `Local log: ${cfg.localLog ? `on, in ${DIR}` : "off"}`,
        r.error ? `Sending: ${r.error === "offline" ? "offline, events are saved and will send later" : r.error}` : "Sending: working",
        "What's sent: a hashed chat id, the chat's name, the kind of tool used (edit, command, read, browser, message, agent or other) and the time. Never prompts, replies, code, file names or file contents.",
      ].join("\n"));
    }
    case "pause": cfg.paused = true; saveConfig(cfg); return out("Agentbury is paused on this computer. Nothing is sent until you run /agentbury:resume.");
    case "resume": cfg.paused = false; saveConfig(cfg); await flush(cfg, 3000); return out("Agentbury is back on.");
    case "settings": {
      const [key, ...rest] = args;
      const val = rest.join(" ").trim();
      if (key === "share-project") cfg.shareProject = val === "on";
      else if (key === "hide" && val) cfg.redact = [...new Set([...cfg.redact, val])].slice(0, 50);
      else if (key === "unhide") cfg.redact = cfg.redact.filter((w) => w.toLowerCase() !== val.toLowerCase());
      else if (key === "local-log") cfg.localLog = val === "on";
      else if (key === "device" && val) cfg.device = val.slice(0, 40);
      else return out("Settings: share-project on|off, hide WORD, unhide WORD, local-log on|off, device NAME");
      saveConfig(cfg);
      return out("Saved.");
    }
    case "disconnect": cfg.token = ""; saveConfig(cfg); return out("Disconnected. To remove this computer from your office too, open Agentbury: Menu, Claude connection.");
    default: return out("Agentbury commands: connect CODE, job TITLE, name NAME, status, pause, resume, settings, disconnect");
  }
}

main().catch((e) => out(`Something went wrong: ${e.message}`));
