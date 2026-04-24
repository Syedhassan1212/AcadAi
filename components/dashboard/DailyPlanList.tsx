'use client';

import { useState } from 'react';

type TaskItem = {
  id: string;
  title: string;
  duration: number;
  task_type: string;
  status: string;
};

export default function DailyPlanList({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const updateTaskStatus = async (taskId: string, status: 'in_progress' | 'done') => {
    setPendingTaskId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
    } catch (error) {
      console.error('Task action failed', error);
    } finally {
      setPendingTaskId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {tasks?.length === 0 ? (
        <div className="text-center py-6 text-on-surface-variant text-sm border-2 border-dashed border-outline-variant/20 rounded-lg">No tasks assigned for today. Time for deep focus?</div>
      ) : (
        tasks.map((task: TaskItem, index: number) => {
          const isFirstActive = index === 0 && task.status !== 'done';
          const isUpdating = pendingTaskId === task.id;
          return (
            <div key={task.id} className={`${task.status === 'done' ? 'bg-surface hover:bg-surface-container-low line-through text-on-surface-variant/70' : 'bg-surface-container-high text-on-surface hover:bg-surface-bright'} rounded-lg p-4 flex items-center justify-between group transition-colors ghost-border ${isFirstActive ? 'adaptive-indicator' : ''}`}>
              <div className="flex items-center gap-4 ml-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${task.status === 'done' ? 'bg-surface-container-highest text-on-surface-variant' : 'bg-primary-container/10 text-primary'}`}>
                  <span className="material-symbols-outlined">{task.task_type === 'quiz' ? 'science' : task.task_type === 'practice' ? 'edit_document' : 'functions'}</span>
                </div>
                <div>
                  <h4 className={`text-base font-medium font-body mb-1 group-hover:text-primary transition-colors ${task.status === 'done' ? 'text-on-surface-variant' : 'text-on-surface'}`}>{task.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant font-body">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {task.duration} min</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant" />
                    <span className={`uppercase tracking-wider font-label text-[10px] ${task.status === 'done' ? '' : 'text-primary'}`}>{task.task_type}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {task.status !== 'done' && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                    className="px-3 py-1.5 rounded-DEFAULT text-xs bg-surface-container-highest text-on-surface-variant hover:text-primary"
                  >
                    Start
                  </button>
                )}
                <button
                  disabled={isUpdating || task.status === 'done'}
                  onClick={() => updateTaskStatus(task.id, 'done')}
                  className={`px-3 py-1.5 rounded-DEFAULT text-xs ${task.status === 'done' ? 'bg-primary/20 text-primary' : 'bg-primary text-on-primary'}`}
                >
                  {task.status === 'done' ? 'Done' : isUpdating ? 'Saving...' : 'Complete'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
