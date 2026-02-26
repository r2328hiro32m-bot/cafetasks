'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareHeart, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';

export function WeeklyReflectionModal() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleOpen = async () => {
        if (!session) return;
        setIsOpen(true);
        if (!message) {
            setLoading(true);
            try {
                const res = await fetch('/api/ai/reflection');
                if (res.ok) {
                    const data = await res.json();
                    setMessage(data.message);
                } else {
                    setMessage('メッセージの取得に失敗しました。少し休んでからまた試してくださいね☕');
                }
            } catch (err) {
                console.error(err);
                setMessage('メッセージの取得に失敗しました。少し休んでからまた試してくださいね☕');
            } finally {
                setLoading(false);
            }
        }
    };

    if (!session) return null;

    return (
        <>
            <button
                onClick={handleOpen}
                className="flex items-center gap-2 text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60 font-medium px-4 py-2 rounded-full transition-colors shadow-sm"
            >
                <MessageSquareHeart size={16} />
                <span className="hidden sm:inline">今週の振り返り</span>
            </button>

            {mounted && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                key="reflection-backdrop"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                onClick={() => setIsOpen(false)}
                            />

                            <motion.div
                                key="reflection-modal"
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#2b211e] rounded-3xl p-6 md:p-8 shadow-2xl border border-border"
                            >
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-2"
                                >
                                    <X size={20} />
                                </button>

                                <div className="flex flex-col items-center text-center gap-4 mt-2">
                                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center text-3xl shadow-inner">
                                        ☕
                                    </div>
                                    <h2 className="text-xl font-bold text-foreground font-serif">
                                        今週もお疲れ様です
                                    </h2>

                                    <div className="w-full h-px bg-border my-2" />

                                    <div className="min-h-[120px] flex items-center justify-center w-full">
                                        {loading ? (
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Loader2 className="animate-spin text-primary" size={28} />
                                                <p className="text-sm">マスターが振り返りを準備中です...</p>
                                            </div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-foreground/90 leading-relaxed text-sm md:text-base text-left w-full whitespace-pre-wrap"
                                            >
                                                {message}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
