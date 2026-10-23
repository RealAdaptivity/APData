/**
 * Storage paths for shop files. The repair_files table only accepts
 * "<uploader uuid>/<letters, digits, dot, dash, underscore>", so a phone's
 * "IMG 2041 (1).HEIC" has to be cleaned first.
 *
 * No imports, so the node test runner loads it directly.
 */

/** "Wiring diagram (1).PDF" → "wiring-diagram-1.pdf"; the bucket path allows only safe characters. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .toLowerCase();
  const ext = (dot > 0 ? name.slice(dot + 1) : '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toLowerCase();
  return `${base || 'file'}${ext ? `.${ext}` : ''}`;
}

/** The full bucket path for an upload by this user. */
export function storagePath(userId: string, fileName: string, nonce: string): string {
  return `${userId}/${nonce}-${safeFileName(fileName)}`;
}

/** The same rule the database checks (repair_files.storage_path). */
export const STORAGE_PATH_RULE = /^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,200}$/;
