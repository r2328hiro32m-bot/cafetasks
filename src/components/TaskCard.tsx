'use client';

import { Task } from '@/types';
import { GripVertical, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
}

export function TaskCard({ task, isOverlay = false }: TaskCardProps) {
    const isOverdue = task.columnId === 'overdue';
    const [isCompletedState, setIsCompleted] = useState(task.isCompleted);
    const [showSteam, setShowSteam] = useState(false);

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
        disabled: isCompletedState,
    });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    const playClinkSound = useCallback(() => {
        try {
            // Create a simple synth ping resembling a cup clink
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            // High pitch metallic clink frequency
            oscillator.frequency.setValueAtTime(1500, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(3000, audioCtx.currentTime + 0.1);

            // Fast decay envelope
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    }, []);

    const handleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isCompletedState) return;

        playClinkSound();
        setIsCompleted(true);
        setShowSteam(true);

        // Hide the steam after some time
        setTimeout(() => {
            setShowSteam(false);
        }, 1500);

        // TODO: callback to parent to actually update data and possibly move it to a 'completed' state or disappear
    };

    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="h-[80px] border-2 border-primary/50 border-dashed rounded-xl bg-primary/5 opacity-50 flex-shrink-0"
            />
        );
    }

    return (
        <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{
                opacity: isCompletedState && !isOverlay ? 0.4 : 1,
                scale: isCompletedState && !isOverlay ? 0.98 : 1,
            }}
            transition={{ duration: 0.4 }}
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative flex flex-shrink-0 items-start gap-3 bg-white dark:bg-[#382c27] p-4 rounded-xl border border-border transition-shadow",
                isOverlay ? "shadow-xl rotate-3 scale-105 cursor-grabbing z-50 ring-2 ring-primary/20" : "shadow-sm hover:shadow-md hover:border-primary/30",
                isCompletedState && "pointer-events-none"
            )}
        >
            {/* Steam Animation Overlay */}
            <AnimatePresence>
                {showSteam && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
                        animate={{ opacity: 0.6, y: -40, x: [0, -10, 10, -5, 0], filter: 'blur(6px)' }}
                        exit={{ opacity: 0, y: -60 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute -top-10 right-4 pointer-events-none z-10"
                    >
                        <div className="w-8 h-16 bg-gradient-to-t from-gray-200 to-transparent dark:from-gray-500 rounded-full opacity-50 transform rotate-12" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Drag Handle (Mobile ready) */}
            <div
                {...attributes}
                {...listeners}
                className={cn(
                    "mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 transition-colors touch-none",
                    !isCompletedState && "hover:text-primary"
                )}
                aria-label="Drag to move task"
                tabIndex={0}
            >
                <GripVertical size={20} />
            </div>

            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <h3 className={cn(
                    "text-sm font-medium text-foreground leading-snug break-words transition-all duration-300",
                    isCompletedState && "line-through text-muted-foreground"
                )}>
                    {task.title}
                </h3>

                {/* Due Date Indicator */}
                {task.dueDate && (
                    <div className={cn(
                        "flex items-center gap-1.5 text-xs transition-colors",
                        isOverdue && !isCompletedState ? "text-red-500 font-medium" : "text-muted-foreground"
                    )}>
                        <Clock size={12} />
                        <span>{format(new Date(task.dueDate), 'M/d (E)', { locale: ja })}</span>
                    </div>
                )}
            </div>

            {/* Checkbox for completion */}
            <button
                type="button"
                onClick={handleComplete}
                disabled={isCompletedState}
                className={cn(
                    "w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    isCompletedState
                        ? "bg-primary border-primary text-primary-foreground scale-110"
                        : "border-muted-foreground/30 hover:border-primary hover:scale-110 active:scale-95 bg-transparent text-transparent"
                )}
                aria-label="Mark task complete"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("w-3.5 h-3.5 transition-all duration-300", isCompletedState ? "opacity-100" : "opacity-0 scale-50")}>
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </button>
        </motion.div>
    );
}
