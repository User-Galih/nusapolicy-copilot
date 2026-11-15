import { NextResponse } from "next/server";
import { auditAndRewritePolicy } from "../../../../lib/serverless-rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const draftText =
      typeof body?.draft_text === "string" ? body.draft_text.trim() : "";
    const framework = body?.framework || "full";

    if (!draftText) {
      return NextResponse.json(
        { detail: "Teks draf kebijakan atau kontrak tidak boleh kosong." },
        { status: 400 }
      );
    }

    const result = await auditAndRewritePolicy(draftText, framework);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: (error as Error).message || "Audit gagal diproses." },
      { status: 500 }
    );
  }
}
