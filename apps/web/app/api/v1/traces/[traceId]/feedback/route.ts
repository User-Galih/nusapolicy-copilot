import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: { traceId: string } }
) {
  try {
    const body = await request.json();
    return NextResponse.json({
      id: crypto.randomUUID(),
      trace_id: context.params.traceId,
      rating: body?.rating || "helpful",
    });
  } catch {
    return NextResponse.json({ status: "recorded" });
  }
}
