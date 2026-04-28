import { type VoiceOrbState, type AgentStep } from "../types";

interface VoiceWaveformProps {
  state: VoiceOrbState;
  transcript?: string;
  responseText?: string;
  steps?: AgentStep[];
  currentQuestion?: string | null;
  isRecording: boolean;
  onToggle: () => void;
}

const BAR_COUNT = 5;

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "completed") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="var(--color-accent-green)" />
        <path
          d="M5 8l2 2 4-4"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: 18, strokeDashoffset: 18, animation: "check-stroke 0.3s ease-out 0.1s forwards" }}
        />
      </svg>
    );
  }
  if (status === "active") {
    return (
      <div className="w-[16px] h-[16px] rounded-full border-2 shrink-0" style={{ borderColor: "var(--color-accent)" }}>
        <div className="w-full h-full rounded-full animate-pulse-dot" style={{ backgroundColor: "var(--color-accent)" }} />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="var(--color-accent-rose)" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <div className="w-[16px] h-[16px] rounded-full border-2 shrink-0" style={{ borderColor: "var(--color-text-tertiary)" }} />
  );
}

export function VoiceWaveform({
  state,
  transcript,
  responseText,
  steps,
  currentQuestion,
  isRecording,
  onToggle,
}: VoiceWaveformProps) {
  const isActive = state === "recording" || state === "processing";
  const isProcessing = state === "processing";
  const showSteps = steps && steps.length > 0 && (state === "processing" || state === "success" || state === "error");
  const hasTranscript = transcript && transcript.length > 0;

  const hintText = state === "recording"
    ? "点击结束"
    : isProcessing
      ? "处理中..."
      : currentQuestion
        ? "点击回答"
        : "点击说话";

  return (
    <div className="flex flex-col items-center select-none">
      {/* Transcript — always show during processing if we have text */}
      {isProcessing && hasTranscript && (
        <p className="text-[16px] leading-[1.4] text-text-secondary animate-fade-in-up max-w-[280px] mb-[12px] text-center font-[500]">
          "{transcript}"
        </p>
      )}

      {/* Recording: show listening hint */}
      {state === "recording" && !hasTranscript && (
        <p className="text-[15px] leading-[1.4] text-text-tertiary max-w-[280px] mb-[16px] text-center animate-fade-in-up">
          正在聆听...
        </p>
      )}

      {/* Recording: show transcript if available (from interim result) */}
      {state === "recording" && hasTranscript && (
        <p className="text-[17px] leading-[1.5] text-text-primary animate-fade-in-up max-w-[280px] mb-[16px] text-center">
          {transcript}
        </p>
      )}

      {/* Step flow display */}
      {showSteps && (
        <div className="mb-[16px] flex flex-col items-start gap-[8px] min-h-[60px] w-[220px]">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-center gap-[10px] animate-step-enter"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <StepIcon status={step.status} />
              <span
                className="text-[14px] leading-[1.3]"
                style={{
                  color:
                    step.status === "active"
                      ? "var(--color-accent)"
                      : step.status === "completed"
                        ? "var(--color-text-secondary)"
                        : "var(--color-text-tertiary)",
                  fontWeight: step.status === "active" ? 500 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Response after success/error (no steps shown) */}
      {(state === "success" || state === "error") && responseText && !showSteps && (
        <p
          className="text-[15px] leading-[1.4] animate-fade-in-up max-w-[280px] px-[16px] py-[8px] rounded-[12px] mb-[16px] text-center"
          style={{
            backgroundColor: state === "error" ? "var(--color-accent-rose-soft)" : "var(--color-accent-soft)",
            color: "var(--color-text-secondary)",
          }}
        >
          {responseText}
        </p>
      )}

      {/* Follow-up question */}
      {currentQuestion && (
        <div className="mb-[16px] max-w-[280px] text-center">
          <p className="text-[14px] leading-[1.4] text-text-secondary bg-bg-secondary px-[14px] py-[8px] rounded-[12px]">
            {currentQuestion}
          </p>
        </div>
      )}

      {/* Waveform pill button */}
      <button
        className="relative flex items-end justify-center gap-[4px] h-[52px] cursor-pointer px-[24px] py-0 outline-none rounded-full bg-bg-card border transition-all duration-200 hover:bg-bg-secondary active:bg-bg-secondary"
        style={{
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          boxShadow: isActive ? "0 0 0 4px var(--color-accent-soft)" : "var(--shadow-hairline)",
          borderColor: isActive ? "var(--color-accent)" : "var(--color-separator)",
        }}
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={hintText}
      >
        {/* Recording indicator dot */}
        {isRecording && (
          <div className="w-[8px] h-[8px] rounded-full mr-[2px] animate-pulse-dot" style={{ backgroundColor: "var(--color-accent-rose)" }} />
        )}

        {/* 5 waveform bars */}
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full origin-center"
            style={{
              backgroundColor: state === "error"
                ? "var(--color-accent-rose)"
                : isActive
                  ? "var(--color-accent)"
                  : "var(--color-text-tertiary)",
              opacity: state === "idle" ? 0.6 : 1,
              height: "26px",
              transform: isActive
                ? undefined
                : `scaleY(${0.25 + Math.sin((i / (BAR_COUNT - 1)) * Math.PI) * 0.6})`,
              animation: isActive ? `wave-bar-${i + 1} 0.5s ease-in-out infinite` : undefined,
              animationDelay: isActive ? `${i * 0.07}s` : undefined,
              transition: "background-color 0.3s, opacity 0.3s",
            }}
          />
        ))}
      </button>

      {/* Hint text */}
      <span
        className="text-[13px] leading-[1.3] mt-[12px] transition-colors duration-300 font-[400]"
        style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-tertiary)" }}
      >
        {hintText}
      </span>
    </div>
  );
}
