#!/usr/bin/env node
/**
 * microCMS ブログ記事自動登録スクリプト
 *
 * 使い方:
 *   node scripts/post-blog.mjs --text blog.docx --images eyecatch.jpg [options]
 *   node scripts/post-blog.mjs --text blog.txt --images eyecatch.jpg [options]
 *
 * 対応ファイル:
 *   .docx  Word ファイル (本文HTML + 埋め込み画像を自動抽出)
 *   .txt   テキストファイル (簡易Markdown → HTML変換)
 *   .md    Markdownファイル (同上)
 *
 * オプション:
 *   --text, -t        ブログ本文ファイル (.docx / .txt / .md) (必須)
 *   --images, -i      アイキャッチ用の画像ファイル (複数指定可、最適なものを選定)
 *   --title            タイトル (省略時: 本文から自動生成)
 *   --category, -c     カテゴリ: インタビュー / 社風 / 制度 / イベント (省略時: 本文から自動判定)
 *   --writer, -w       ライター名
 *   --featured         おすすめフラグ (指定すると true)
 *   --dry-run          実際に登録せず内容を確認
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from 'microcms-js-sdk';
import mammoth from 'mammoth';

// ── 環境変数の読み込み ──
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

const MICROCMS_SERVICE_DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN;
const MICROCMS_API_KEY = process.env.MICROCMS_API_KEY;

if (!MICROCMS_SERVICE_DOMAIN || !MICROCMS_API_KEY) {
  console.error('エラー: MICROCMS_SERVICE_DOMAIN と MICROCMS_API_KEY を .env に設定してください。');
  process.exit(1);
}

const client = createClient({
  serviceDomain: MICROCMS_SERVICE_DOMAIN,
  apiKey: MICROCMS_API_KEY,
});

// ── カテゴリ定義 ──
const CATEGORIES = ['インタビュー', '社風', '制度', 'イベント'];

const CATEGORY_KEYWORDS = {
  'インタビュー': ['インタビュー', '聞いて', '話を', 'Q&A', '質問', '入社理由', '一日の流れ', '先輩', '社員紹介'],
  '社風': ['社風', '雰囲気', 'カルチャー', '文化', 'チーム', '職場', 'オフィス', '働き方', 'コミュニケーション'],
  '制度': ['制度', '福利厚生', '研修', '評価', '休暇', '手当', 'キャリア', '教育', '支援'],
  'イベント': ['イベント', '懇親会', '勉強会', 'セミナー', '交流', '開催', '参加', 'ハッカソン', '忘年会'],
};

// ── 引数パース ──
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { images: [], featured: false, dryRun: false };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case '--text':
      case '-t':
        opts.text = args[++i];
        break;
      case '--images':
      case '-i':
        i++;
        while (i < args.length && !args[i].startsWith('-')) {
          opts.images.push(args[i]);
          i++;
        }
        continue;
      case '--title':
        opts.title = args[++i];
        break;
      case '--category':
      case '-c':
        opts.category = args[++i];
        break;
      case '--writer':
      case '-w':
        opts.writer = args[++i];
        break;
      case '--featured':
        opts.featured = true;
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      default:
        console.warn(`不明なオプション: ${arg}`);
    }
    i++;
  }
  return opts;
}

// ── 画像をmicroCMSにアップロード ──
async function uploadImageBuffer(buffer, contentType, fileName) {
  const res = await fetch(
    `https://${MICROCMS_SERVICE_DOMAIN}.microcms-management.io/api/v1/media`,
    {
      method: 'POST',
      headers: {
        'X-MICROCMS-API-KEY': MICROCMS_API_KEY,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`画像アップロード失敗 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.url;
}

async function uploadImageFile(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  const contentType = mimeMap[ext] || 'image/jpeg';
  const fileName = path.basename(imagePath);
  const imageData = fs.readFileSync(imagePath);
  return uploadImageBuffer(imageData, contentType, fileName);
}

// ── Word (.docx) ファイルを処理 ──
async function processDocx(filePath, dryRun) {
  const buffer = fs.readFileSync(filePath);
  let imageIndex = 0;
  const embeddedImages = [];

  // mammoth で docx → HTML 変換（埋め込み画像もアップロード）
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        imageIndex++;
        const ext = image.contentType === 'image/png' ? '.png' : '.jpg';
        const fileName = `docx-image-${imageIndex}${ext}`;

        if (dryRun) {
          console.log(`  画像検出: ${fileName} (${image.contentType})`);
          embeddedImages.push({ fileName, contentType: image.contentType });
          return { src: `[画像: ${fileName}]` };
        }

        try {
          const imgBuffer = await image.read();
          const url = await uploadImageBuffer(Buffer.from(imgBuffer), image.contentType, fileName);
          console.log(`  画像アップロード: ${fileName} → ${url}`);
          embeddedImages.push({ fileName, contentType: image.contentType, url });
          return { src: url };
        } catch (e) {
          console.error(`  画像アップロード失敗: ${fileName} - ${e.message}`);
          return { src: '' };
        }
      }),
    }
  );

  // テキスト版を取得（カテゴリ判定・タイトル生成用）
  const textResult = await mammoth.extractRawText({ buffer });
  const rawText = textResult.value;

  if (result.messages.length > 0) {
    console.log('Word変換メッセージ:');
    for (const msg of result.messages) {
      console.log(`  ${msg.type}: ${msg.message}`);
    }
  }

  return {
    html: result.value,
    rawText,
    embeddedImages,
  };
}

// ── テキスト/Markdown からプレーンテキストとHTMLを生成 ──
function processText(filePath) {
  const rawText = fs.readFileSync(filePath, 'utf-8');
  const html = textToHtml(rawText);
  return { html, rawText, embeddedImages: [] };
}

// ── プレーンテキストからタイトルを自動生成 ──
function generateTitle(text) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '無題の記事';
  let title = lines[0].replace(/^#+\s*/, '').trim();
  if (title.length > 60) title = title.slice(0, 57) + '...';
  return title;
}

