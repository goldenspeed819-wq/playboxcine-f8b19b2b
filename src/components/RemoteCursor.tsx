import { MousePointer2 } from 'lucide-react';

type Props = {
  x: number;
  y: number;
  visible: boolean;
  pressed: boolean;
};

/** Virtual cursor drawn on the host (PC) while the phone acts as a touchpad. */
export default function RemoteCursor({ x, y, visible, pressed }: Props) {
  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[9999] transition-transform duration-75"
      style={{ left: 0, top: 0, transform: `translate3d(${x}px, ${y}px, 0)` }}
    >
      <div className="relative -translate-x-1 -translate-y-1">
        <span
          className={`absolute -inset-3 rounded-full bg-primary/25 transition-transform ${
            pressed ? 'scale-125' : 'scale-100'
          }`}
        />
        <MousePointer2
          className={`relative w-7 h-7 text-primary drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] transition-transform ${
            pressed ? 'scale-90' : 'scale-100'
          }`}
          strokeWidth={2.5}
          fill="currentColor"
        />
      </div>
    </div>
  );
}