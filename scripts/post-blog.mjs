#!/usr/bin/env node
/**
 * microCMS ブログ記事自動登録スクリプト
 *
 * 使い方:
 *   node scripts/post-blog.mjs --text blog.txt --images img1.jpg img2.jpg [options]
 *
 * オプション:
 *   --text, -t        ブログ本文テキストファイル (必須)
 *   --images, -i      画像ファイル群 (複数指定可、最適なものをアイキャッチに選定)
 *   --title            タイトル (省略時: 本文から自動生成)
 *   --category, -c     カテゴリ: インタビュー / 社風 / 制度 / イベント (省略時: 本文から自動判定)
 *   --writer, -w       ライター名
 *   --featured         おすすめフラグ (指定すると true)
 *   --dry-run          実際に登録せず内容を確認
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from 'microcms-js-sdk';

// ── 環境変数の読み込み ──
// .env ファイルがあれば手動パース (dotenv 不要)
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
        continue; // skip i++ at bottom
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

// ── 本文からタイトルを自動生成 ──
function generateTitle(text) {
  // 最初の行をタイトルとして使用 (空行スキップ)
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '無題の記事';

  let title = lines[0].replace(/^#+\s*/, '').trim();
  // 長すぎる場合は切り詰め
  if (title.length > 60) title = title.slice(0, 57) + '...';
  return title;
}

// ── 本文からカテゴリを自動判定 ──
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

// ── 本文からリード文を自動生成 ──
function generateDescription(text) {
  // タイトル行を除いた最初の段落を抽出
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

    // 見出し
    const h3 = line.match(/^###\s+(.+)/);
    if (h3) { closeList(); html.push(`<h3>${esc(h3[1])}</h3>`); continue; }
    const h2 = line.match(/^##\s+(.+)/);
    if (h2) { closeList(); html.push(`<h2>${esc(h2[1])}</h2>`); continue; }
    const h1 = line.match(/^#\s+(.+)/);
    if (h1) { closeList(); html.push(`<h1>${esc(h1[1])}</h1>`); continue; }

    // リスト
    const li = line.match(/^[-*]\s+(.+)/);
    if (li) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${esc(li[1])}</li>`);
      continue;
    } else if (inList) {
      closeList();
    }

    // 空行
    if (line.trim() === '') { closeList(); continue; }

    // 段落
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

// ── 画像をアイキャッチとしてアップロード ──
async function uploadImage(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  const contentType = mimeMap[ext] || 'image/jpeg';
  const fileName = path.basename(imagePath);

  // microCMS Management API で画像アップロード
  const imageData = fs.readFileSync(imagePath);

  const res = await fetch(
    `https://${MICROCMS_SERVICE_DOMAIN}.microcms-management.io/api/v1/media`,
    {
      method: 'POST',
      headers: {
        'X-MICROCMS-API-KEY': MICROCMS_API_KEY,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
      body: imageData,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`画像アップロード失敗 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.url;
}

// ── アイキャッチ画像を選定 (最も大きいファイルを選ぶヒューリスティック) ──
function selectBestImage(imagePaths) {
  if (imagePaths.length === 0) return null;
  if (imagePaths.length === 1) return imagePaths[0];

  // 最もファイルサイズが大きい画像を選定 (高解像度 = アイキャッチ向き)
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
    console.error('エラー: --text (-t) でブログ本文テキストファイルを指定してください。');
    console.error('使い方: node scripts/post-blog.mjs --text blog.txt --images img1.jpg img2.jpg');
    process.exit(1);
  }

  // テキスト読み込み
  if (!fs.existsSync(opts.text)) {
    console.error(`エラー: ファイルが見つかりません: ${opts.text}`);
    process.exit(1);
  }
  const rawText = fs.readFileSync(opts.text, 'utf-8');

  // フィールド自動生成
  const title = opts.title || generateTitle(rawText);
  const category = opts.category || detectCategory(rawText);
  const description = generateDescription(rawText);
  const content = textToHtml(rawText);

  if (!CATEGORIES.includes(category)) {
    console.error(`エラー: カテゴリは次のいずれかを指定してください: ${CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════');
  console.log('  microCMS ブログ記事 自動登録');
  console.log('═══════════════════════════════════════');
  console.log(`タイトル:     ${title}`);
  console.log(`カテゴリ:     ${category}`);
  console.log(`リード文:     ${description}`);
  console.log(`ライター:     ${opts.writer || '(未設定)'}`);
  console.log(`おすすめ:     ${opts.featured}`);
  console.log(`画像数:       ${opts.images.length}`);
  console.log('───────────────────────────────────────');

  // アイキャッチ画像アップロード
  let eyecatch = undefined;
  if (opts.images.length > 0) {
    const bestImage = selectBestImage(opts.images);
    console.log(`アイキャッチ: ${path.basename(bestImage)}`);

    if (!opts.dryRun) {
      try {
        const url = await uploadImage(bestImage);
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
    content,
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
