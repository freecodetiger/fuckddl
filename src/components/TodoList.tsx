import type { TodoItem } from "../types";
import { TodoCard } from "./TodoCard";

interface TodoListProps {
  todos: TodoItem[];
  newestId?: string | null;
  onToggle: (todoId: string) => void;
}

function groupByPriority(todos: TodoItem[]) {
  const high: TodoItem[] = [];
  const medium: TodoItem[] = [];
  const low: TodoItem[] = [];

  for (const todo of todos) {
    if (todo.priority === "high") high.push(todo);
    else if (todo.priority === "low") low.push(todo);
    else medium.push(todo);
  }

  const groups: { label: string; items: TodoItem[] }[] = [];
  if (high.length > 0) groups.push({ label: "高优先", items: high });
  if (medium.length > 0) groups.push({ label: "中优先", items: medium });
  if (low.length > 0) groups.push({ label: "低优先", items: low });
  return groups;
}

export function TodoList({ todos, newestId, onToggle }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-[80px]">
        <p className="text-[16px] text-text-secondary mb-[4px] font-[500]">
          没有待办事项
        </p>
        <p className="text-[14px] text-text-tertiary">
          点击下方按钮，用语音添加待办
        </p>
      </div>
    );
  }

  const groups = groupByPriority(todos.filter((t) => t.status === "pending"));
  const completed = todos.filter((t) => t.status === "done" || t.status === "cancelled");

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.label} className="mb-[8px]">
          <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[4px] mt-[4px]">
            {group.label}
          </div>
          {group.items.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              isNew={todo.id === newestId}
              onToggle={onToggle}
            />
          ))}
        </div>
      ))}

      {completed.length > 0 && (
        <div className="mt-[16px]">
          <div className="text-[12px] font-[500] text-text-tertiary mx-[20px] mb-[4px]">
            已完成
          </div>
          {completed.map((todo) => (
            <TodoCard key={todo.id} todo={todo} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
