import { type VoiceOrbState } from "../types";

interface VoiceOrbProps {
  state: VoiceOrbState;
  transcript?: string;
  responseText?: string;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export function VoiceOrb({
  state,
  transcript,
  responseText,
  onPressStart,
  onPressEnd,
}: VoiceOrbProps) {
  const orbStyle: React.CSSProperties = {
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "none",
  };

  const hintText = state === "recording"
    ? "松开完成"
    : state === "processing"
    ? "正在理解"
    : "按住说话";

  if (state === "idle") {
    orbStyle.backgroundColor = "rgba(255, 90, 78, 0.12)";
    orbStyle.boxShadow = "0 4px 20px rgba(255, 90, 78, 0.15)";
    orbStyle.animation = "breathe 3s ease-in-out infinite";
  } else if (state === "recording") {
    orbStyle.backgroundColor = "#FF5A4E";
    orbStyle.boxShadow = "0 8px 32px rgba(255, 90, 78, 0.25), 0 0 0 15px rgba(255, 90, 78, 0.08)";
    orbStyle.animation = "pulse-record 0.8s ease-in-out infinite";
    orbStyle.transform = "scale(1.08)";
  } else if (state === "processing") {
    orbStyle.backgroundColor = "transparent";
    orbStyle.border = "3px solid rgba(255, 90, 78, 0.4)";
    orbStyle.boxShadow = "0 4px 20px rgba(255, 90, 78, 0.1)";
    orbStyle.animation = "spin 1s linear infinite";
    orbStyle.transform = "scale(0.95)";
  } else if (state === "success") {
    orbStyle.backgroundColor = "rgba(255, 90, 78, 0.12)";
    orbStyle.boxShadow = "0 4px 20px rgba(255, 90, 78, 0.15)";
    orbStyle.transform = "scale(1)";
  } else if (state === "error") {
    orbStyle.backgroundColor = "rgba(255, 59, 48, 0.12)";
    orbStyle.boxShadow = "0 4px 20px rgba(255, 59, 48, 0.15)";
    orbStyle.transform = "scale(1)";
  }

  return (
    <div className="flex flex-col items-center">
      {/* Transcript / Response text */}
      <div className="mb-md text-center min-h-[48px] flex flex-col items-center justify-end">
        {state === "recording" && transcript && (
          <p
            className="text-[17px] leading-[1.5] text-text-primary animate-fade-in max-w-[300px]"
            key={transcript}
          >
            {transcript}
          </p>
        )}

        {state === "processing" && transcript && (
          <div className="flex flex-col items-center gap-sm">
            <p className="text-[17px] leading-[1.5] text-text-secondary max-w-[300px]">
              {transcript}
            </p>
            <div className="flex gap-[4px]">
              <div className="w-[4px] h-[4px] rounded-full bg-accent dot-bounce-1" />
              <div className="w-[4px] h-[4px] rounded-full bg-accent dot-bounce-2" />
              <div className="w-[4px] h-[4px] rounded-full bg-accent dot-bounce-3" />
            </div>
          </div>
        )}

        {state === "success" && responseText && (
          <p className="text-[15px] leading-[1.4] text-text-secondary animate-fade-in max-w-[300px]">
            {responseText}
          </p>
        )}

        {state === "error" && responseText && (
          <p className="text-[13px] leading-[1.3] text-text-secondary animate-fade-in max-w-[300px]">
            {responseText}
          </p>
        )}
      </div>

      {/* Orb button */}
      <button
        style={orbStyle}
        onPointerDown={(e) => {
          e.preventDefault();
          onPressStart();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          onPressEnd();
        }}
        onPointerLeave={() => {
          if (state === "recording") {
            onPressEnd();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={hintText}
      />

      {/* Hint text */}
      <span
        className="text-[13px] leading-[1.3] mt-sm"
        style={{
          color: state === "recording"
            ? "var(--color-text-secondary)"
            : "var(--color-text-tertiary)",
          transition: "color 0.2s ease",
        }}
      >
        {hintText}
      </span>
    </div>
  );
}
