function pickMessage(error: unknown): string | null {
  if (typeof error === "string" && error.trim()) return error;

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (Array.isArray(error)) {
    for (const item of error) {
      const message = pickMessage(item);
      if (message) return message;
    }
    return null;
  }

  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    const maybeFields = (error as { fields?: unknown }).fields;
    if (maybeFields && typeof maybeFields === "object") {
      for (const fieldValue of Object.values(
        maybeFields as Record<string, unknown>,
      )) {
        const message = pickMessage(fieldValue);
        if (message) return message;
      }
    }
  }

  return null;
}

export function firstErrorMessage(errors: unknown[] | undefined): string | null {
  if (!errors) return null;

  for (const error of errors) {
    const message = pickMessage(error);
    if (message) return message;
  }

  return null;
}
