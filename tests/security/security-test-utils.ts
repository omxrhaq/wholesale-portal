import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const repoRoot = path.resolve(import.meta.dirname, "../..");

export function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

export function repoFileExists(relativePath: string) {
  return existsSync(path.join(repoRoot, relativePath));
}

export function listRepoFiles(relativeDir: string, extensions: string[]) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const files: string[] = [];

  walk(absoluteDir, files, extensions);

  return files.map((file) => path.relative(repoRoot, file));
}

function walk(dir: string, files: string[], extensions: string[]) {
  for (const entry of readdirSync(dir)) {
    const absolutePath = path.join(dir, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      if (["node_modules", ".git", ".next", "coverage"].includes(entry)) {
        continue;
      }

      walk(absolutePath, files, extensions);
      continue;
    }

    if (extensions.some((extension) => entry.endsWith(extension))) {
      files.push(absolutePath);
    }
  }
}
