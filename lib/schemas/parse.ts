import { z } from 'zod';
import { NextResponse } from 'next/server';
import { demoError, readJsonObject } from '@/lib/demo-http';

export type FieldIssue = { path: string; message: string };

export function zodIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

export function parseSchema<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; issues: FieldIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, issues: zodIssues(result.error) };
}

export function parseDemoSchema<T>(
  request: Request,
  schema: z.ZodType<T>,
  data: unknown
): T | NextResponse {
  const parsed = parseSchema(schema, data);
  if (!parsed.success) {
    return demoError(request, 'Invalid request', 'VALIDATION_ERROR', 400, {
      issues: parsed.issues,
    });
  }
  return parsed.data;
}

export async function readDemoSchema<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T | NextResponse> {
  const raw = await readJsonObject(request);
  if (raw instanceof Response) return raw;
  return parseDemoSchema(request, schema, raw);
}

export function parseSearchParams<T>(
  request: Request,
  schema: z.ZodType<T>,
  params: URLSearchParams
): T | NextResponse {
  const raw: Record<string, string> = {};
  params.forEach((value, key) => {
    if (value.trim()) raw[key] = value;
  });
  return parseDemoSchema(request, schema, raw);
}

export function validationJson(issues: FieldIssue[]): NextResponse {
  return NextResponse.json(
    { error: 'Invalid request', code: 'VALIDATION_ERROR', issues },
    { status: 400 }
  );
}
