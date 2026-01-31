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
