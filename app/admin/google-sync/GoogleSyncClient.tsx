"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw, Save, Play, CheckCircle, AlertCircle, Info, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

interface Config {
  sheet_id?: string;
  drive_folder_id?: string;
  credentials?: string;
  last_synced_at?: string;
  last_sync_status?: string;
  last_sync_log?: string;
}

export default function GoogleSyncClient({ initialConfig }: { initialConfig: Config }) {
  const [sheetId, setSheetId] = useState(initialConfig.sheet_id ?? "");
  const [folderId, setFolderId] = useState(initialConfig.drive_folder_id ?? "");
  const [credentials, setCredentials] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [showPrevLog, setShowPrevLog] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/admin/google-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_config", sheet_id: sheetId, drive_folder_id: folderId, credentials: credentials || undefined }),
    });
    setSaving(false);
    if (!res.ok) setError("Save failed");
  }

  async function handleSync() {
    if (!sheetId || !folderId) {
      setError("Enter Sheet ID and Drive Folder ID first");
      return;
    }
    setSyncing(true);
    setDone(false);
    setError("");
    setLogs(["🚀 Starting sync..."]);

    try {
      const res = await fetch("/api/admin/google-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", sheet_id: sheetId, drive_folder_id: folderId }),
      });

      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Sync failed");
        setSyncing(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.log)   setLogs(prev => [...prev, data.log]);
            if (data.error) setError(data.error);
            if (data.done)  setDone(true);
          } catch {}
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  }

  const statusColor = {
    never:   "text-gray-400",
    running: "text-blue-500",
    success: "text-green-500",
    warning: "text-yellow-500",
    error:   "text-red-500",
  }[initialConfig.last_sync_status ?? "never"] ?? "text-gray-400";

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Status card */}
      {initialConfig.last_synced_at && (
        <div className="bg-white border border-black/8 rounded p-4 flex items-center gap-3">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-sans text-brand-black">
              Last synced: {new Date(initialConfig.last_synced_at).toLocaleString()}
            </p>
            <p className={`text-xs font-sans ${statusColor}`}>
              Status: {initialConfig.last_sync_status}
            </p>
          </div>
          {initialConfig.last_sync_log && (
            <button
              onClick={() => setShowPrevLog(!showPrevLog)}
              className="ml-auto text-xs text-brand-gray-500 hover:text-black flex items-center gap-1"
            >
              {showPrevLog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Last log
            </button>
          )}
        </div>
      )}

      {showPrevLog && initialConfig.last_sync_log && (
        <div className="bg-black rounded p-4 max-h-48 overflow-y-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
            {initialConfig.last_sync_log}
          </pre>
        </div>
      )}

      {/* Config */}
      <div className="bg-white border border-black/8 rounded p-6 space-y-4">
        <h2 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-widest">
          Configuration
        </h2>

        {/* Credentials — only shown when not already saved */}
        <div>
          <label className="block text-xs font-sans text-brand-gray-500 uppercase tracking-wider mb-1.5">
            Service Account JSON{" "}
            {initialConfig.last_sync_status !== "never"
              ? <span className="text-green-600 normal-case">✓ saved</span>
              : <span className="text-red-500 normal-case">* required</span>}
          </label>
          <textarea
            rows={initialConfig.last_sync_status !== "never" ? 2 : 5}
            value={credentials}
            onChange={e => setCredentials(e.target.value)}
            placeholder={
              initialConfig.last_sync_status !== "never"
                ? "Leave blank to keep saved credentials, or paste new JSON to replace"
                : 'Paste the entire contents of your downloaded JSON key file here...'
            }
            className="w-full px-3 py-2.5 border border-black/12 rounded text-xs font-mono focus:outline-none focus:border-black transition-colors resize-none"
          />
          <p className="text-xs text-brand-gray-400 mt-1">
            Stored securely in your database — no Vercel env var needed
          </p>
        </div>

        <div>
          <label className="block text-xs font-sans text-brand-gray-500 uppercase tracking-wider mb-1.5">
            Google Sheet ID
          </label>
          <input
            type="text"
            value={sheetId}
            onChange={e => setSheetId(e.target.value)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            className="w-full px-3 py-2.5 border border-black/12 rounded text-sm font-sans focus:outline-none focus:border-black transition-colors"
          />
          <p className="text-xs text-brand-gray-400 mt-1">
            From the sheet URL: docs.google.com/spreadsheets/d/<strong>THIS_PART</strong>/edit
          </p>
        </div>

        <div>
          <label className="block text-xs font-sans text-brand-gray-500 uppercase tracking-wider mb-1.5">
            Google Drive Folder ID
          </label>
          <input
            type="text"
            value={folderId}
            onChange={e => setFolderId(e.target.value)}
            placeholder="1a2b3c4d5e6f7g8h9i0j..."
            className="w-full px-3 py-2.5 border border-black/12 rounded text-sm font-sans focus:outline-none focus:border-black transition-colors"
          />
          <p className="text-xs text-brand-gray-400 mt-1">
            From the folder URL: drive.google.com/drive/folders/<strong>THIS_PART</strong>
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 border border-black/20 rounded text-sm font-sans hover:bg-black/4 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Config"}
          </button>

          <button
            onClick={handleSync}
            disabled={syncing || !sheetId || !folderId}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-black text-white rounded text-sm font-sans hover:bg-brand-gray-800 disabled:opacity-40 transition-colors"
          >
            {syncing
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Play className="h-4 w-4" />
            }
            {syncing ? "Syncing…" : "Run Sync"}
          </button>
        </div>
      </div>

      {/* Live log */}
      {logs.length > 0 && (
        <div className="bg-black rounded overflow-hidden">
          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Sync Log</span>
            {done && <CheckCircle className="h-4 w-4 text-green-400" />}
            {syncing && <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />}
          </div>
          <div ref={logRef} className="p-4 max-h-96 overflow-y-auto">
            {logs.map((l, i) => (
              <p key={i} className="text-xs font-mono text-green-400 leading-relaxed whitespace-pre-wrap">{l}</p>
            ))}
            {syncing && (
              <p className="text-xs font-mono text-white/40 animate-pulse mt-1">▋</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-sans text-red-700">{error}</p>
        </div>
      )}

      {/* Setup guide */}
      <div className="border border-black/8 rounded overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-black/2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-brand-gray-400" />
            <span className="text-sm font-sans font-medium">Setup Guide</span>
          </div>
          {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showGuide && (
          <div className="px-5 pb-5 space-y-4 border-t border-black/8 pt-4">
            <Step n={1} title="Create Google Service Account">
              <ol className="text-sm font-sans text-brand-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-black underline underline-offset-2">console.cloud.google.com</a></li>
                <li>Create a new project (or select existing)</li>
                <li>Enable <strong>Google Drive API</strong> and <strong>Google Sheets API</strong></li>
                <li>Go to IAM &amp; Admin → Service Accounts → Create</li>
                <li>Download the JSON key file</li>
                <li>Copy the entire JSON content → add as <code className="bg-black/6 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> in Vercel env vars</li>
              </ol>
            </Step>

            <Step n={2} title="Share Drive folder with Service Account">
              <p className="text-sm font-sans text-brand-gray-600">
                In the JSON key file, find <code className="bg-black/6 px-1 rounded">client_email</code>.
                Right-click your Drive product images folder → Share → paste that email as <strong>Viewer</strong>.
              </p>
            </Step>

            <Step n={3} title="Set up your Google Sheet">
              <p className="text-sm font-sans text-brand-gray-600 mb-2">
                Create a new Google Sheet and share it with the same service account email (Viewer access).
                Row 1 must be exactly these headers in order:
              </p>
              <div className="bg-black/4 rounded p-3 overflow-x-auto">
                <code className="text-xs font-mono text-brand-black whitespace-nowrap">
                  product_code | name | description | price | sale_price | category | sizes | is_active | is_featured | is_new_arrival | is_best_seller | tags | meta_title | meta_description
                </code>
              </div>
              <div className="mt-2 space-y-1 text-xs font-sans text-brand-gray-500">
                <p><strong>product_code</strong> — must match your Drive filename/folder (e.g. SS-T-001)</p>
                <p><strong>category</strong> — use: t-shirts, hoodies, jackets, accessories</p>
                <p><strong>sizes</strong> — format: <code className="bg-black/6 px-1 rounded">S:10,M:15,L:5,XL:3</code></p>
                <p><strong>is_active / is_featured / etc.</strong> — type TRUE or FALSE</p>
                <p><strong>sale_price / tags / meta_*</strong> — optional, leave blank to skip</p>
              </div>
            </Step>

            <Step n={4} title="Drive image naming">
              <p className="text-sm font-sans text-brand-gray-600 mb-2">Two supported structures:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/4 rounded p-3">
                  <p className="text-xs font-mono font-semibold mb-1">Single image</p>
                  <pre className="text-xs font-mono text-brand-gray-600">{`SS-T-001.jpg\nSS-T-002.png`}</pre>
                </div>
                <div className="bg-black/4 rounded p-3">
                  <p className="text-xs font-mono font-semibold mb-1">Multiple images</p>
                  <pre className="text-xs font-mono text-brand-gray-600">{`SS-T-001/\n  front.jpg\n  back.jpg\n  detail.jpg`}</pre>
                </div>
              </div>
            </Step>

            <Step n={5} title="Run the sync">
              <p className="text-sm font-sans text-brand-gray-600">
                Enter your Sheet ID and Drive Folder ID above, save, then click <strong>Run Sync</strong>.
                Products are upserted by product_code — safe to re-run anytime.
              </p>
            </Step>
          </div>
        )}
      </div>

      {/* Sheet format link */}
      <div className="flex items-center gap-2 text-sm font-sans text-brand-gray-500">
        <ExternalLink className="h-3.5 w-3.5" />
        <a
          href="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit"
          target="_blank"
          rel="noreferrer"
          className="hover:text-black transition-colors"
        >
          View sheet template example
        </a>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="w-6 h-6 rounded-full bg-brand-black text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1">
        <p className="text-sm font-sans font-semibold text-brand-black mb-2">{title}</p>
        {children}
      </div>
    </div>
  );
}
