import { useState, useEffect, useCallback, useRef } from "react";
import { useSchedule } from "./hooks/useSchedule";
import { useTodos } from "./hooks/useTodos";
import { useAgent } from "./hooks/useAgent";
import { useConfig } from "./hooks/useConfig";
import { useVoiceInput } from "./hooks/useVoiceInput";
import { VoiceWaveform } from "./components/VoiceWaveform";
import { CalendarView } from "./components/CalendarView";
import { SettingsView } from "./components/SettingsView";
import { AgentDialog } from "./components/AgentDialog";
import { ConfirmSheet } from "./components/ConfirmSheet";
import { TodoConfirmCard } from "./components/TodoConfirmCard";
import { RecentActivityList } from "./components/RecentActivityList";
import { TodoList } from "./components/TodoList";
import type { VoiceOrbState } from "./types";

type ViewState = "home" | "calendar" | "settings";

function App() {
  const [view, setView] = useState<ViewState>("home");
  const [orbState, setOrbState] = useState<VoiceOrbState>("idle");
  const [errorText, setErrorText] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newestEventId, setNewestEventId] = useState<string | null>(null);
  const [newestTodoId, setNewestTodoId] = useState<string | null>(null);
  const prevEventIds = useRef<Set<string>>(new Set());
  const prevTodoIds = useRef<Set<string>>(new Set());

  const { events, recentEvents, fetchToday, fetchRecent, updateEvent } = useSchedule();
  const { todos, fetchAll: fetchTodos, updateTodo } = useTodos();

  useEffect(() => { prevEventIds.current = new Set(recentEvents.map((e) => e.id)); }, [recentEvents]);
  useEffect(() => { prevTodoIds.current = new Set(todos.map((t) => t.id)); }, [todos]);

  const { response, steps, conversation, showDialog, currentQuestion, pendingConfirmation, pendingTodo, sendMessage, cancel, closeDialog, confirmDelete, dismissConfirmation, confirmTodo, dismissTodo } = useAgent();
  const { config, load: loadConfig, save: saveConfig } = useConfig();
  const { isRecording, interimText, startRecording, stopRecording } =
    useVoiceInput({ onTranscript: handleTranscript, onError: handleVoiceError });

  useEffect(() => { fetchRecent(); fetchTodos(); }, [fetchRecent, fetchTodos]);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const today = new Date();
  const dayNum = today.getDate();
  const dayLabel = today.toLocaleDateString("zh-CN", { weekday: "long" });
  const monthYearLabel = today.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });
  const todayStr = today.toISOString().slice(0, 10);

  function handleVoiceError(error: string) {
    stopTimer();
    setOrbState("error");
    setErrorText(error);
    setTimeout(() => setOrbState("idle"), 2500);
  }

  async function handleTranscript(text: string) {
    stopTimer();
    setOrbState("processing");
    try {
      const result = await sendMessage(text);
      if (!result.requiresFollowUp) {
        setOrbState("success");
        if (result.intent === "create" || result.intent === "update") {
          console.log("[App] before fetchRecent, prevIds:", [...prevEventIds.current]);
          await fetchRecent();
          const state = useSchedule.getState();
          console.log("[App] after fetchRecent, recentEvents:", state.recentEvents.length, "events:", state.recentEvents.map(e => e.id.slice(0,8)+" "+e.title));
          const ids = new Set(state.recentEvents.map((e) => e.id));
          let found = false;
          for (const id of ids) { if (!prevEventIds.current.has(id)) { setNewestEventId(id); console.log("[App] NEW event found:", id); found = true; break; } }
          if (!found) console.log("[App] NO new event found in recentEvents");
          setTimeout(() => setNewestEventId(null), 600);
        } else if (result.intent === "create_todo" || result.intent === "update_todo") {
          await fetchTodos();
          const ids = new Set(useTodos.getState().todos.map((t) => t.id));
          for (const id of ids) { if (!prevTodoIds.current.has(id)) { setNewestTodoId(id); break; } }
          setTimeout(() => setNewestTodoId(null), 600);
        }
        setTimeout(() => setOrbState("idle"), 2500);
      }
    } catch (e) {
      stopTimer();
      setOrbState("error");
      setErrorText(String(e));
      setTimeout(() => setOrbState("idle"), 2500);
    }
  }

  const startTimer = useCallback(() => {
    setRecordingTime(0);
    recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  }, []);
  const stopTimer = useCallback(() => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) { stopRecording(); stopTimer(); setOrbState("processing"); }
    else if (orbState === "processing") { cancel(); stopTimer(); setOrbState("idle"); }
    else { if (orbState !== "idle") return; startRecording(); startTimer(); setOrbState("recording"); }
  }, [isRecording, orbState, startRecording, stopRecording, cancel, startTimer, stopTimer]);

  const handleCancelRecording = useCallback(() => {
    stopRecording();
    stopTimer();
    setOrbState("idle");
  }, [stopRecording, stopTimer]);

  const handleToggleEvent = useCallback(async (eventId: string) => {
    const event = recentEvents.find((e) => e.id === eventId);
    if (!event) return;
    const nextStatus = event.status === "pending" ? "done" : event.status === "done" ? "cancelled" : "pending";
    try { await updateEvent(eventId, { status: nextStatus }); } catch {}
  }, [recentEvents, updateEvent]);

  const handleToggleTodo = useCallback(async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    const nextStatus = todo.status === "pending" ? "done" : todo.status === "done" ? "cancelled" : "pending";
    try { await updateTodo(todoId, { status: nextStatus }); } catch {}
  }, [todos, updateTodo]);

  const isActive = orbState === "recording" || orbState === "processing";

  // --- Bottom Bar ---
  // During recording: transforms into recording control bar
  // Otherwise: 3-item tab bar (schedule | mic | settings)
  const bottomBar = isRecording ? (
    <div className="flex-shrink-0 flex items-center gap-[14px] px-[24px] pt-[6px] pb-[24px] bg-bg-primary" style={{ boxShadow: "0 -0.5px 0 var(--color-separator)" }}>
      {/* Left: waveform */}
      <div className="flex items-end gap-[2px] h-[24px]">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="w-[2px] rounded-full" style={{
            backgroundColor: "var(--color-accent-rose)",
            height: "24px",
            animation: `wave-bar-${i+1} 0.5s ease-in-out infinite`,
            animationDelay: `${i*0.07}s`
          }} />
        ))}
      </div>

      {/* Center: stop button + timer */}
      <button
        className="flex items-center justify-center gap-[8px] flex-1 h-[44px] rounded-[22px] transition-all active:scale-[0.98]"
        style={{ backgroundColor: "var(--color-text-primary)" }}
        onClick={(e) => { e.preventDefault(); handleToggleRecording(); }}
      >
        <span className="text-[15px] font-[700] text-white tabular-nums">
          {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="3" width="10" height="10" rx="2" fill="white" />
        </svg>
      </button>

      {/* Right: delete/cancel */}
      <button
        className="w-[44px] h-[44px] rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{ backgroundColor: "var(--color-accent-rose)", boxShadow: "0 2px 16px rgba(255,59,48,0.3)" }}
        onClick={handleCancelRecording}
        aria-label="取消录音"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M6 6l8 8M14 6l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  ) : (
    <div className="flex-shrink-0 flex items-center justify-around px-[24px] pt-[6px] pb-[24px] bg-bg-primary" style={{ boxShadow: "0 -0.5px 0 var(--color-separator)" }}>
      {/* Schedule */}
      <button
        className={`flex flex-col items-center gap-[2px] py-[4px] px-[12px] rounded-[10px] transition-colors ${view === "home" ? "text-accent" : "text-text-tertiary"}`}
        onClick={() => setView("home")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="19" rx="3" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8 1v4M16 1v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <span className="text-[10px] font-[600]">日程</span>
      </button>

      {/* Mic button */}
      <button
        className="flex items-center justify-center w-[56px] h-[56px] rounded-full transition-all duration-200 active:scale-95 -mt-[20px]"
        style={{
          backgroundColor: isActive ? "var(--color-text-primary)" : "var(--color-text-primary)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => { e.preventDefault(); handleToggleRecording(); }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="麦克风"
      >
        {isActive ? (
          <div className="flex items-end justify-center gap-[3px] h-[24px]">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="w-[3px] rounded-full bg-white"
                style={{ height: "24px", animation: `wave-bar-${i+1} 0.5s ease-in-out infinite`, animationDelay: `${i*0.07}s` }} />
            ))}
          </div>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="1" width="6" height="13" rx="3" stroke="white" strokeWidth="2"/>
            <path d="M5 11a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 18v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Settings */}
      <button
        className={`flex flex-col items-center gap-[2px] py-[4px] px-[12px] rounded-[10px] transition-colors ${view === "settings" ? "text-accent" : "text-text-tertiary"}`}
        onClick={() => setView(view === "settings" ? "home" : "settings")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span className="text-[10px] font-[600]">设置</span>
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-bg-primary relative">
      {/* ===== Home ===== */}
      {view === "home" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Date Header — clickable to enter calendar */}
          <div className="pt-[52px] pb-[4px] px-[20px] flex-shrink-0">
            <button className="text-left border-0 bg-transparent cursor-pointer p-0" onClick={() => setView("calendar")}>
              <div className="flex items-baseline gap-[12px]">
                <h1 className="text-[34px] font-[700] leading-[1.1] tracking-[-0.02em] text-text-primary m-0">
                  {monthYearLabel}
                </h1>
                <span className="text-[15px] font-[400] text-text-secondary">{dayLabel}</span>
              </div>
              <p className="text-[15px] text-text-secondary mt-[2px] ml-[1px] font-[400]">{dayNum}日</p>
            </button>
            {/* DEBUG: show LLM config state + test button */}
            <div className="mt-[8px] flex gap-[8px] text-[11px] flex-wrap items-center">
              <span className={localStorage.getItem("codex_api_url") ? "text-accent-green" : "text-accent-rose"}>
                API: {localStorage.getItem("codex_api_url") || "未设置"}
              </span>
              <span className={localStorage.getItem("codex_api_key") ? "text-accent-green" : "text-accent-rose"}>
                Key: {localStorage.getItem("codex_api_key") ? "已设置" : "未设置"}
              </span>
            </div>
          </div>

          {/* Content: schedules on top, todos below */}
          <div className="flex-1 overflow-y-auto">
              {/* Recent schedules */}
            <div className="mb-[4px]">
              <div className="flex items-center justify-between mx-[20px] mb-[4px]">
                <span className="text-[12px] font-[600] text-text-tertiary tracking-[0.02em]">近期日程</span>
                <button
                  className={`text-[11px] font-[500] px-[8px] py-[2px] rounded-[6px] transition-colors ${todayOnly ? "bg-text-primary text-white" : "bg-bg-secondary text-text-tertiary"}`}
                  onClick={() => setTodayOnly(!todayOnly)}
                >
                  仅看今日
                </button>
              </div>
              {recentEvents.length > 0 ? (
                <RecentActivityList events={todayOnly ? recentEvents.filter(e => e.start_time.slice(0,10) === todayStr) : recentEvents} newestId={newestEventId} todayStr={todayStr} hideOldPast onToggle={handleToggleEvent} />
              ) : (
                <div className="text-center py-[20px] text-[13px] text-text-tertiary">暂无日程</div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-[20px] my-[8px] h-[1px] bg-separator" />

            {/* Todos preview */}
            <div className="mb-[8px]">
              <div className="text-[12px] font-[600] text-text-tertiary mx-[20px] mb-[4px] tracking-[0.02em]">待办</div>
              <TodoList todos={todos} newestId={newestTodoId} onToggle={handleToggleTodo} />
            </div>
          </div>

          {bottomBar}
        </div>
      )}

      {/* ===== Calendar ===== */}
      {view === "calendar" && (
        <div className="flex-1 flex flex-col">
          <CalendarView
            events={recentEvents}
            today={today}
            monthYearLabel={monthYearLabel}
            onSelectDate={(ds) => { useSchedule.getState().fetchByDate(ds); setView("home"); }}
          />
          {bottomBar}
        </div>
      )}

      {/* ===== Settings ===== */}
      {view === "settings" && (
        <div className="flex-1 flex flex-col">
          <SettingsView config={config} onSave={saveConfig} />
          {bottomBar}
        </div>
      )}

      {/* Agent dialog panel */}
      <AgentDialog
        visible={showDialog || orbState === "processing" || orbState === "recording"}
        items={conversation}
        steps={steps}
        processing={orbState === "processing"}
        pendingConfirmation={pendingConfirmation}
        onConfirmDelete={confirmDelete}
        onDismissConfirmation={dismissConfirmation}
        onClose={closeDialog}
      />

      {/* Todo quick confirm card — still separate since it needs editing */}
      {pendingTodo && (
        <TodoConfirmCard
          title={pendingTodo.title}
          deadline={pendingTodo.deadline}
          priority={pendingTodo.priority}
          estimatedMinutes={pendingTodo.estimatedMinutes}
          description={pendingTodo.description}
          onConfirm={confirmTodo}
          onCancel={dismissTodo}
        />
      )}
    </div>
  );
}

export default App;
