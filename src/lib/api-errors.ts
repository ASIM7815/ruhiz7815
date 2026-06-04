import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// ── Error Types ────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Authentication required") {
    super(401, message, "AUTHENTICATION_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = "Permission denied") {
    super(403, message, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = "Too many requests") {
    super(429, message, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
  }
}

// ── Error Response Builder ─────────────────────────────────────────

interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  timestamp?: string;
}

export function buildErrorResponse(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
  };

  if (code) response.code = code;
  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }

  return NextResponse.json(response, { status: statusCode });
}

// ── Prisma Error Handler ───────────────────────────────────────────

export function handlePrismaError(error: unknown): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        const field = target?.[0] || "field";
        return buildErrorResponse(
          `A record with this ${field} already exists`,
          409,
          "UNIQUE_CONSTRAINT_VIOLATION"
        );
      }
      case "P2025": {
        // Record not found
        return buildErrorResponse(
          "Record not found",
          404,
          "RECORD_NOT_FOUND"
        );
      }
      case "P2003": {
        // Foreign key constraint violation
        return buildErrorResponse(
          "Related record not found",
          400,
          "FOREIGN_KEY_VIOLATION"
        );
      }
      case "P2014": {
        // Required relation violation
        return buildErrorResponse(
          "Invalid relation",
          400,
          "RELATION_VIOLATION"
        );
      }
      default: {
        console.error("[Prisma Error]", error.code, error.message);
        return buildErrorResponse(
          "Database operation failed",
          500,
          error.code
        );
      }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return buildErrorResponse(
      "Invalid data provided",
      400,
      "VALIDATION_ERROR"
    );
  }

  return buildErrorResponse("Database error", 500, "DATABASE_ERROR");
}

// ── Generic Error Handler ──────────────────────────────────────────

export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  // Custom API errors
  if (error instanceof ApiError) {
    return buildErrorResponse(error.message, error.statusCode, error.code);
  }

  // Prisma errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    return handlePrismaError(error);
  }

  // Standard errors
  if (error instanceof Error) {
    // Development: show full error
    if (process.env.NODE_ENV === "development") {
      return buildErrorResponse(
        error.message,
        500,
        "INTERNAL_ERROR",
        error.stack
      );
    }
    // Production: generic message
    return buildErrorResponse(
      "An unexpected error occurred",
      500,
      "INTERNAL_ERROR"
    );
  }

  // Unknown error type
  return buildErrorResponse(
    "An unexpected error occurred",
    500,
    "UNKNOWN_ERROR"
  );
}

// ── Try-Catch Wrapper ──────────────────────────────────────────────

export async function tryCatch<T>(
  fn: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: handleApiError(error) };
  }
}

// ── Success Response Builder ───────────────────────────────────────

export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<T> {
  return NextResponse.json(data, { status: statusCode });
}

// ── Logging Helpers ────────────────────────────────────────────────

export function logApiRequest(
  method: string,
  path: string,
  userId?: string
): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${method} ${path} | User: ${userId || "anonymous"}`);
}

export function logApiError(
  method: string,
  path: string,
  error: unknown,
  userId?: string
): void {
  const timestamp = new Date().toISOString();
  console.error(
    `[${timestamp}] ERROR ${method} ${path} | User: ${userId || "anonymous"}`,
    error
  );
}
