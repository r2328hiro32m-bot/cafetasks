'use client';

import { useState } from 'react';
import { Sparkles, Plus, Calendar, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function TaskInputArea() {
    const { data: session } = useSession();
    const [normalTask, setNormalTask] = useState('');
    const [aiTask, setAiTask] = useState('');
    const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isAdding, setIsAdding] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const handleAddNormalTask = async () => {
        if (!normalTask.trim() || !session) return;
        setIsAdding(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: normalTask, due: new Date(dueDate).toISOString() })
            });
            if (res.ok) {
                setNormalTask('');
                setDueDate(new Date().toISOString().split('T')[0]);
                window.dispatchEvent(new Event('refresh-tasks'));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleAiBreakdown = async () => {
        if (!aiTask.trim() || !session) return;
        setIsAiProcessing(true);
        try {
            const res = await fetch('/api/ai/breakdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiTask, targetDate: dueDate })
            });
            if (res.ok) {
                setAiTask('');
                window.dispatchEvent(new Event('refresh-tasks'));
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`AI分解エラー: ${errData.error || '予期せぬエラーが発生しました'}`);
            }
        } catch (err: any) {
            console.error(err);
            alert(`AI通信エラー: ${err.message || String(err)}`);
        } finally {
            setIsAiProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 bg-white/80 dark:bg-[#382c27]/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-border">
            {/* Normal Task Input */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative flex items-center">
                    <input
                        type="text"
                        placeholder={session ? "タスクを入力 (Enterで追加)" : "ログインしてタスクを追加"}
                        value={normalTask}
                        disabled={!session || isAdding}
                        onChange={(e) => setNormalTask(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddNormalTask(); }}
                        className="w-full bg-muted/50 border border-transparent focus:border-ring focus:bg-white dark:focus:bg-[#2b211e] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-all disabled:opacity-50"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative flex items-center bg-muted hover:bg-muted-foreground/10 text-foreground px-3 py-3 rounded-xl transition-colors shrink-0 disabled:opacity-50">
                        <Calendar size={18} className="absolute left-3 pointer-events-none" />
                        <input
                            type="date"
                            disabled={!session || isAdding}
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="bg-transparent pl-7 pr-1 text-sm outline-none cursor-pointer w-full h-full text-foreground/80 dark:[color-scheme:dark]"
                        />
                    </div>
                    <button
                        onClick={handleAddNormalTask}
                        disabled={!normalTask.trim() || !session || isAdding}
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl transition-colors shrink-0 font-medium shadow-sm disabled:opacity-50"
                    >
                        {isAdding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                        <span className="hidden sm:inline">追加</span>
                    </button>
                </div>
            </div>

            {/* AI Task Breakdown Input */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-200/50 to-orange-300/50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative flex items-center gap-3 bg-white/50 dark:bg-black/20 border border-amber-200/50 dark:border-amber-900/50 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-amber-400/50 transition-all">
                    <Sparkles className="text-amber-500 shrink-0" size={20} />
                    <input
                        type="text"
                        placeholder={session ? "AIにざっくりしたタスクを分解してもらう（例：週末の旅行の準備をする）" : "ログインしてAI機能を使う"}
                        value={aiTask}
                        disabled={!session || isAiProcessing}
                        onChange={(e) => setAiTask(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAiBreakdown(); }}
                        className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm disabled:opacity-50"
                    />
                    <button
                        onClick={handleAiBreakdown}
                        disabled={!aiTask.trim() || !session || isAiProcessing}
                        className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors whitespace-nowrap disabled:opacity-50 flex items-center gap-2"
                    >
                        {isAiProcessing && <Loader2 size={16} className="animate-spin" />}
                        AIで分解
                    </button>
                </div>
            </div>
        </div>
    );
}
