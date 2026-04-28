import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TodoItem } from "../types";

interface TodoState {
  todos: TodoItem[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  createTodo: (params: {
    title: string;
    deadline: string;
    priority?: string;
    estimated_minutes?: number;
    description?: string;
  }) => Promise<TodoItem>;
  updateTodo: (
    todoId: string,
    params: {
      title?: string;
      deadline?: string;
      priority?: string;
      status?: string;
      estimated_minutes?: number;
      description?: string;
    }
  ) => Promise<TodoItem>;
  deleteTodo: (todoId: string) => Promise<boolean>;
}

export const useTodos = create<TodoState>((set) => ({
  todos: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const todos = await invoke<TodoItem[]>("get_todos");
      set({ todos, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createTodo: async (params) => {
    set({ loading: true, error: null });
    try {
      const todo = await invoke<TodoItem>("create_todo", params);
      set((s) => ({ todos: [...s.todos, todo], loading: false }));
      return todo;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  updateTodo: async (todoId, params) => {
    set({ loading: true, error: null });
    try {
      const todo = await invoke<TodoItem>("update_todo", {
        todoId,
        ...params,
      });
      set((s) => ({
        todos: s.todos.map((t) => (t.id === todoId ? todo : t)),
        loading: false,
      }));
      return todo;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  deleteTodo: async (todoId) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<boolean>("delete_todo", { todoId });
      set((s) => ({
        todos: s.todos.filter((t) => t.id !== todoId),
        loading: false,
      }));
      return result;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },
}));
