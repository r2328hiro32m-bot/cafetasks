export type TaskId = string;

export type ColumnId = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later';

export interface Task {
    id: TaskId;
    columnId: ColumnId;
    title: string;
    dueDate: string | null; // ISO string format or null
    isCompleted: boolean;
    notes?: string;
}

export interface Column {
    id: ColumnId;
    title: string;
}
