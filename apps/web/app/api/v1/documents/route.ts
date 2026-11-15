import { NextResponse } from "next/server";
import { loadPolicyCorpus } from "../../../../lib/serverless-rag";

export const runtime = "nodejs";

export async function GET() {
  const { documents } = loadPolicyCorpus();
  return NextResponse.json(documents);
}
