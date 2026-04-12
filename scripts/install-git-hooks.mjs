import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const gitDir = path.join(root, ".git");
const hooksDir = path.join(gitDir, "hooks");

async function isDirectory(filePath) {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

if (!(await isDirectory(gitDir))) {
  console.log("No .git directory found. Skipping Git hook installation.");
  process.exit(0);
}

await mkdir(hooksDir, { recursive: true });

const hooks = {
  "pre-commit": `#!/bin/sh
set -e

npm run docs:update

if ! git diff --quiet -- README.md; then
  git add README.md
fi
`,
  "pre-push": `#!/bin/sh
set -e

npm run docs:check
`,
};

await Promise.all(
  Object.entries(hooks).map(async ([name, contents]) => {
    const hookPath = path.join(hooksDir, name);
    await writeFile(hookPath, contents);
    await chmod(hookPath, 0o755);
  }),
);

console.log("Installed README Git hooks: pre-commit and pre-push.");
