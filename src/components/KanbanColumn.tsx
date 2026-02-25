'use client';

import { Task, ColumnId } from '@/types';
import { TaskCard } from './TaskCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

interface KanbanColumnProps {
    column: {
        id: ColumnId;
        title: string;
        themeColor: string;
    };
    tasks: Task[];
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: {
            type: 'Column',
            column,
        },
    });

    const borderColorMap: Record<string, string> = {
        red: 'border-t-[#ef4444]',
        blue: 'border-t-[#3b82f6]',
        amber: 'border-t-[#f59e0b]',
        emerald: 'border-t-[#10b981]',
        violet: 'border-t-[#8b5cf6]',
    };

    const borderClass = borderColorMap[column.themeColor] || 'border-t-border';

    const taskIds = tasks.map((t) => t.id);

    return (
        <div
            className={`flex flex-col h-full bg-white/40 dark:bg-black/20 backdrop-blur-sm rounded-2xl border border-white/50 dark:border-white/10 shadow-sm overflow-hidden border-t-4 ${borderClass}`}
        >
            {/* Column Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/20 dark:border-white/5 bg-white/30 dark:bg-black/20">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                    {column.title}
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                </h2>
            </div>

            {/* Task List (Droppable area) */}
            <div
                ref={setNodeRef}
                className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[150px]"
            >
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center p-4 border-2 border-dashed border-muted/50 rounded-xl text-muted-foreground text-sm text-center">
                        タスクはありません
                        <br />
                        ☕ ちょっと一息
                    </div>
                )}
            </div>
        </div>
    );
}
