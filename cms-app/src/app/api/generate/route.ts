import { NextRequest, NextResponse } from 'next/server';
import {
  generateArticle,
  generateEyecatchPrompt,
  generateImage,
} from '@/lib/openai';
import {
  optimizeEyecatch,
  optimizeInsertImage,
  fetchImageAsBuffer,
} from '@/lib/image';
import { getFileBuffer } from '@/lib/google-drive';
import { uploadImageToCms } from '@/lib/microcms';
import { TARGET_LABELS, TASTE_LABELS } from '@/types';
import type {
  AnalysisResult,
  TargetAudience,
  ArticleTaste,
  DriveFile,
} from '@/types';

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get('x-access-token');
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      analysis,
      target,
      taste,
      wordCount,
      eyecatchInstructions,
      photos,
    } = (await req.json()) as {
      analysis: AnalysisResult;
      target: TargetAudience;
      taste: ArticleTaste;
      wordCount: number;
      eyecatchInstructions?: string;
      photos: DriveFile[];
    };

    // 1. Generate article text
    const article = await generateArticle({
      analysis,
      target,
      taste,
      wordCount,
      targetLabels: TARGET_LABELS,
      tasteLabels: TASTE_LABELS,
    });

    // 2. Generate & optimize eyecatch image
    const eyecatchPrompt = await generateEyecatchPrompt(
      article.title,
      analysis.summary,
      eyecatchInstructions
    );
    const eyecatchUrl = await generateImage(eyecatchPrompt);
    const eyecatchBuffer = await fetchImageAsBuffer(eyecatchUrl);
    const optimizedEyecatch = await optimizeEyecatch(eyecatchBuffer);
    const eyecatchCmsUrl = await uploadImageToCms(
      optimizedEyecatch,
      'eyecatch.webp'
    );
    article.eyecatchUrl = eyecatchCmsUrl;

    // 3. Optimize and upload insert photos from Drive
    const insertImageUrls: string[] = [];
    const photoSubset = photos.slice(0, 5);
    for (let i = 0; i < photoSubset.length; i++) {
      const buffer = await getFileBuffer(accessToken, photoSubset[i].id);
      const optimized = await optimizeInsertImage(buffer);
      const url = await uploadImageToCms(optimized, `insert-${i}.webp`);
      insertImageUrls.push(url);
    }
    article.insertImages = insertImageUrls;

    // 4. Replace image placeholders in content
    let finalContent = article.content;
    insertImageUrls.forEach((url, i) => {
      finalContent = finalContent.replace(
        `<!-- IMAGE:${i} -->`,
        `<figure><img src="${url}" alt="" loading="lazy" />${analysis.photoDescriptions?.[i] ? `<figcaption>${analysis.photoDescriptions[i]}</figcaption>` : ''}</figure>`
      );
    });
    article.content = finalContent;

    return NextResponse.json({ article });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    );
  }
}
