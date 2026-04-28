import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ScheduleEvent } from "../types";

interface ScheduleState {
  events: ScheduleEvent[];
  loading: boolean;
  error: string | null;
  fetchToday: () => Promise<void>;
  fetchByDate: (date: string) => Promise<void>;
  createEvent: (params: {
    title: string;
    start_time: string;
    end_time?: string;
    all_day?: boolean;
    description?: string;
    reminder_before?: number;
  }) => Promise<ScheduleEvent>;
  updateEvent: (
    eventId: string,
    params: {
      title?: string;
      start_time?: string;
      end_time?: string;
      status?: string;
      description?: string;
    }
  ) => Promise<ScheduleEvent>;
  deleteEvent: (eventId: string) => Promise<boolean>;
}

export const useSchedule = create<ScheduleState>((set, _get) => ({
  events: [],
  loading: false,
  error: null,

  fetchToday: async () => {
    set({ loading: true, error: null });
    try {
      const events = await invoke<ScheduleEvent[]>("get_today_schedules");
      set({ events, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchByDate: async (date: string) => {
    set({ loading: true, error: null });
    try {
      const events = await invoke<ScheduleEvent[]>("get_schedules_by_date", {
        date,
      });
      set({ events, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createEvent: async (params) => {
    set({ loading: true, error: null });
    try {
      const event = await invoke<ScheduleEvent>("create_schedule", params);
      set((s) => ({ events: [...s.events, event], loading: false }));
      return event;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  updateEvent: async (eventId, params) => {
    set({ loading: true, error: null });
    try {
      const event = await invoke<ScheduleEvent>("update_schedule", {
        eventId,
        ...params,
      });
      set((s) => ({
        events: s.events.map((e) => (e.id === eventId ? event : e)),
        loading: false,
      }));
      return event;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },

  deleteEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      const result = await invoke<boolean>("delete_schedule", {
        eventId,
      });
      set((s) => ({
        events: s.events.filter((e) => e.id !== eventId),
        loading: false,
      }));
      return result;
    } catch (e) {
      set({ error: String(e), loading: false });
      throw e;
    }
  },
}));
