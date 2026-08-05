import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runGoogleSync } from "@/lib/google/syncService";

// GET — load current config
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("google_sync_config")
    .select("*")
    .eq("id", 1)
    .single();

  return NextResponse.json({ config: data ?? {} });
}

// POST — save config or trigger sync
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Save config only
  if (body.action === "save_config") {
    const { sheet_id, drive_folder_id } = body;
    const { error } = await supabase
      .from("google_sync_config")
      .update({ sheet_id, drive_folder_id, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Trigger sync — stream log lines as NDJSON
  if (body.action === "sync") {
    const { sheet_id, drive_folder_id } = body;

    if (!sheet_id || !drive_folder_id) {
      return NextResponse.json({ error: "Sheet ID and Drive Folder ID are required" }, { status: 400 });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({ error: "GOOGLE_SERVICE_ACCOUNT_JSON env var not configured" }, { status: 500 });
    }

    // Mark as running in DB
    await supabase
      .from("google_sync_config")
      .update({ last_sync_status: "running", sheet_id, drive_folder_id })
      .eq("id", 1);

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

          await supabase
            .from("google_sync_config")
            .update({
              last_sync_status: result.errors.length > 0 ? "warning" : "success",
              last_synced_at: new Date().toISOString(),
              last_sync_log: logs.join("\n"),
            })
            .eq("id", 1);
        } catch (e: any) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: e.message }) + "\n"));
          await supabase
            .from("google_sync_config")
            .update({ last_sync_status: "error", last_sync_log: e.message })
            .eq("id", 1);
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
