export const securityCategories = [
  "auth",
  "authorization",
  "idor",
  "xss",
  "csrf",
  "uploads",
  "rate-limit",
  "tenant-isolation",
  "ai",
] as const;

export const pullRequestSecurityQuestions = [
  "authentication impact?",
  "authorization impact?",
  "data exposure risk?",
  "AI access risk?",
  "security tests added?",
] as const;

export const forbiddenRuntimePatterns = [
  "dangerouslySetInnerHTML",
  "SUPABASE_SERVICE_ROLE_KEY",
  "raw_user_meta_data",
] as const;

export const forbiddenDependencies = ["xlsx"] as const;

export const permanentRegressionRule =
  "Every discovered vulnerability must receive a permanent regression test in tests/security.";

export function isKnownSecurityCategory(category: string) {
  return securityCategories.includes(
    category as (typeof securityCategories)[number],
  );
}

export function normalizeSecurityAnswer(answer: string) {
  return answer.trim().toLowerCase();
}
