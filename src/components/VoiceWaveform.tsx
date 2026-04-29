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

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "completed") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" fill="var(--color-accent-green)" />
        <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 18, strokeDashoffset: 18, animation: "check-stroke 0.3s ease-out 0.1s forwards" }} />
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
  return <div className="w-[16px] h-[16px] rounded-full border-2 shrink-0" style={{ borderColor: "var(--color-text-tertiary)" }} />;
}

export function VoiceWaveform({
  state,
  transcript,
  responseText,
  steps,
  currentQuestion,
  isRecording: _isRecording,
  onToggle: _onToggle,
}: VoiceWaveformProps) {
  const isProcessing = state === "processing";
  const showSteps = steps && steps.length > 0 && (state === "processing" || state === "success" || state === "error");
  const hasTranscript = transcript && transcript.length > 0;

  return (
    <div className="flex flex-col items-center select-none">
      {/* Transcript during processing */}
      {isProcessing && hasTranscript && (
        <p className="text-[16px] leading-[1.4] text-text-secondary animate-fade-in-up max-w-[280px] mb-[8px] text-center font-[500]">
          "{transcript}"
        </p>
      )}

      {/* Recording hint */}
      {state === "recording" && !hasTranscript && (
        <p className="text-[14px] leading-[1.4] text-text-tertiary max-w-[280px] mb-[8px] text-center animate-fade-in-up">
          正在聆听...
        </p>
      )}

      {state === "recording" && hasTranscript && (
        <p className="text-[17px] leading-[1.5] text-text-primary animate-fade-in-up max-w-[280px] mb-[8px] text-center">
          {transcript}
        </p>
      )}

      {/* Step flow */}
      {showSteps && (
        <div className="mb-[8px] flex flex-col items-start gap-[6px] w-[220px]">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-[10px] animate-step-enter" style={{ animationDelay: `${i * 0.08}s` }}>
              <StepIcon status={step.status} />
              <span className="text-[14px] leading-[1.3]"
                style={{ color: step.status === "active" ? "var(--color-accent)" : step.status === "completed" ? "var(--color-text-secondary)" : "var(--color-text-tertiary)", fontWeight: step.status === "active" ? 500 : 400 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Response */}
      {(state === "success" || state === "error") && responseText && !showSteps && (
        <p className="text-[15px] leading-[1.4] animate-fade-in-up max-w-[280px] px-[16px] py-[8px] rounded-[12px] mb-[8px] text-center"
          style={{ backgroundColor: state === "error" ? "var(--color-accent-rose-soft)" : "var(--color-accent-soft)", color: "var(--color-text-secondary)" }}>
          {responseText}
        </p>
      )}

      {/* Follow-up question */}
      {currentQuestion && (
        <div className="mb-[8px] max-w-[280px] text-center">
          <p className="text-[14px] leading-[1.4] text-text-secondary bg-bg-secondary px-[14px] py-[8px] rounded-[12px]">{currentQuestion}</p>
        </div>
      )}
    </div>
  );
}
