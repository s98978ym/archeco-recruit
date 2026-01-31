import { createClient } from 'microcms-js-sdk';

const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN || '';
const apiKey = import.meta.env.MICROCMS_API_KEY || '';

export const client = serviceDomain && apiKey
  ? createClient({ serviceDomain, apiKey })
  : null;

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
  if (!client) return { totalCount: 0, offset: 0, limit: 0, contents: [] } as BlogResponse;
  return await client.get<BlogResponse>({ endpoint: 'blogs', queries });
}

export async function getBlogDetail(contentId: string) {
  if (!client) throw new Error('microCMS client is not configured');
  return await client.get<Blog>({ endpoint: 'blogs', contentId });
}
