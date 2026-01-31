import OpenAI from 'openai';
import type {
  TargetAudience,
  ArticleTaste,
  AnalysisResult,
  GeneratedArticle,
  TARGET_LABELS,
  TASTE_LABELS,
} from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeDocuments(
  texts: string[],
  photoBase64List: string[]
): Promise<AnalysisResult> {
  const textContent = texts.join('\n\n---\n\n');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `あなたは企業ブログの編集アシスタントです。提供された議事録・トランスクリプト・写真を分析し、ブログ記事の素材として要約してください。

以下のJSON形式で回答してください:
{
  "summary": "内容の要約（200文字程度）",
  "keyTopics": ["主要トピック1", "トピック2", ...],
  "suggestedTitle": "推奨タイトル",
  "suggestedCategory": "インタビュー|社風|制度|イベント のいずれか",
  "photoDescriptions": ["写真1の説明", "写真2の説明", ...]
}`,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `以下のドキュメントを分析してください:\n\n${textContent}`,
        },
        ...photoBase64List.map(
          (base64) =>
            ({
              type: 'image_url' as const,
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            })
        ),
      ],
    },
  ];

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  return JSON.parse(res.choices[0].message.content || '{}') as AnalysisResult;
}

export async function generateArticle(params: {
  analysis: AnalysisResult;
  target: TargetAudience;
  taste: ArticleTaste;
  wordCount: number;
  targetLabels: Record<string, string>;
  tasteLabels: Record<string, string>;
}): Promise<GeneratedArticle> {
  const { analysis, target, taste, wordCount, targetLabels, tasteLabels } =
    params;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `あなたはプロのブログライターです。提供された分析結果をもとにブログ記事を生成してください。

ターゲット読者: ${targetLabels[target]}
テイスト: ${tasteLabels[taste]}
目標文字数: 約${wordCount}文字

以下のJSON形式で回答してください:
{
  "title": "記事タイトル",
  "lead": "リード文（100-150文字）",
  "content": "本文（HTML形式。h2, h3, p, ul, li, blockquote タグを使用）",
  "category": "インタビュー|社風|制度|イベント のいずれか"
}

注意事項:
- HTMLの本文には画像の挿入位置を <!-- IMAGE:0 --> <!-- IMAGE:1 --> のようなコメントで示してください
- 記事は読みやすく、段落を適切に分けてください
- ターゲットに合わせた言葉遣いを使ってください`,
      },
      {
        role: 'user',
        content: `以下の分析結果からブログ記事を生成してください:\n\n${JSON.stringify(analysis, null, 2)}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const article = JSON.parse(
    res.choices[0].message.content || '{}'
  ) as GeneratedArticle;
  article.insertImages = [];
  return article;
}

export async function generateEyecatchPrompt(
  title: string,
  summary: string,
  additionalInstructions?: string
): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'ブログ記事のアイキャッチ画像を生成するためのDALL-E用プロンプトを英語で作成してください。写真のようなリアルなスタイルで、企業ブログにふさわしいプロフェッショナルな画像にしてください。プロンプトのみを回答してください。',
      },
      {
        role: 'user',
        content: `タイトル: ${title}\n概要: ${summary}${additionalInstructions ? `\n追加指示: ${additionalInstructions}` : ''}`,
      },
    ],
    max_tokens: 500,
  });

  return res.choices[0].message.content || '';
}

export async function generateImage(prompt: string): Promise<string> {
  const res = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1792x1024',
    quality: 'hd',
  });

  return res.data[0].url || '';
}
