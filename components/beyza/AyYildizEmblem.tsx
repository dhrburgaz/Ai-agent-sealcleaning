/**
 * An original, abstracted crescent + star motif — a geometric emblem, not a
 * copy of any flag or copyrighted mark. Used inside the AI Core, boot
 * sequence, and as a subtle divider/watermark across the futuristic UI.
 */
export function AyYildizEmblem({ className, opacity = 1 }: { className?: string; opacity?: number }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" style={{ opacity }} aria-hidden="true">
      <path
        d="M58 20 A32 32 0 1 0 58 80 A26 26 0 1 1 58 20 Z"
        fill="currentColor"
      />
      <path
        d="M72 44 L75.4 51.2 L83.3 52.1 L77.5 57.5 L79.1 65.3 L72 61.5 L64.9 65.3 L66.5 57.5 L60.7 52.1 L68.6 51.2 Z"
        fill="currentColor"
      />
    </svg>
  );
}
