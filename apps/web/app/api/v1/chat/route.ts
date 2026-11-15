import { NextResponse } from "next/server";
import { answerPolicyQuestion } from "../../../../lib/serverless-rag";
import { CustomUploadedDoc, WorkspaceId } from "../../../../lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    const workspaceId: WorkspaceId = body?.workspace_id || "all";
    const customDocs: CustomUploadedDoc[] = Array.isArray(body?.custom_documents)
      ? body.custom_documents
      : [];

    if (!question) {
      return NextResponse.json(
        { detail: "Pertanyaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const result = await answerPolicyQuestion(question, workspaceId, customDocs);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
