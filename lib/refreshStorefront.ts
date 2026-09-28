/** Ask the server to drop cached storefront pages after an admin edit (best-effort). */
export async function refreshStorefront(): Promise<void> {
  try {
    await fetch("/api/admin/revalidate", { method: "POST" });
  } catch {
    // Cache simply expires on its own within a few minutes
  }
}
