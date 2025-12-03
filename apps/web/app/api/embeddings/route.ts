import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const { texts } = await request.json();
    
    if (!Array.isArray(texts) || !texts.length) {
      return NextResponse.json(
        { error: 'texts array is required' },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey });
    
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 256
    });

    return NextResponse.json({
      embeddings: response.data.map(d => d.embedding)
    });
  } catch (error) {
    console.error('Embedding error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    );
  }
}

