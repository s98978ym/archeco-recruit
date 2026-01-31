import { NextRequest, NextResponse } from 'next/server';
import { publishToCms } from '@/lib/microcms';

export async function POST(req: NextRequest) {
  try {
    const { title, content, eyecatch, category, description } =
      await req.json();

    const result = await publishToCms({
      title,
      content,
      eyecatch,
      category,
      description,
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}
