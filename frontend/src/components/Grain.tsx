export function Grain({ opacity = 0.18 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[2]"
      style={{
        backgroundImage: "var(--noise-svg)",
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
}
