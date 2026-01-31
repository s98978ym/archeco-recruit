'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileText,
  Mic,
  Image as ImageIcon,
  Sparkles,
  Eye,
  Send,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  TARGET_LABELS,
  TASTE_LABELS,
  type TargetAudience,
  type ArticleTaste,
  type CategorizedFiles,
  type AnalysisResult,
  type GeneratedArticle,
  type DriveFile,
} from '@/types';

type Step = 'files' | 'settings' | 'generating' | 'preview';

export default function ArticlePage() {
  const { data: session } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const folderId = params.id as string;
  const folderName = searchParams.get('name') || '';

  const accessToken = (session as Record<string, unknown>)
    ?.accessToken as string;

  const [step, setStep] = useState<Step>('files');
  const [categorized, setCategorized] = useState<CategorizedFiles | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Settings
  const [target, setTarget] = useState<TargetAudience>('job_seekers');
  const [taste, setTaste] = useState<ArticleTaste>('friendly');
  const [wordCount, setWordCount] = useState(2000);
  const [eyecatchInstructions, setEyecatchInstructions] = useState('');

  // Load files
  useEffect(() => {
    if (!accessToken || !folderId) return;
    setLoading(true);
    fetch(`/api/drive/files/${folderId}`, {
      headers: { 'x-access-token': accessToken },
    })
      .then((r) => r.json())
      .then((data) => setCategorized(data.categorized || null))
      .catch(() => toast.error('ファイルの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, [accessToken, folderId]);

  // Analyze
  const handleAnalyze = async () => {
    if (!categorized) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify({
          minutes: categorized.minutes,
          transcripts: categorized.transcripts,
          photos: categorized.photos,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis);
      setStep('settings');
      toast.success('分析が完了しました');
    } catch {
      toast.error('分析に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // Generate
  const handleGenerate = async () => {
    if (!analysis || !categorized) return;
    setStep('generating');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-token': accessToken,
        },
        body: JSON.stringify({
          analysis,
          target,
          taste,
          wordCount,
          eyecatchInstructions,
          photos: categorized.photos,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setArticle(data.article);
      setStep('preview');
      toast.success('記事の生成が完了しました');
    } catch {
      toast.error('記事の生成に失敗しました');
      setStep('settings');
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!article) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          eyecatch: article.eyecatchUrl,
          category: article.category,
          description: article.lead,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('microCMSに投稿しました！');
    } catch {
      toast.error('投稿に失敗しました');
    } finally {
      setPublishing(false);
    }
  };

  const FileList = ({
    files,
    icon: Icon,
    label,
  }: {
    files: DriveFile[];
    icon: typeof FileText;
    label: string;
  }) => (
    <div>
      <h4 className="flex items-center gap-2 text-sm font-medium text-dark-muted mb-2">
        <Icon size={16} /> {label}（{files.length}件）
      </h4>
      {files.length === 0 ? (
        <p className="text-xs text-dark-muted/50 pl-6">なし</p>
      ) : (
        <ul className="space-y-1 pl-6">
          {files.map((f) => (
            <li key={f.id} className="text-sm text-white truncate">
              {f.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <a href="/" className="text-dark-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </a>
        <div>
          <h2 className="text-2xl font-bold text-white">{folderName || 'ブログ記事作成'}</h2>
          <div className="flex gap-4 mt-2 text-xs text-dark-muted">
            {(['files', 'settings', 'generating', 'preview'] as Step[]).map(
              (s, i) => (
                <span
                  key={s}
                  className={
                    step === s
                      ? 'text-primary font-medium'
                      : i < ['files', 'settings', 'generating', 'preview'].indexOf(step)
                        ? 'text-white'
                        : ''
                  }
                >
                  {i + 1}.{' '}
                  {s === 'files'
                    ? 'ファイル確認'
                    : s === 'settings'
                      ? '要件設定'
                      : s === 'generating'
                        ? '生成中'
                        : 'プレビュー'}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Step 1: Files */}
      {step === 'files' && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white">
            フォルダ内のファイル
          </h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="loading-spinner" />
            </div>
          ) : categorized ? (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                <FileList
                  files={categorized.minutes}
                  icon={FileText}
                  label="議事録"
                />
                <FileList
                  files={categorized.transcripts}
                  icon={Mic}
                  label="トランスクリプト"
                />
                <FileList
                  files={categorized.photos}
                  icon={ImageIcon}
                  label="写真"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={
                  loading ||
                  (categorized.minutes.length === 0 &&
                    categorized.transcripts.length === 0)
                }
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-colors font-medium"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}
                AIで分析する
              </button>
            </>
          ) : (
            <p className="text-dark-muted text-center py-8">
              ファイルが見つかりません
            </p>
          )}
        </div>
      )}

      {/* Step 2: Settings */}
      {step === 'settings' && analysis && (
        <div className="space-y-6">
          {/* Analysis Summary */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              AI分析結果
            </h3>
            <p className="text-sm text-dark-muted mb-3">{analysis.summary}</p>
            <div className="flex flex-wrap gap-2">
              {analysis.keyTopics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-primary/20 text-primary px-2 py-1 rounded"
                >
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-sm mt-3">
              <span className="text-dark-muted">推奨タイトル: </span>
              <span className="text-white">{analysis.suggestedTitle}</span>
            </p>
          </div>

          {/* Generation Settings */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">生成設定</h3>

            <div>
              <label className="block text-sm text-dark-muted mb-2">
                ターゲット
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.entries(TARGET_LABELS) as [TargetAudience, string][]).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTarget(key)}
                      className={`px-3 py-2 rounded text-sm border transition-colors ${
                        target === key
                          ? 'bg-primary border-primary text-white'
                          : 'border-dark-border text-dark-muted hover:border-primary'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-2">
                テイスト
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.entries(TASTE_LABELS) as [ArticleTaste, string][]).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTaste(key)}
                      className={`px-3 py-2 rounded text-sm border transition-colors ${
                        taste === key
                          ? 'bg-primary border-primary text-white'
                          : 'border-dark-border text-dark-muted hover:border-primary'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-2">
                文字数: {wordCount.toLocaleString()}文字
              </label>
              <input
                type="range"
                min={500}
                max={5000}
                step={100}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-dark-muted mt-1">
                <span>500</span>
                <span>5,000</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-2">
                アイキャッチ追加指示（任意）
              </label>
              <input
                type="text"
                value={eyecatchInstructions}
                onChange={(e) => setEyecatchInstructions(e.target.value)}
                placeholder="例: タイトル文字を入れる、明るい雰囲気で"
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-3 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-lg transition-colors font-medium"
            >
              <Sparkles size={18} />
              記事を生成する
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === 'generating' && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-white font-medium">記事を生成しています...</p>
          <p className="text-sm text-dark-muted mt-2">
            AI分析・記事生成・画像最適化を実行中です
          </p>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 'preview' && article && (
        <div className="space-y-6">
          {/* Eyecatch */}
          {article.eyecatchUrl && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={article.eyecatchUrl}
                alt="アイキャッチ"
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Title & Lead */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <h1 className="text-2xl font-bold text-white mb-4">
              {article.title}
            </h1>
            <p className="text-dark-muted leading-relaxed">{article.lead}</p>
          </div>

          {/* Content Preview */}
          <div className="bg-dark-card border border-dark-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Eye size={18} />
                プレビュー
              </h3>
            </div>
            <div
              className="blog-preview"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep('settings')}
              className="flex-1 flex items-center justify-center gap-2 border border-dark-border text-dark-muted hover:text-white hover:border-primary px-4 py-3 rounded-lg transition-colors"
            >
              <RefreshCw size={18} />
              再生成
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-colors font-medium"
            >
              {publishing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              microCMSに投稿
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
