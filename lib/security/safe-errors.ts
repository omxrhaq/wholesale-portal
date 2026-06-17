const DEFAULT_FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export function safeUserFacingErrorMessage(
  error: unknown,
  fallback = DEFAULT_FALLBACK_MESSAGE,
) {
  if (error instanceof Error) {
    return fallback;
  }

  return fallback;
}

