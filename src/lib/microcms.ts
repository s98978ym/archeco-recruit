import { createClient } from 'microcms-js-sdk';

export const client = createClient({
  serviceDomain: import.meta.env.MICROCMS_SERVICE_DOMAIN,
  apiKey: import.meta.env.MICROCMS_API_KEY,
});

export type Blog = {
  id: string;
  title: string;
  content: string;
  eyecatch?: { url: string; width: number; height: number };
  category: string;
  description?: string;
  is_featured?: boolean;
  writer?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogResponse = {
  totalCount: number;
  offset: number;
  limit: number;
  contents: Blog[];
};

export async function getBlogs(queries?: Record<string, unknown>) {
  return await client.get<BlogResponse>({ endpoint: 'blogs', queries });
}

export async function getBlogDetail(contentId: string) {
  return await client.get<Blog>({ endpoint: 'blogs', contentId });
}

/**
 * microCMS (imgix) の画像URLに最適化パラメータを付与する
 * - リサイズ（幅・高さ指定）
 * - WebP形式への変換
 * - 品質調整
 * - fit=crop でアスペクト比を保ちつつトリミング
 */
export function optimizeImage(
  url: string,
  options: { w?: number; h?: number; q?: number; fm?: string; fit?: string } = {}
): string {
  const { w, h, q = 80, fm = 'webp', fit = 'crop' } = options;
  const params = new URLSearchParams();
  if (w) params.set('w', String(w));
  if (h) params.set('h', String(h));
  params.set('fm', fm);
  params.set('q', String(q));
  params.set('fit', fit);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${params.toString()}`;
}
