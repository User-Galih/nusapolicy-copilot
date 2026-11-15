import { NextResponse } from "next/server";
import { loadPolicyCorpus } from "../../../../../lib/serverless-rag";

export const runtime = "nodejs";

export async function POST() {
  const { documents } = loadPolicyCorpus(true);
  return NextResponse.json({ indexed_documents: documents });
}
