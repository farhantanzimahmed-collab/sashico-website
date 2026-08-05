import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { runGoogleSync } from "@/lib/google/syncService";
import { setCredentials } from "@/lib/google/googleAuth";

const BUCKET = "sashico-config";
const CONFIG_FILE = "google-sync.json";

interface SyncConfig {
  sheet_id: string;
  drive_folder_id: string;
  credentials: string;
  last_sync_status: string;
  last_synced_at?: string;
  last_sync_log?: string;
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function readConfig(): Promise<SyncConfig> {
  const svc = getServiceClient();
  const { data, error } = await svc.storage
    .from(BUCKET)
    .download(CONFIG_FILE);
  if (error || !data) return { sheet_id: "", drive_folder_id: "", credentials: "", last_sync_status: "never" };
  const text = await data.text();
  try { return JSON.parse(text); } catch { return { sheet_id: "", drive_folder_id: "", credentials: "", last_sync_status: "never" }; }
}

async function writeConfig(config: Partial<SyncConfig>) {
  const svc = getServiceClient();
  const current = await readConfig();
  const updated = { ...current, ...config };
  const blob = new Blob([JSON.stringify(updated)], { type: "application/json" });
  await svc.storage.from(BUCKET).update(CONFIG_FILE, blob, { contentType: "application/json", upsert: true });
  return updated;
}

// GET — load current config (strip credentials for security)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await readConfig();
  // Never send credentials back to the client
  const { credentials, ...safe } = config;
  return NextResponse.json({ config: { ...safe, has_credentials: !!credentials } });
}

// POST — save config or trigger sync
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.action === "save_config") {
    const update: Partial<SyncConfig> = {
      sheet_id: body.sheet_id,
      drive_folder_id: body.drive_folder_id,
    };
    if (body.credentials) update.credentials = body.credentials;

    await writeConfig(update);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "sync") {
    const config = await readConfig();
    const sheet_id = body.sheet_id || config.sheet_id;
    const drive_folder_id = body.drive_folder_id || config.drive_folder_id;

    if (!sheet_id || !drive_folder_id) {
      return NextResponse.json({ error: "Sheet ID and Drive Folder ID are required" }, { status: 400 });
    }

    const creds = config.credentials || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!creds) {
      return NextResponse.json({
        error: "Google credentials not configured. Paste your service account JSON and click Save first.",
      }, { status: 500 });
    }
    setCredentials(creds);
    await writeConfig({ last_sync_status: "running" });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const logs: string[] = [];
        try {
          const result = await runGoogleSync(sheet_id, drive_folder_id, (msg) => {
            logs.push(msg);
            controller.enqueue(encoder.encode(JSON.stringify({ log: msg }) + "\n"));
          });

          const summary = `✅ Done — ${result.created} created · ${result.updated} updated · ${result.imagesUploaded} images · ${result.skipped} skipped`;
          controller.enqueue(encoder.encode(JSON.stringify({ done: true, result, summary }) + "\n"));

          await writeConfig({
            last_sync_status: result.errors.length > 0 ? "warning" : "success",
            last_synced_at: new Date().toISOString(),
            last_sync_log: logs.slice(-100).join("\n"),
          });
        } catch (e: any) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: e.message }) + "\n"));
          await writeConfig({ last_sync_status: "error", last_sync_log: e.message });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
