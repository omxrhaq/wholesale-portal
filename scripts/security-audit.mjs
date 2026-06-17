import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const acceptedHighAdvisories = new Map([
  [
    "GHSA-67mh-4wv8-2f99",
    {
      dependency: "esbuild",
      path: "node_modules/@esbuild-kit/core-utils/node_modules/esbuild",
      expires: "2026-07-15",
    },
  ],
  [
    "GHSA-gv7w-rqvm-qjhr",
    {
      dependency: "esbuild",
      path: "node_modules/@esbuild-kit/core-utils/node_modules/esbuild",
      expires: "2026-07-15",
    },
  ],
]);

const policy = await readFile("docs/dependency-security-policy.md", "utf8");
const audit = await runAudit();
const blockingFindings = [];
const acceptedFindings = [];

for (const vulnerability of Object.values(audit.vulnerabilities ?? {})) {
  const severity = vulnerability.severity;

  if (severity !== "critical" && severity !== "high") {
    continue;
  }

  for (const advisory of getAdvisories(vulnerability)) {
    if (severity === "critical") {
      blockingFindings.push({
        name: vulnerability.name,
        severity,
        advisory,
        reason: "critical vulnerabilities cannot be risk-accepted",
      });
      continue;
    }

    const acceptance = acceptedHighAdvisories.get(advisory.id);

    if (!acceptance || !isAcceptanceDocumented(advisory.id, acceptance)) {
      blockingFindings.push({
        name: vulnerability.name,
        severity,
        advisory,
        reason: "high vulnerability is not explicitly risk-accepted",
      });
      continue;
    }

    if (new Date(`${acceptance.expires}T00:00:00Z`) < new Date()) {
      blockingFindings.push({
        name: vulnerability.name,
        severity,
        advisory,
        reason: `risk acceptance expired on ${acceptance.expires}`,
      });
      continue;
    }

    acceptedFindings.push({
      name: vulnerability.name,
      severity,
      advisory,
      acceptance,
    });
  }
}

if (blockingFindings.length > 0) {
  console.error("Security audit failed:");
  for (const finding of blockingFindings) {
    console.error(
      `- ${finding.severity.toUpperCase()} ${finding.name} ${finding.advisory.id}: ${finding.reason}`,
    );
  }
  process.exit(1);
}

if (acceptedFindings.length > 0) {
  console.warn("Security audit passed with documented high-risk acceptances:");
  for (const finding of acceptedFindings) {
    console.warn(
      `- ${finding.name} ${finding.advisory.id}, expires ${finding.acceptance.expires}`,
    );
  }
}

console.log("Security audit passed: no unaccepted high or critical vulnerabilities.");

async function runAudit() {
  try {
    const { stdout } = await execFileAsync("npm", ["audit", "--json"], {
      maxBuffer: 1024 * 1024 * 10,
    });
    return JSON.parse(stdout);
  } catch (error) {
    if (error && typeof error === "object" && "stdout" in error) {
      const stdout = String(error.stdout ?? "");
      if (stdout.trim()) {
        return JSON.parse(stdout);
      }
    }

    throw error;
  }
}

function getAdvisories(vulnerability) {
  return (vulnerability.via ?? [])
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => ({
      id: entry.url?.match(/GHSA-[a-z0-9-]+/)?.[0] ?? entry.source?.toString(),
      title: entry.title,
      url: entry.url,
    }))
    .filter((entry) => entry.id);
}

function isAcceptanceDocumented(advisoryId, acceptance) {
  return (
    policy.includes(advisoryId) &&
    policy.includes(acceptance.dependency) &&
    policy.includes(acceptance.path) &&
    policy.includes(acceptance.expires)
  );
}
