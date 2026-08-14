import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runGoogleSync } from "@/lib/google/syncService";
import { setCredentials } from "@/lib/google/googleAuth";

// Vercel Cron — runs on schedule defined in vercel.json
// Protected by CRON_SECRET so only Vercel can call it

export const maxDuration = 300; // 5 min timeout for large syncs

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function readConfig() {
  const svc = getServiceClient();
  const { data, error } = await svc.storage.from("sashico-config").download("google-sync.json");
  if (error || !data) return null;
  try { return JSON.parse(await data.text()); } catch { return null; }
}

async function writeConfig(update: Record<string, unknown>) {
  const svc = getServiceClient();
  const current = await readConfig() ?? {};
  const updated = { ...current, ...update };
  const blob = new Blob([JSON.stringify(updated)], { type: "application/json" });
  await svc.storage.from("sashico-config").update("google-sync.json", blob, {
    contentType: "application/json", upsert: true,
  });
}

export async function GET(req: NextRequest) {
  // Verify it's called by Vercel Cron (or manually with the secret)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await readConfig();
  if (!config?.sheet_id || !config?.drive_folder_id) {
    return NextResponse.json({ error: "Google Sync not configured — set Sheet ID and Drive Folder ID in Admin → Google Sync" }, { status: 400 });
  }

  const creds = config.credentials || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!creds) {
    return NextResponse.json({ error: "No Google credentials" }, { status: 400 });
  }

  setCredentials(creds);
  await writeConfig({ last_sync_status: "running" });

  try {
    const result = await runGoogleSync(config.sheet_id, config.drive_folder_id);
    await writeConfig({
      last_sync_status: result.errors.length > 0 ? "warning" : "success",
      last_synced_at: new Date().toISOString(),
      last_sync_log: result.log.slice(-50).join("\n"),
      last_sync_source: "cron",
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (e: any) {
    await writeConfig({ last_sync_status: "error", last_sync_log: e.message });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
