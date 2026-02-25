import { ColumnId, Task } from '@/types';
import { isBefore, isToday, isTomorrow, addDays, startOfDay, parseISO } from 'date-fns';

/**
 * Maps a Google Task to our internal Task format, determining its column based on due date.
 */
export function mapGoogleTaskToKanbanTask(googleTask: any): Task {
    const dueDate = googleTask.due ? googleTask.due : null;
    const isCompleted = googleTask.status === 'completed';

    // If completed, let's keep it where it belongs or maybe hide it, but the model has it.

    let columnId: ColumnId = 'later';

    if (dueDate) {
        const d = parseISO(dueDate);
        const today = startOfDay(new Date());

        if (isBefore(d, today)) {
            columnId = 'overdue';
        } else if (isToday(d)) {
            columnId = 'today';
        } else if (isTomorrow(d)) {
            columnId = 'tomorrow';
        } else if (isBefore(d, addDays(today, 8))) { // Up to 7 days from today
            columnId = 'week';
        }
    }

    return {
        id: googleTask.id,
        title: googleTask.title,
        dueDate: dueDate,
        isCompleted,
        columnId,
        notes: googleTask.notes,
    };
}

/**
 * Calculates a new due date when a task is dropped into a specific column.
 */
export function calculateNewDueDate(columnId: ColumnId): string | null {
    const today = startOfDay(new Date());

    switch (columnId) {
        case 'overdue':
            // Moving to overdue manually? We shouldn't really change the date to past,
            // but if forced, subtract 1 day.
            return addDays(today, -1).toISOString();
        case 'today':
            return today.toISOString();
        case 'tomorrow':
            return addDays(today, 1).toISOString();
        case 'week':
            // Move to end of the week (e.g. 7 days from now)
            return addDays(today, 7).toISOString();
        case 'later':
            return null;
        default:
            return null;
    }
}
