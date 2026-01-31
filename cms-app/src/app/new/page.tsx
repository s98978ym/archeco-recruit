'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, FolderPlus } from 'lucide-react';

export default function NewArticlePage() {
  const [folderName, setFolderName] = useState('');

  const handleCreate = () => {
    if (!folderName.trim()) {
      toast.error('フォルダ名を入力してください');
      return;
    }
    toast.success(
      `Google Driveの共有フォルダに「${folderName}」フォルダを作成し、議事録・トランスクリプト・写真を保存してください`,
      { duration: 6000 }
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <a href="/" className="text-dark-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </a>
        <h2 className="text-2xl font-bold text-white">新規記事フォルダ</h2>
      </div>

      <div className="bg-dark-card border border-dark-border rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm text-dark-muted mb-2">
            フォルダ名（記事テーマ）
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="例: 2024年忘年会レポート"
            className="w-full bg-dark-bg border border-dark-border rounded px-4 py-3 text-white focus:border-primary focus:outline-none"
          />
        </div>

        <div className="bg-dark-bg rounded-lg p-4 text-sm text-dark-muted space-y-2">
          <p className="font-medium text-white">フォルダに保存するもの：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>議事録（Google Doc / .txt / .md）</li>
            <li>トランスクリプト（文字起こしファイル）</li>
            <li>写真（.jpg / .png）</li>
          </ul>
        </div>

        <button
          onClick={handleCreate}
          disabled={!folderName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-4 py-3 rounded-lg transition-colors font-medium"
        >
          <FolderPlus size={18} />
          フォルダを作成
        </button>
      </div>
    </div>
  );
}
