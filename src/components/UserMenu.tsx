'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogOut, LogIn } from 'lucide-react';

export function UserMenu() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return <div className="h-9 w-24 bg-muted animate-pulse rounded-full"></div>;
    }

    if (session?.user) {
        return (
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 hidden sm:flex">
                    {session.user.image ? (
                        <img src={session.user.image} alt="User profile" className="w-8 h-8 rounded-full border border-border" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                            {session.user.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <span className="text-sm font-medium text-foreground">{session.user.name}</span>
                </div>
                <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">ログアウト</span>
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn('google')}
            className="flex items-center gap-2 text-sm bg-primary/10 text-primary hover:bg-primary/20 font-medium px-4 py-2 rounded-full transition-colors"
        >
            <LogIn size={16} />
            <span>Googleでログイン</span>
        </button>
    );
}
