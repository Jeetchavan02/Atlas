import path from "path";
import fs from "fs";
import { promisify } from "util";

// Resolve workspace root relative to the backend build directory (dist/services/localAgent/workspace.js)
export const WORKSPACE_ROOT = path.resolve(__dirname, "../../../../");

// Explicit blocklist for sensitive file patterns
const SENSITIVE_PATTERNS = [
  /\.env(\..+)?$/,
  /\.pem$/,
  /\.crt$/,
  /\.key$/,
  /id_rsa/,
  /id_ed25519/,
  /credentials\.json/,
  /secrets?\.json/,
  /\.npmrc/,
  /aws\/credentials/,
];

export function resolveSafePath(requestedPath: string): string {
  // 1. Resolve to absolute path
  let absolutePath = path.resolve(WORKSPACE_ROOT, requestedPath);

  // 2. Canonicalize path
  absolutePath = path.normalize(absolutePath);

  // 3. Verify it remains inside the allowed root
  if (!absolutePath.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Security Violation: Path escapes workspace boundaries (${requestedPath})`);
  }
  
  // 4. Reject traversal sequences that attempt to bypass boundary
  if (requestedPath.includes("../") || requestedPath.includes("..\\")) {
     throw new Error(`Security Violation: Path traversal detected (${requestedPath})`);
  }

  // 5. Check for sensitive files
  const filename = path.basename(absolutePath);
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(filename)) {
      throw new Error(`Security Violation: Access to sensitive file blocked (${filename})`);
    }
  }

  return absolutePath;
}

export async function checkSymlinkEscape(absolutePath: string): Promise<void> {
  try {
    const realPath = await promisify(fs.realpath)(absolutePath);
    if (!realPath.startsWith(WORKSPACE_ROOT)) {
      throw new Error(`Security Violation: Symlink escapes workspace (${absolutePath})`);
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // If it doesn't exist yet, we can't check its realpath.
    // The directory it's going into is checked instead.
    const dirPath = path.dirname(absolutePath);
    const realDir = await promisify(fs.realpath)(dirPath);
    if (!realDir.startsWith(WORKSPACE_ROOT)) {
        throw new Error(`Security Violation: Target directory symlink escapes workspace (${dirPath})`);
    }
  }
}
