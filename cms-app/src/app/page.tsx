'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import type { DriveFolder } from '@/types';
import { FolderOpen, Plus, LogIn } from 'lucide-react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);

  const accessToken = (session as Record<string, unknown>)
    ?.accessToken as string;

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetch('/api/drive/folders', {
      headers: { 'x-access-token': accessToken },
    })
      .then((r) => r.json())
      .then((data) => setFolders(data.folders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-20">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <h2 className="text-2xl font-bold text-white">
          ブログCMSへようこそ
        </h2>
        <p className="text-dark-muted">
          Google Driveと連携してAIブログ記事を生成します
        </p>
        <button
          onClick={() => signIn('google')}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition-colors"
        >
          <LogIn size={20} />
          Googleでログイン
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">ブログ記事フォルダ</h2>
        <a
          href="/new"
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          新規作成
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner" />
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-12 text-dark-muted">
          <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
          <p>フォルダが見つかりません</p>
          <p className="text-sm mt-2">
            Google Drive共有フォルダにブログ記事用のフォルダを作成してください
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <a
              key={folder.id}
              href={`/articles/${folder.id}?name=${encodeURIComponent(folder.name)}`}
              className="block p-6 bg-dark-card border border-dark-border rounded-lg hover:border-primary transition-colors group"
            >
              <div className="flex items-start gap-3">
                <FolderOpen
                  size={24}
                  className="text-primary mt-1 shrink-0"
                />
                <div>
                  <h3 className="font-semibold text-white group-hover:text-primary transition-colors">
                    {folder.name}
                  </h3>
                  <p className="text-sm text-dark-muted mt-1">
                    更新:{' '}
                    {new Date(folder.modifiedTime).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
