import { NextResponse } from "next/server";

// ── Type Guards ────────────────────────────────────────────────────

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── String Validators ──────────────────────────────────────────────

export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    trim?: boolean;
  } = {}
): { value: string | null; error: NextResponse | null } {
  const { required = false, minLength, maxLength, pattern, trim = true } = options;

  if (value === null || value === undefined) {
    if (required) {
      return {
        value: null,
        error: NextResponse.json(
          { error: `${fieldName} is required` },
          { status: 400 }
        ),
      };
    }
    return { value: null, error: null };
  }

  if (!isString(value)) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be a string` },
        { status: 400 }
      ),
    };
  }

  const str = trim ? value.trim() : value;

  if (required && !str) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} cannot be empty` },
        { status: 400 }
      ),
    };
  }

  if (minLength !== undefined && str.length < minLength) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be at least ${minLength} characters` },
        { status: 400 }
      ),
    };
  }

  if (maxLength !== undefined && str.length > maxLength) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be at most ${maxLength} characters` },
        { status: 400 }
      ),
    };
  }

  if (pattern && !pattern.test(str)) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} has invalid format` },
        { status: 400 }
      ),
    };
  }

  return { value: str || null, error: null };
}

// ── Number Validators ──────────────────────────────────────────────

export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): { value: number | null; error: NextResponse | null } {
  const { required = false, min, max, integer = false } = options;

  if (value === null || value === undefined) {
    if (required) {
      return {
        value: null,
        error: NextResponse.json(
          { error: `${fieldName} is required` },
          { status: 400 }
        ),
      };
    }
    return { value: null, error: null };
  }

  let num: number;

  if (isNumber(value)) {
    num = value;
  } else if (isString(value)) {
    num = Number(value);
    if (!Number.isFinite(num)) {
      return {
        value: null,
        error: NextResponse.json(
          { error: `${fieldName} must be a valid number` },
          { status: 400 }
        ),
      };
    }
  } else {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be a number` },
        { status: 400 }
      ),
    };
  }

  if (integer && !Number.isInteger(num)) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be an integer` },
        { status: 400 }
      ),
    };
  }

  if (min !== undefined && num < min) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be at least ${min}` },
        { status: 400 }
      ),
    };
  }

  if (max !== undefined && num > max) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be at most ${max}` },
        { status: 400 }
      ),
    };
  }

  return { value: num, error: null };
}

// ── Enum Validators ────────────────────────────────────────────────

export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  validValues: readonly T[],
  options: { required?: boolean } = {}
): { value: T | null; error: NextResponse | null } {
  const { required = false } = options;

  if (value === null || value === undefined) {
    if (required) {
      return {
        value: null,
        error: NextResponse.json(
          { error: `${fieldName} is required` },
          { status: 400 }
        ),
      };
    }
    return { value: null, error: null };
  }

  if (!isString(value)) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be a string` },
        { status: 400 }
      ),
    };
  }

  const normalized = value.toUpperCase() as T;

  if (!validValues.includes(normalized)) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be one of: ${validValues.join(", ")}` },
        { status: 400 }
      ),
    };
  }

  return { value: normalized, error: null };
}

// ── Array Validators ───────────────────────────────────────────────

export function validateArray(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    uniqueItems?: boolean;
  } = {}
): { value: unknown[] | null; error: NextResponse | null } {
  const { required = false, minLength, maxLength, uniqueItems = false } = options;

  if (value === null || value === undefined) {
    if (required) {
      return {
        value: null,
        error: NextResponse.json(
          { error: `${fieldName} is required` },
          { status: 400 }
        ),
      };
    }
    return { value: null, error: null };
  }

  if (!isArray(value)) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be an array` },
        { status: 400 }
      ),
    };
  }

  if (minLength !== undefined && value.length < minLength) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must have at least ${minLength} items` },
        { status: 400 }
      ),
    };
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must have at most ${maxLength} items` },
        { status: 400 }
      ),
    };
  }

  if (uniqueItems) {
    const unique = new Set(value);
    if (unique.size !== value.length) {
      return {
        value: null,
        error: NextResponse.json(
          { error: `${fieldName} must have unique items` },
          { status: 400 }
        ),
      };
    }
  }

  return { value, error: null };
}

// ── Email Validator ────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(
  value: unknown,
  fieldName: string = "Email",
  options: { required?: boolean } = {}
): { value: string | null; error: NextResponse | null } {
  return validateString(value, fieldName, {
    ...options,
    pattern: EMAIL_REGEX,
    maxLength: 255,
  });
}

// ── URL Validator ──────────────────────────────────────────────────

export function validateUrl(
  value: unknown,
  fieldName: string = "URL",
  options: { required?: boolean; allowedProtocols?: string[] } = {}
): { value: string | null; error: NextResponse | null } {
  const { required = false, allowedProtocols = ["http", "https"] } = options;

  const { value: str, error } = validateString(value, fieldName, {
    required,
    maxLength: 2048,
  });

  if (error) return { value: null, error };
  if (!str) return { value: null, error: null };

  try {
    const url = new URL(str);
    if (!allowedProtocols.includes(url.protocol.replace(":", ""))) {
      return {
        value: null,
        error: NextResponse.json(
          { error: `${fieldName} must use ${allowedProtocols.join(" or ")} protocol` },
          { status: 400 }
        ),
      };
    }
    return { value: str, error: null };
  } catch {
    return {
      value: null,
      error: NextResponse.json(
        { error: `${fieldName} must be a valid URL` },
        { status: 400 }
      ),
    };
  }
}

// ── Sanitization ───────────────────────────────────────────────────

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeForSql(input: string): string {
  // Remove SQL injection patterns
  return input.replace(/['";\\]/g, "");
}
