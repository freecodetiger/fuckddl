import type { TodoItem } from "../types";
import { TodoCard } from "./TodoCard";

interface TodoListProps {
  todos: TodoItem[];
  newestId?: string | null;
  onToggle: (todoId: string) => void;
}

export function TodoList({ todos, newestId, onToggle }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-[80px]">
        <p className="text-[16px] text-text-secondary mb-[4px] font-[500]">没有待办事项</p>
        <p className="text-[14px] text-text-tertiary">点击下方按钮，用语音添加待办</p>
      </div>
    );
  }

  const pending = todos.filter((t) => t.status === "pending");
  const completed = todos.filter((t) => t.status === "done" || t.status === "cancelled");

  // Sort pending by priority then deadline
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  pending.sort((a, b) => {
    const pa = priorityOrder[a.priority];
    const pb = priorityOrder[b.priority];
    if (pa !== pb) return pa - pb;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  return (
    <div className="flex flex-col gap-[20px] pt-[8px]">
      {/* Pending — horizontal scroll rows by priority */}
      {pending.length > 0 && (
        <>
          {/* Urgent strip (high priority) */}
          {pending.filter(t => t.priority === "high").length > 0 && (
            <div>
              <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[8px]">
                优先处理
              </div>
              <div className="flex gap-[10px] overflow-x-auto px-[20px] pb-[4px] scroll-snap-x" style={{ scrollSnapType: "x mandatory" }}>
                {pending.filter(t => t.priority === "high").map(todo => (
                  <div key={todo.id} className="scroll-snap-align-start">
                    <TodoCard todo={todo} isNew={todo.id === newestId} onToggle={onToggle} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All pending in horizontal scroll */}
          <div>
            <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[8px]">
              进行中 · {pending.length}
            </div>
            <div className="flex gap-[10px] overflow-x-auto px-[20px] pb-[4px]" style={{ scrollSnapType: "x mandatory" }}>
              {pending.map(todo => (
                <div key={todo.id} className="scroll-snap-align-start">
                  <TodoCard todo={todo} isNew={todo.id === newestId} onToggle={onToggle} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Completed — collapsed row */}
      {completed.length > 0 && (
        <div>
          <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[8px]">
            已完成 · {completed.length}
          </div>
          <div className="flex gap-[10px] overflow-x-auto px-[20px] pb-[8px] opacity-70">
            {completed.map(todo => (
              <div key={todo.id} className="shrink-0">
                <TodoCard todo={todo} onToggle={onToggle} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
