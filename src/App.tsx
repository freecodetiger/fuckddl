import { useState, useEffect, useCallback, useRef } from "react";
import { useSchedule } from "./hooks/useSchedule";
import { useTodos } from "./hooks/useTodos";
import { useAgent } from "./hooks/useAgent";
import { useConfig } from "./hooks/useConfig";
import { useVoiceInput } from "./hooks/useVoiceInput";
import { VoiceWaveform } from "./components/VoiceWaveform";
import { ScheduleList } from "./components/ScheduleList";
import { TodoList } from "./components/TodoList";
import { SyncIndicator } from "./components/SyncIndicator";
import { SettingsView } from "./components/SettingsView";
import type { ViewState, VoiceOrbState } from "./types";

type ActiveTab = "schedule" | "todos";

function App() {
  const [view, setView] = useState<ViewState>("today");
  const [activeTab, setActiveTab] = useState<ActiveTab>("schedule");
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [errorText, setErrorText] = useState("");
  const [newestEventId, setNewestEventId] = useState<string | null>(null);
  const [newestTodoId, setNewestTodoId] = useState<string | null>(null);
  const prevEventIds = useRef<Set<string>>(new Set());
  const prevTodoIds = useRef<Set<string>>(new Set());

  const { events, fetchToday, updateEvent } = useSchedule();
  const { todos, fetchAll: fetchTodos, updateTodo } = useTodos();

  // Track previous IDs for detecting new items
  useEffect(() => {
    prevEventIds.current = new Set(events.map((e) => e.id));
  }, [events]);
  useEffect(() => {
    prevTodoIds.current = new Set(todos.map((t) => t.id));
  }, [todos]);
  const { response, steps, currentQuestion, sendMessage } = useAgent();
  const { config, load: loadConfig, save: saveConfig } = useConfig();
  const { isRecording, interimText, startRecording, stopRecording } =
    useVoiceInput({ onTranscript: handleTranscript, onError: handleVoiceError });

  useEffect(() => { fetchToday(); fetchTodos(); }, [fetchToday, fetchTodos]);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const today = new Date();
  const dayNum = today.getDate();
  const dayLabel = today.toLocaleDateString("zh-CN", { weekday: "long" });
  const monthYearLabel = today.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });

  function handleVoiceError(error: string) {
    setOrbState("error");
    setErrorText(error);
    setTimeout(() => setOrbState("idle"), 2500);
  }

  async function handleTranscript(text: string) {
    setOrbState("processing");
    try {
      const result = await sendMessage(text);
      if (!result.requiresFollowUp) {
        setOrbState("success");

        // Track newest item for animation
        if (result.intent === "create" || result.intent === "update") {
          setActiveTab("schedule");
          await fetchToday();
          // Find newly added event
          const currentIds = new Set(useSchedule.getState().events.map((e) => e.id));
          for (const id of currentIds) {
            if (!prevEventIds.current.has(id)) {
              setNewestEventId(id);
              break;
            }
          }
          setTimeout(() => setNewestEventId(null), 600);
        } else if (result.intent === "create_todo" || result.intent === "update_todo") {
          setActiveTab("todos");
          await fetchTodos();
          const currentIds = new Set(useTodos.getState().todos.map((t) => t.id));
          for (const id of currentIds) {
            if (!prevTodoIds.current.has(id)) {
              setNewestTodoId(id);
              break;
            }
          }
          setTimeout(() => setNewestTodoId(null), 600);
        }

        setTimeout(() => setOrbState("idle"), 2500);
      }
    } catch (e) {
      setOrbState("error");
      setErrorText(String(e));
      setTimeout(() => setOrbState("idle"), 2500);
    }
  }

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      if (orbState !== "idle") return;
      startRecording();
      setOrbState("recording");
    }
  }, [isRecording, orbState, startRecording, stopRecording]);

  const handleToggleEvent = useCallback(
    async (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;
      const nextStatus =
        event.status === "pending"
          ? "done"
          : event.status === "done"
            ? "cancelled"
            : "pending";
      try { await updateEvent(eventId, { status: nextStatus }); } catch {}
    },
    [events, updateEvent]
  );

  const handleToggleTodo = useCallback(
    async (todoId: string) => {
      const todo = todos.find((t) => t.id === todoId);
      if (!todo) return;
      const nextStatus =
        todo.status === "pending"
          ? "done"
          : todo.status === "done"
            ? "cancelled"
            : "pending";
      try { await updateTodo(todoId, { status: nextStatus }); } catch {}
    },
    [todos, updateTodo]
  );

  return (
    <div className="h-full flex flex-col bg-bg-primary relative">
      {/* ===== Today View ===== */}
      {view === "today" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Date Header */}
          <div className="pt-[52px] pb-[8px] px-[20px] flex-shrink-0">
            <div className="flex items-baseline gap-[12px]">
              <h1 className="text-[34px] font-[700] leading-[1.1] tracking-[-0.02em] text-text-primary m-0">
                {monthYearLabel}
              </h1>
              <span className="text-[15px] font-[400] text-text-secondary">
                {dayLabel}
              </span>
            </div>
            <p className="text-[15px] text-text-secondary mt-[2px] ml-[1px] font-[400]">
              {dayNum}日
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-[0px] mx-[20px] mb-[12px] flex-shrink-0 bg-bg-secondary rounded-[10px] p-[3px]">
            <button
              className={`flex-1 text-[14px] font-[500] py-[7px] rounded-[8px] transition-all duration-200 ${
                activeTab === "schedule"
                  ? "bg-bg-card text-text-primary shadow-hairline"
                  : "text-text-tertiary"
              }`}
              onClick={() => setActiveTab("schedule")}
            >
              日程
            </button>
            <button
              className={`flex-1 text-[14px] font-[500] py-[7px] rounded-[8px] transition-all duration-200 ${
                activeTab === "todos"
                  ? "bg-bg-card text-text-primary shadow-hairline"
                  : "text-text-tertiary"
              }`}
              onClick={() => setActiveTab("todos")}
            >
              待办
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "schedule" && (
              events.length > 0 ? (
                <ScheduleList events={events} newestId={newestEventId} onToggle={handleToggleEvent} />
              ) : (
                <div className="flex flex-col items-center justify-center pt-[60px]">
                  <p className="text-[16px] text-text-secondary mb-[4px] font-[500]">
                    今天没有日程
                  </p>
                  <p className="text-[14px] text-text-tertiary">
                    点击下方按钮，用语音添加日程
                  </p>
                </div>
              )
            )}
            {activeTab === "todos" && (
              <TodoList todos={todos} newestId={newestTodoId} onToggle={handleToggleTodo} />
            )}
          </div>

          {/* Voice Waveform */}
          <div className="flex-shrink-0 flex flex-col items-center pb-[36px] pt-[12px]">
            <VoiceWaveform
              state={orbState}
              isRecording={isRecording}
              transcript={interimText}
              responseText={orbState === "error" ? errorText : response}
              steps={steps}
              currentQuestion={currentQuestion}
              onToggle={handleToggleRecording}
            />
          </div>
        </div>
      )}

      {/* ===== Calendar Month View ===== */}
      {view === "calendar" && (
        <div className="flex-1 flex flex-col">
          <div className="pt-[52px] pb-[16px] px-[20px] flex items-center gap-[12px] flex-shrink-0">
            <button
              className="text-[15px] text-accent font-[500] bg-accent-soft px-[12px] py-[6px] rounded-[12px] hover:opacity-80 transition-opacity"
              onClick={() => setView("today")}
            >
              ← 今天
            </button>
            <span className="text-[17px] font-[600] text-text-primary">
              {monthYearLabel}
            </span>
          </div>

          <div className="grid grid-cols-7 px-[14px] text-center mb-[6px] flex-shrink-0">
            {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
              <div key={d} className="text-[12px] text-text-tertiary py-[4px] font-[500]">
                {d}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-7 px-[14px] auto-rows-fr">
            {Array.from({ length: 30 }, (_, i) => {
              const d = i + 1;
              const isToday = d === today.getDate();
              const hasEvents = events.some(
                (e) => e.start_time.slice(8, 10) === String(d).padStart(2, "0")
              );
              return (
                <button
                  key={d}
                  className="flex flex-col items-center justify-start pt-[5px] text-[16px] h-[42px] border-0 bg-transparent cursor-pointer"
                  onClick={() => {
                    const ds = `2026-04-${String(d).padStart(2, "0")}`;
                    useSchedule.getState().fetchByDate(ds);
                    setView("today");
                  }}
                >
                  <span
                    className={
                      isToday
                        ? "bg-accent text-white rounded-full w-[32px] h-[32px] flex items-center justify-center font-[700] text-[15px]"
                        : "text-text-primary"
                    }
                  >
                    {d}
                  </span>
                  {hasEvents && !isToday && (
                    <div className="w-[5px] h-[5px] rounded-full bg-accent mt-[3px]" />
                  )}
                </button>
              );
            })}
          </div>

          {events.length > 0 && (
            <>
              <div className="mx-[16px] my-[8px] h-[1px] bg-separator flex-shrink-0" />
              <div className="px-[16px] pb-[16px] flex-shrink-0">
                <div className="text-[12px] text-text-tertiary mb-[8px] font-[500]">
                  今日日程
                </div>
                {events.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-[14px] text-text-primary py-[3px] flex items-center gap-[8px]"
                  >
                    <span className="text-text-tertiary text-[12px] min-w-[38px] font-[500]">
                      {event.start_time.slice(11, 16)}
                    </span>
                    <span>{event.title}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex-shrink-0 flex flex-col items-center pb-[36px] pt-[12px]">
            <VoiceWaveform
              state={orbState}
              isRecording={isRecording}
              transcript={interimText}
              responseText={orbState === "error" ? errorText : response}
              steps={steps}
              currentQuestion={currentQuestion}
              onToggle={handleToggleRecording}
            />
          </div>
        </div>
      )}

      {/* ===== Settings ===== */}
      {view === "settings" && (
        <SettingsView config={config} onSave={saveConfig} onBack={() => setView("today")} />
      )}

      {/* Top-right buttons */}
      {view === "today" && (
        <div className="absolute top-[50px] right-[14px] flex gap-[6px]">
          <button
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full text-text-tertiary hover:bg-bg-secondary active:bg-separator-light transition-colors"
            onClick={() => setView("calendar")}
            aria-label="日历"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4.5 1v3M10.5 1v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full text-text-tertiary hover:bg-bg-secondary active:bg-separator-light transition-colors"
            onClick={() => setView("settings")}
            aria-label="设置"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M12.1 7.5a4.6 4.6 0 01-.07.74l1.17.36-.98 1.67-1.17-.35c-.3.36-.68.65-1.12.86l.08 1.22H8l-.18-1.18a3.9 3.9 0 01-1.14-.86l-1.2.35-.98-1.67 1.2-.35A4.8 4.8 0 015 7.5l-1.2-.36.98-1.67 1.2.36c.3-.36.68-.65 1.13-.86L7 3.75h2.01l.08 1.22c.44.2.83.5 1.13.86l1.17-.36.98 1.67-1.17.35c.04.24.06.48.06.74z" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
        </div>
      )}

      {view === "today" && <SyncIndicator />}
    </div>
  );
}

export default App;
