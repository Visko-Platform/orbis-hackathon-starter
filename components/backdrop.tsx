// Backdrop: faint hand-drawn doodles on white, with clouds drifting behind
// them. Ink for the drawing, a touch of coral and amber so it isn't grey.
const CLOUD = "M0 44h118a30 30 0 0 0 3-60 42 42 0 0 0-79-11A27 27 0 0 0 0 44z";

export function Backdrop() {
  const d = (key: string, path: string, extra: Record<string, unknown> = {}) => (
    <path
      key={key} d={path} fill="none" stroke="#2B2350" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" {...extra}
    />
  );
  const star = (key: string, x: number, y: number, r: number, fill = "#2B2350") => (
    <path
      key={key}
      d={`M${x} ${y - r}q${r * 0.18} ${r * 0.8} ${r} ${r}q${-r * 0.82} ${r * 0.2} ${-r} ${r}q${-r * 0.18} ${-r * 0.8} ${-r} ${-r}q${r * 0.82} ${-r * 0.2} ${r} ${-r}z`}
      fill={fill}
    />
  );
  const cloud = (key: string, x: number, y: number, s: number, o: number) => (
    <path key={key} d={CLOUD} transform={`translate(${x} ${y}) scale(${s})`} fill="#2B2350" opacity={o} />
  );

  return (
    <div className="sb-bg" aria-hidden>
      {/* clouds sit furthest back */}
      <svg className="sb-bg-clouds" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g className="sb-bg-drift">{cloud("a", -180, 128, 1.9, 0.05)}{cloud("b", 760, 74, 1.1, 0.04)}</g>
        <g className="sb-bg-drift-2">{cloud("c", -220, 352, 1.3, 0.045)}{cloud("d", 940, 250, 2.2, 0.03)}</g>
        <g className="sb-bg-drift-3">{cloud("e", -200, 640, 1.6, 0.035)}</g>
      </svg>

      {/* a few things in color, very quiet */}
      <svg className="sb-bg-tint" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {star("t1", 1292, 120, 34, "#FF5D73")}
        {star("t2", 1364, 262, 14, "#FFD166")}
        <circle cx="150" cy="140" r="42" fill="#FFD166" />
        <path d="M120 604a52 52 0 1 1 104 0c0 34-34 62-52 78-18-16-52-44-52-78z" fill="#3FB6A8" />
      </svg>

      {/* the drawing itself */}
      <svg className="sb-bg-ink" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <circle cx="150" cy="140" r="42" fill="none" stroke="#2B2350" strokeWidth="3" />
        {d("sun", "M150 68v-26M150 238v26M78 140H52M248 140h26M99 89 81 71M201 191l18 18M201 89l18-18M99 191l-18 18")}
        {star("s1", 1196, 222, 20)}
        {d("bal", "M120 604a52 52 0 1 1 104 0c0 34-34 62-52 78-18-16-52-44-52-78z")}
        {d("str", "M172 686v54")}
        {d("knot", "M172 740c-14 6-14 22 0 28")}
        {d("h1", "M0 832c96-70 168-70 252 0")}
        {d("h2", "M196 832c86-58 150-58 232 0")}
        {d("h3", "M1010 836c96-78 176-78 272 0")}
        {d("h4", "M1208 836c72-52 130-52 232 0")}
        {d("sq", "M64 742c40-26 78 26 118 0s78 26 118 0")}
        {d("pl", "M1236 520l148-56-54 148-30-62z")}
        {d("pl2", "M1300 550l84-86")}
        {d("dash", "M1086 598c62-18 114-32 152-50", { strokeDasharray: "2 18" })}
      </svg>
    </div>
  );
}

// One way to answer "what happens next" without talking.
function TypeBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <form
      className="sb-type"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        className="sb-type-input"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="send"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="submit" className="sb-type-send" disabled={!value.trim()} aria-label="send">
        ➜
      </button>
    </form>
  );
}
