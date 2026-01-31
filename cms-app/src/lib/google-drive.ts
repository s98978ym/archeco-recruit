import { google } from 'googleapis';
import type { DriveFile, DriveFolder, CategorizedFiles } from '@/types';

function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

export async function listFolders(accessToken: string): Promise<DriveFolder[]> {
  const drive = getDriveClient(accessToken);
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  });

  return (res.data.files || []) as DriveFolder[];
}

export async function listFilesInFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const drive = getDriveClient(accessToken);

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields:
      'files(id, name, mimeType, size, thumbnailLink, webContentLink, modifiedTime)',
    orderBy: 'name',
    pageSize: 200,
  });

  return (res.data.files || []) as DriveFile[];
}

export function categorizeFiles(files: DriveFile[]): CategorizedFiles {
  const result: CategorizedFiles = {
    minutes: [],
    transcripts: [],
    photos: [],
    others: [],
  };

  for (const file of files) {
    const name = file.name.toLowerCase();
    const mime = file.mimeType;

    if (mime.startsWith('image/')) {
      result.photos.push(file);
    } else if (
      name.includes('議事録') ||
      name.includes('minutes') ||
      name.includes('メモ') ||
      name.includes('memo')
    ) {
      result.minutes.push(file);
    } else if (
      name.includes('transcript') ||
      name.includes('文字起こし') ||
      name.includes('トランスクリプト') ||
      name.includes('書き起こし')
    ) {
      result.transcripts.push(file);
    } else if (
      mime === 'application/vnd.google-apps.document' ||
      mime === 'text/plain' ||
      mime === 'text/markdown' ||
      mime.includes('document')
    ) {
      // Text docs that didn't match above go to minutes as default
      result.minutes.push(file);
    } else {
      result.others.push(file);
    }
  }

  return result;
}

export async function getFileContent(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<string> {
  const drive = getDriveClient(accessToken);

  if (mimeType === 'application/vnd.google-apps.document') {
    const res = await drive.files.export({
      fileId,
      mimeType: 'text/plain',
    });
    return res.data as string;
  }

  if (mimeType.startsWith('text/')) {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );
    return res.data as string;
  }

  return '';
}

export async function getFileBuffer(
  accessToken: string,
  fileId: string
): Promise<Buffer> {
  const drive = getDriveClient(accessToken);
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
