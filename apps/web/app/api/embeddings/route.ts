import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new OpenAI({ apiKey });
}

export async function POST(request: NextRequest) {
  try {
    const { texts } = await request.json();

    if (!Array.isArray(texts) || !texts.length) {
      return NextResponse.json(
        { error: "texts array is required" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: 256,
    });

    return NextResponse.json({
      embeddings: response.data.map((d) => d.embedding),
    });
  } catch (error) {
    console.error("Embedding error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate embeddings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
