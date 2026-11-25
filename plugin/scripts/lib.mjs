// Shared bits for the Agentbury hook and commands. Plain Node, no packages.
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, readdirSync, unlinkSync, appendFileSync, openSync, readSync, closeSync, statSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { basename, join } from "node:path";

export const DIR = process.env.AGENTBURY_HOME || join(homedir(), ".agentbury");
const CONFIG = join(DIR, "config.json");
const STATE = join(DIR, "state.json");
const QUEUE = join(DIR, "queue.jsonl");
const LOG = join(DIR, "activity-log.jsonl");

export function ensureDir() { if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true, mode: 0o700 }); }

const read = (f, fallback) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return fallback; } };
const write = (f, v) => { ensureDir(); const tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(v, null, 2), { mode: 0o600 }); renameSync(tmp, f); };

export function loadConfig() {
  const c = read(CONFIG, {});
  if (!c.salt) { c.salt = randomBytes(16).toString("hex"); write(CONFIG, c); }
  return { server: "", token: "", device: hostname().slice(0, 40), paused: false, shareProject: false, redact: [], localLog: false, ...c };
}
export const saveConfig = (c) => write(CONFIG, c);
export const loadState = () => read(STATE, { byCwd: {}, names: {}, titles: {} });
export const saveState = (s) => write(STATE, s);

/** A chat id that can't be turned back into the real session id. */
export const hashChat = (sessionId, salt) => createHash("sha256").update(`${salt}:${sessionId}`).digest("hex").slice(0, 32);

export function toolCategory(name = "") {
  const n = String(name);
  if (/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(n)) return "edit";
  if (/^(Bash|PowerShell|BashOutput|KillShell|Monitor)$/.test(n)) return "command";
  if (/^(Read|Grep|Glob|LS|NotebookRead)$/.test(n)) return "read";
  if (/^(WebFetch|WebSearch)$/.test(n) || /browser|chrome|playwright|puppeteer/i.test(n)) return "browser";
  if (/^(SendMessage|SendUserFile)$/.test(n) || /slack|gmail|email|outlook|teams|discord/i.test(n)) return "message";
  if (/^(Task|Agent)$/.test(n)) return "agent";
  return "other";
}

/** Hides words the player listed (client names, secret projects) before anything leaves the computer. */
export function redact(text, words) {
  let t = String(text || "");
  for (const w of words || []) if (w) t = t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "***");
  return t;
}

/** The chat's title from its transcript, if Claude Code has given it one. Only the title is read out. */
export function titleFromTranscript(path) {
  if (!path || !existsSync(path)) return null;
  try {
    const size = statSync(path).size;
    const len = Math.min(size, 262144);
    const buf = Buffer.alloc(len);
    const fd = openSync(path, "r");
    readSync(fd, buf, 0, len, size - len);
    closeSync(fd);
    const lines = buf.toString("utf8").split("\n").reverse();
    for (const line of lines) {
      if (!line.includes("title") && !line.includes("summary")) continue;
      try {
        const o = JSON.parse(line);
        const t = o.customTitle || o.title || (o.type === "custom-title" && o.value) || (o.type === "summary" && o.summary);
        if (typeof t === "string" && t.trim()) return t.trim().slice(0, 40);
      } catch { /* partial line */ }
    }
  } catch { /* unreadable */ }
  return null;
}

export const projectName = (cwd) => (cwd ? basename(cwd).slice(0, 60) : null);

export function enqueue(event, cfg) {
  ensureDir();
  appendFileSync(QUEUE, `${JSON.stringify(event)}\n`, { mode: 0o600 });
  if (cfg.localLog) appendFileSync(LOG, `${JSON.stringify(event)}\n`, { mode: 0o600 });
}

/** Sends everything queued. Each run claims the queue by renaming it, so two hooks never send the same events. */
export async function flush(cfg, timeoutMs = 2000) {
  if (!cfg.server || !cfg.token || cfg.paused) return { sent: 0 };
  ensureDir();
  if (existsSync(QUEUE)) { try { renameSync(QUEUE, join(DIR, `batch-${Date.now()}-${process.pid}.jsonl`)); } catch { /* another hook got it */ } }
  let sent = 0;
  const batches = readdirSync(DIR).filter((f) => f.startsWith("batch-")).sort();
  for (const f of batches) {
    const p = join(DIR, f);
    let events;
    try { events = readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { try { unlinkSync(p); } catch {} continue; }
    // Old batches (offline for a long time) are dropped after a day.
    if (Number(f.split("-")[1]) < Date.now() - 86400_000) { try { unlinkSync(p); } catch {} continue; }
    for (let i = 0; i < events.length; i += 200) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(`${cfg.server}/api/events`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${cfg.token}` }, body: JSON.stringify({ events: events.slice(i, i + 200) }), signal: ctrl.signal });
        if (r.status === 401) { cfg.token = ""; saveConfig(cfg); return { sent, error: "disconnected" }; }
        if (!r.ok) return { sent, error: `HTTP ${r.status}` };
        sent += Math.min(200, events.length - i);
      } catch { return { sent, error: "offline" }; } finally { clearTimeout(timer); }
    }
    try { unlinkSync(p); } catch { /* fine */ }
  }
  return { sent };
}
