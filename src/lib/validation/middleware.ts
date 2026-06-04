import { NextRequest } from "next/server";
import { z, ZodSchema } from "zod";
import { ValidationError } from "@/lib/api-errors";

// ── Parse Request Body ────────────────────────────────────────────────

export async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch (error) {
    throw new ValidationError("Invalid JSON in request body");
  }
}

// ── Validate Body ─────────────────────────────────────────────────────

export async function validateBody<T extends ZodSchema>(
  req: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  const body = await parseBody(req);

  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = (error as any).errors.map(
        (err: any) => `${err.path.join(".")}: ${err.message}`
      );
      throw new ValidationError(messages.join(", "));
    }
    throw new ValidationError("Validation failed");
  }
}

// ── Validate Query Parameters ─────────────────────────────────────────

export function validateQuery<T extends ZodSchema>(
  req: NextRequest,
  schema: T
): z.infer<T> {
  const { searchParams } = new URL(req.url);
  const query: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    query[key] = value;
  });

  try {
    return schema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = (error as any).errors.map(
        (err: any) => `${err.path.join(".")}: ${err.message}`
      );
      throw new ValidationError(messages.join(", "));
    }
    throw new ValidationError("Query validation failed");
  }
}

// ── Validate Path Parameters ──────────────────────────────────────────

export function validateParams<T extends ZodSchema>(
  params: Record<string, string | string[]>,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = (error as any).errors.map(
        (err: any) => `${err.path.join(".")}: ${err.message}`
      );
      throw new ValidationError(messages.join(", "));
    }
    throw new ValidationError("Path parameter validation failed");
  }
}

// ── Validate Partial ──────────────────────────────────────────────────

export async function validatePartialBody<T extends ZodSchema>(
  req: NextRequest,
  schema: T
): Promise<Partial<z.infer<T>>> {
  const body = await parseBody(req);

  try {
    return (schema as any).partial().parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = (error as any).errors.map(
        (err: any) => `${err.path.join(".")}: ${err.message}`
      );
      throw new ValidationError(messages.join(", "));
    }
    throw new ValidationError("Validation failed");
  }
}

// ── Safe Parse (No Throw) ─────────────────────────────────────────────

export async function safeParseBody<T extends ZodSchema>(
  req: NextRequest,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: string }> {
  try {
    const body = await parseBody(req);
    const result = schema.safeParse(body);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const messages = (result.error as any).errors.map(
        (err: any) => `${err.path.join(".")}: ${err.message}`
      );
      return { success: false, error: messages.join(", ") };
    }
  } catch {
    return { success: false, error: "Invalid request body" };
  }
}

// ── Validate File Upload ──────────────────────────────────────────────

export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): void {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes,
    allowedExtensions,
  } = options;

  // Check file size
  if (file.size > maxSize) {
    throw new ValidationError(
      `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`
    );
  }

  // Check file type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    throw new ValidationError(
      `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(", ")}`
    );
  }

  // Check file extension
  if (allowedExtensions) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new ValidationError(
        `File extension .${extension} not allowed. Allowed: ${allowedExtensions.join(", ")}`
      );
    }
  }
}

// ── Common Validators ─────────────────────────────────────────────────

export const IdParamSchema = z.object({
  id: z.string().cuid("Invalid ID format"),
});

export const UserIdParamSchema = z.object({
  userId: z.string().cuid("Invalid user ID format"),
});

export const ProjectIdParamSchema = z.object({
  projectId: z.string().cuid("Invalid project ID format"),
});

export function validateId(id: string, name: string = "ID"): string {
  const result = z.string().cuid().safeParse(id);
  if (!result.success) {
    throw new ValidationError(`Invalid ${name} format`);
  }
  return result.data;
}
