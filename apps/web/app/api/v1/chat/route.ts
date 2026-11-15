import { NextResponse } from "next/server";
import { answerPolicyQuestion } from "../../../../lib/serverless-rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) {
      return NextResponse.json(
        { detail: "Pertanyaan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const result = await answerPolicyQuestion(question);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
