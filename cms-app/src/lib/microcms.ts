import { createClient } from 'microcms-js-sdk';

const client = createClient({
  serviceDomain: process.env.MICROCMS_SERVICE_DOMAIN || '',
  apiKey: process.env.MICROCMS_API_KEY || '',
});

interface PublishParams {
  title: string;
  content: string;
  eyecatch?: string;
  category?: string;
  description?: string;
}

export async function publishToCms(params: PublishParams) {
  const body: Record<string, unknown> = {
    title: params.title,
    content: params.content,
    description: params.description || '',
  };

  if (params.eyecatch) {
    body.eyecatch = params.eyecatch;
  }
  if (params.category) {
    body.category = params.category;
  }

  return client.create({ endpoint: 'blogs', content: body });
}

export async function uploadImageToCms(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: 'image/webp' });
  formData.append('file', blob, filename);

  const res = await fetch(
    `https://${process.env.MICROCMS_SERVICE_DOMAIN}.microcms-manage.io/api/v1/media`,
    {
      method: 'POST',
      headers: {
        'X-MICROCMS-API-KEY': process.env.MICROCMS_API_KEY || '',
      },
      body: formData,
    }
  );

  if (!res.ok) throw new Error(`Image upload failed: ${res.status}`);
  const data = await res.json();
  return data.url;
}
