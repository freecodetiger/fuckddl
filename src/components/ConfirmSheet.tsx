interface ConfirmSheetProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel = "确认",
  cancelLabel = "取消",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" onClick={onCancel}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 animate-fade-in-up" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-[420px] bg-bg-card rounded-t-[20px] px-[20px] pt-[24px] pb-[36px] animate-fade-in-up"
        style={{ animationDuration: "0.25s", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[17px] font-[600] text-text-primary text-center mb-[6px]">
          {title}
        </h3>
        <p className="text-[14px] text-text-secondary text-center mb-[24px] leading-[1.4]">
          {message}
        </p>

        <div className="flex gap-[10px]">
          <button
            className="flex-1 py-[12px] rounded-[12px] text-[15px] font-[500] bg-bg-secondary text-text-primary hover:bg-separator-light transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="flex-1 py-[12px] rounded-[12px] text-[15px] font-[600] text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: destructive ? "var(--color-accent-rose)" : "var(--color-accent)" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
