'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { PenSquare, LogOut } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-dark-border bg-dark-card">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <PenSquare size={24} className="text-primary" />
          <span className="font-bold text-lg text-white">
            ARCHECO Blog CMS
          </span>
        </a>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <span className="text-sm text-dark-muted">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-dark-muted hover:text-white transition-colors"
                title="ログアウト"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn('google')}
              className="text-sm bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg transition-colors"
            >
              ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