// ── プレーンテキストからカテゴリを自動判定 ──
function detectCategory(text) {
  const scores = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw, 'gi');
      const matches = text.match(regex);
      if (matches) scores[cat] += matches.length;
    }
  }

  let best = CATEGORIES[0];
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

// ── プレーンテキストからリード文を自動生成 ──
function generateDescription(text) {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const body = lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
  if (!body) return '';
  if (body.length <= 120) return body;
  return body.slice(0, 117) + '...';
}

// ── テキストを HTML に変換 (簡易 Markdown → HTML) ──
function textToHtml(text) {
  const lines = text.split('\n');
  const html = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    const h3 = line.match(/^###\s+(.+)/);
    if (h3) { closeList(); html.push(`<h3>${esc(h3[1])}</h3>`); continue; }
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) { closeList(); html.push(`<h2>${esc(h2[1])}</h2>`); continue; }
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) { closeList(); html.push(`<h1>${esc(h1[1])}</h1>`); continue; }

    const li = line.match(/^[-*]\s+(.+)/);
    if (li) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${esc(li[1])}</li>`);
      continue;
    } else if (inList) {
      closeList();
    }

    if (line.trim() === '') { closeList(); continue; }
    html.push(`<p>${esc(line)}</p>`);
  }
  closeList();
  return html.join('\n');

  function closeList() {
    if (inList) { html.push('</ul>'); inList = false; }
  }
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// ── アイキャッチ画像を選定 ──
function selectBestImage(imagePaths) {
  if (imagePaths.length === 0) return null;
  if (imagePaths.length === 1) return imagePaths[0];

  let best = imagePaths[0];
  let bestSize = 0;
  for (const p of imagePaths) {
    try {
      const stat = fs.statSync(p);
      if (stat.size > bestSize) {
        bestSize = stat.size;
        best = p;
      }
    } catch {
      // skip
    }
  }
  return best;
}

// ── メイン処理 ──
async function main() {
  const opts = parseArgs();

  if (!opts.text) {
    console.error('エラー: --text (-t) でブログ本文ファイルを指定してください。');
    console.error('使い方:');
    console.error('  node scripts/post-blog.mjs --text blog.docx --images eyecatch.jpg');
    console.error('  node scripts/post-blog.mjs --text blog.txt --images eyecatch.jpg');
    process.exit(1);
  }

  if (!fs.existsSync(opts.text)) {
    console.error(`エラー: ファイルが見つかりません: ${opts.text}`);
    process.exit(1);
  }

  // ファイル形式に応じて処理
  const ext = path.extname(opts.text).toLowerCase();
  let html, rawText, embeddedImages;

  console.log('═══════════════════════════════════════');
  console.log('  microCMS ブログ記事 自動登録');
  console.log('═══════════════════════════════════════');

  if (ext === '.docx') {
    console.log(`入力形式:     Word (.docx)`);
    console.log(`ファイル:     ${opts.text}`);
    console.log('───────────────────────────────────────');
    console.log('Word ファイルを処理中...');
    const result = await processDocx(opts.text, opts.dryRun);
    html = result.html;
    rawText = result.rawText;
    embeddedImages = result.embeddedImages;
    console.log(`埋め込み画像: ${embeddedImages.length}件`);
  } else {
    console.log(`入力形式:     テキスト (${ext})`);
    console.log(`ファイル:     ${opts.text}`);
    console.log('───────────────────────────────────────');
    const result = processText(opts.text);
    html = result.html;
    rawText = result.rawText;
    embeddedImages = result.embeddedImages;
  }

  // フィールド自動生成
  const title = opts.title || generateTitle(rawText);
  const category = opts.category || detectCategory(rawText);
  const description = generateDescription(rawText);

  if (!CATEGORIES.includes(category)) {
    console.error(`エラー: カテゴリは次のいずれかを指定してください: ${CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  console.log('───────────────────────────────────────');
  console.log(`タイトル:     ${title}`);
  console.log(`カテゴリ:     ${category}`);
  console.log(`リード文:     ${description}`);
  console.log(`ライター:     ${opts.writer || '(未設定)'}`);
  console.log(`おすすめ:     ${opts.featured}`);
  console.log(`アイキャッチ: ${opts.images.length}枚の候補`);
  console.log('───────────────────────────────────────');

  // アイキャッチ画像アップロード
  let eyecatch = undefined;
  if (opts.images.length > 0) {
    const bestImage = selectBestImage(opts.images);
    console.log(`アイキャッチ選定: ${path.basename(bestImage)}`);

    if (!opts.dryRun) {
      try {
        const url = await uploadImageFile(bestImage);
        eyecatch = url;
        console.log(`アップロード完了: ${url}`);
      } catch (e) {
        console.error(`画像アップロードエラー: ${e.message}`);
        console.log('アイキャッチなしで続行します。');
      }
    } else {
      console.log('(dry-run: 画像アップロードをスキップ)');
    }
  }

  // 記事データ組み立て
  const postData = {
    title,
    content: html,
    category: [category],
    description,
    is_featured: opts.featured,
  };
  if (opts.writer) postData.writer = opts.writer;
  if (eyecatch) postData.eyecatch = eyecatch;

  if (opts.dryRun) {
    console.log('\n[dry-run] 登録データ:');
    console.log(JSON.stringify(postData, null, 2));
    console.log('\n--dry-run を外して再実行すると、microCMS に登録されます。');
    return;
  }

  // microCMS に POST
  console.log('\nmicroCMS に記事を登録中...');
  try {
    const result = await client.create({
      endpoint: 'blogs',
      content: postData,
    });
    console.log('登録完了!');
    console.log(`記事ID: ${result.id}`);
    console.log(`URL: https://${MICROCMS_SERVICE_DOMAIN}.microcms.io/apis/blogs/${result.id}`);
  } catch (e) {
    console.error(`登録エラー: ${e.message}`);
    process.exit(1);
  }
}

main();
