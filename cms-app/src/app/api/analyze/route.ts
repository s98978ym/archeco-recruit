import { NextRequest, NextResponse } from 'next/server';
import { getFileContent, getFileBuffer } from '@/lib/google-drive';
import { analyzeDocuments } from '@/lib/openai';
import type { DriveFile } from '@/types';

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get('x-access-token');
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { minutes, transcripts, photos } = (await req.json()) as {
      minutes: DriveFile[];
      transcripts: DriveFile[];
      photos: DriveFile[];
    };

    // Fetch text content from documents
    const textDocs = [...minutes, ...transcripts];
    const texts: string[] = [];
    for (const doc of textDocs) {
      const content = await getFileContent(accessToken, doc.id, doc.mimeType);
      if (content) {
        texts.push(`【${doc.name}】\n${content}`);
      }
    }

    // Fetch photos as base64 (max 5 for token efficiency)
    const photoBase64List: string[] = [];
    const photoSubset = photos.slice(0, 5);
    for (const photo of photoSubset) {
      const buffer = await getFileBuffer(accessToken, photo.id);
      photoBase64List.push(buffer.toString('base64'));
    }

    const analysis = await analyzeDocuments(texts, photoBase64List);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
