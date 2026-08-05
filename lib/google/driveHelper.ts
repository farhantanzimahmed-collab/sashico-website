import { google } from "googleapis";
import { getGoogleAuth } from "./googleAuth";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

function getDrive() {
  return google.drive({ version: "v3", auth: getGoogleAuth() });
}

/** List all image files and sub-folders directly inside a Drive folder */
export async function listFolderContents(folderId: string): Promise<DriveFile[]> {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    pageSize: 1000,
  });
  return (res.data.files ?? []) as DriveFile[];
}

/**
 * Given a root folder, build a map of { productCode → DriveFile[] }
 * Handles two structures:
 *   - Direct file:   SS-T-001.jpg  → single image
 *   - Sub-folder:    SS-T-001/     → multiple images inside
 */
export async function buildProductImageMap(
  rootFolderId: string
): Promise<Map<string, DriveFile[]>> {
  const map = new Map<string, DriveFile[]>();
  const items = await listFolderContents(rootFolderId);

  const IMAGE_TYPES = new Set([
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  ]);

  const folderItems = items.filter(f => f.mimeType === "application/vnd.google-apps.folder");
  const fileItems   = items.filter(f => IMAGE_TYPES.has(f.mimeType));

  // Single-image files: strip extension to get product code
  for (const file of fileItems) {
    const code = file.name.replace(/\.[^.]+$/, "").trim().toUpperCase();
    map.set(code, [file]);
  }

  // Sub-folder = multi-image: folder name IS the product code
  for (const folder of folderItems) {
    const code = folder.name.trim().toUpperCase();
    const children = await listFolderContents(folder.id);
    const images = children.filter(f => IMAGE_TYPES.has(f.mimeType));
    if (images.length > 0) map.set(code, images);
  }

  return map;
}

/** Download a Drive file as a Buffer */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
