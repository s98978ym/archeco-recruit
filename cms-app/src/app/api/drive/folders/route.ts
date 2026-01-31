import { NextRequest, NextResponse } from 'next/server';
import { listFolders } from '@/lib/google-drive';

export async function GET(req: NextRequest) {
  const accessToken = req.headers.get('x-access-token');
  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const folders = await listFolders(accessToken);
    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Drive folders error:', error);
    return NextResponse.json(
      { error: 'Failed to list folders' },
      { status: 500 }
    );
  }
}
