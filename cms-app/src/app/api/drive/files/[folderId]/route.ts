import { NextRequest, NextResponse } from 'next/server';
import { listFilesInFolder, categorizeFiles } from '@/lib/google-drive';

export async function GET(
  req: NextRequest,
  { params }: { params: { folderId: string } }
) {
  const accessToken = req.headers.get('x-access-token');
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const files = await listFilesInFolder(accessToken, params.folderId);
    const categorized = categorizeFiles(files);
    return NextResponse.json({ files, categorized });
  } catch (error) {
    console.error('Drive files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}
