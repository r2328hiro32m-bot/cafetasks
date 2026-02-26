'use client';

import { useState } from 'react';
import { ColumnId, Task } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { mapGoogleTaskToKanbanTask, calculateNewDueDate } from '@/lib/task-utils';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

// Empty initial state
const INITIAL_TASKS: Task[] = [];

const COLUMNS = [
    { id: 'overdue' as const, title: '期限切れ', themeColor: 'red' },
    { id: 'today' as const, title: '今日', themeColor: 'blue' },
    { id: 'tomorrow' as const, title: '明日', themeColor: 'amber' },
    { id: 'week' as const, title: '1週間以内', themeColor: 'emerald' },
    { id: 'later' as const, title: 'それ以降', themeColor: 'violet' },
];

export function KanbanBoard() {
    const { data: session } = useSession();
    const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        async function fetchTasks() {
            if (!session) return;
            setLoading(true);
            setFetchError(false);
            try {
                const res = await fetch('/api/tasks');
                if (res.ok) {
                    const data = await res.json();
                    if (!Array.isArray(data)) {
                        console.error('Invalid data format', data);
                        setFetchError(true);
                        return;
                    }
                    const mappedTasks = data
                        .filter((t: any) => t.status !== 'completed') // Hide completed tasks initially
                        .map(mapGoogleTaskToKanbanTask)
                        .sort((a: Task, b: Task) => {
                            if (!a.dueDate && !b.dueDate) return 0;
                            if (!a.dueDate) return 1;
                            if (!b.dueDate) return -1;
                            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                        });
                    setTasks(mappedTasks);
                } else {
                    console.error('Fetch failed with status:', res.status);
                    setFetchError(true);
                }
            } catch (err) {
                console.error('Failed to load tasks', err);
                setFetchError(true);
            } finally {
                setLoading(false);
            }
        }
        fetchTasks();

        const handleRefresh = () => fetchTasks();
        window.addEventListener('refresh-tasks', handleRefresh);
        return () => window.removeEventListener('refresh-tasks', handleRefresh);
    }, [session]);

    // Configure sensors for touch and pointer
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement required before dragging starts
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200, // 200ms delay for long press on mobile
                tolerance: 5, // 5px movement tolerance during delay
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const task = tasks.find((t) => t.id === active.id);
        if (task) {
            setActiveTask(task);
        }
    }

    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === 'Task';
        const isOverTask = over.data.current?.type === 'Task';
        const isOverColumn = over.data.current?.type === 'Column';

        if (!isActiveTask) return;

        // Moving task over another task
        if (isActiveTask && isOverTask) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const overIndex = tasks.findIndex((t) => t.id === overId);

                if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
                    // Moving between columns
                    const newTasks = [...tasks];
                    newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: tasks[overIndex].columnId };
                    // Update due date based on column logic (mock for now, complete later)
                    return arrayMove(newTasks, activeIndex, overIndex);
                }

                // Moving within the same column
                return arrayMove(tasks, activeIndex, overIndex);
            });
        }

        // Moving task to an empty column
        if (isActiveTask && isOverColumn) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const newTasks = [...tasks];
                newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: overId as ColumnId };
                return arrayMove(newTasks, activeIndex, activeIndex);
            });
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === 'Task';
        if (!isActiveTask) return;

        const originalColumnId = active.data.current?.task?.columnId as ColumnId;

        setTasks((tasks) => {
            const activeIndex = tasks.findIndex((t) => t.id === activeId);
            const overIndex = tasks.findIndex((t) => t.id === overId);

            const task = tasks[activeIndex];
            const targetColumnId = task.columnId;
            let nextTasks = [...tasks];

            if (originalColumnId && originalColumnId !== targetColumnId) {
                // Here we update the dueDate of the task based on targetColumnId.
                const newDueDate = calculateNewDueDate(targetColumnId);

                // Optimistic update
                nextTasks[activeIndex] = { ...nextTasks[activeIndex], dueDate: newDueDate };

                // Sync with Google API
                if (session) {
                    fetch('/api/tasks', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: task.id,
                            due: newDueDate,
                        })
                    }).catch(err => console.error('Error updating task in Google:', err));
                }
            }

            if (activeIndex !== overIndex && nextTasks[activeIndex].columnId === nextTasks[overIndex].columnId) {
                return arrayMove(nextTasks, activeIndex, overIndex);
            }
            return nextTasks;
        });
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            {fetchError ? (
                <div className="flex h-full items-center justify-center w-full flex-col gap-4 text-center px-4">
                    <span className="text-4xl">🔑</span>
                    <h2 className="font-bold text-lg text-foreground">Google認証の有効期限が切れました</h2>
                    <p className="text-muted-foreground text-sm max-w-sm">
                        セキュリティのため、一定時間で接続がリセットされます。<br />
                        お手数ですが、右上のメニューから<strong>一度ログアウトし、再度ログイン</strong>してタスクを再読み込みしてください。
                    </p>
                </div>
            ) : loading && tasks.length === 0 ? (
                <div className="flex h-full items-center justify-center w-full text-muted-foreground">
                    <div className="animate-pulse flex items-center gap-2">
                        <span className="text-xl">☕</span> タスクを読み込み中...
                    </div>
                </div>
            ) : (
                <div className={`flex h-full gap-4 overflow-x-auto pt-2 pb-6 px-1 ${activeTask ? '' : 'snap-x snap-mandatory'}`}>
                    {COLUMNS.map((column) => (
                        <div key={column.id} className="min-w-[280px] sm:min-w-[320px] w-full max-w-[350px] shrink-0 h-full flex flex-col snap-center">
                            <KanbanColumn
                                column={column}
                                tasks={tasks.filter((t) => t.columnId === column.id)}
                            />
                        </div>
                    ))}
                </div>
            )}

            <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}
