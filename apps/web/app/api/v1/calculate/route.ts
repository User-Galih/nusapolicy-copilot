import { NextResponse } from "next/server";
import { calculateStatutoryAndGenerateLetter } from "../../../../lib/serverless-rag";
import { StatutoryCalculationInput } from "../../../../lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StatutoryCalculationInput;
    const result = calculateStatutoryAndGenerateLetter(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: (error as Error).message || "Kalkulasi gagal diproses." },
      { status: 500 }
    );
  }
}
