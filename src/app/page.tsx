import { KanbanBoard } from '@/components/KanbanBoard';
import { TaskInputArea } from '@/components/TaskInputArea';
import { UserMenu } from '@/components/UserMenu';
import { WeeklyReflectionModal } from '@/components/WeeklyReflectionModal';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 bg-white/60 dark:bg-black/60 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Coffee cup">☕</span>
            <h1 className="font-bold text-xl text-primary tracking-tight">Kanban Tasks</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <WeeklyReflectionModal />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-8 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Top Input Area for adding tasks */}
        <section className="shrink-0">
          <TaskInputArea />
        </section>

        {/* 5-Column Kanban Board */}
        <section className="flex-1 min-h-0 overflow-x-auto pb-4">
          <KanbanBoard />
        </section>
      </main>
    </div>
  );
}
