import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
  SVGProps,
} from "react";

// Carvuk primitives adapted to this app's CSS stack. Variant colors, radii,
// type, and motion are sourced from the original design-system package.
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "glass";
  size?: "default" | "sm" | "icon";
  loading?: boolean;
};

export function Button({
  variant = "default",
  size = "default",
  loading,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button-${variant} button-${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Chip({
  selected,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      className={`chip ${className}`}
      data-selected={selected}
      aria-pressed={selected}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "brand";
}) {
  return (
    <span className={`badge badge-${tone} caption ${className}`} {...props} />
  );
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="switch-field">
      <span>
        <span className="switch-label body-sm">{label}</span>
        {description && <span className="caption muted">{description}</span>}
      </span>
      <input
        className="switch"
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
    </label>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onValueChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

type IconName =
  | "orbit"
  | "play"
  | "pause"
  | "reset"
  | "volume"
  | "muted"
  | "arrow"
  | "sparkles"
  | "sliders"
  | "activity"
  | "watch"
  | "replay"
  | "upload"
  | "chevron"
  | "check"
  | "link"
  | "close";

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    orbit: (
      <>
        <circle cx="12" cy="12" r="3" />
        <ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)" />
        <path d="M5 6a9 9 0 0 1 14 12" />
      </>
    ),
    play: <path d="m9 5 11 7-11 7V5Z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    reset: <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />,
    volume: (
      <path d="m11 5-6 4H2v6h3l6 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" />
    ),
    muted: <path d="m11 5-6 4H2v6h3l6 4V5ZM16 9l6 6m0-6-6 6" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    sparkles: (
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4" />
    ),
    sliders: (
      <>
        <path d="M4 7h9m4 0h3M4 17h3m4 0h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </>
    ),
    activity: <path d="M2 12h4l3-8 6 16 3-8h4" />,
    watch: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="4" />
        <path d="m9 6 1-4h4l1 4m-6 12 1 4h4l1-4m-3-8v3l2 1" />
      </>
    ),
    replay: <path d="M4 9a8 8 0 1 1 0 7M3 3v6h6m1 0 5 3-5 3V9Z" />,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    check: <path d="m5 12 4 4L19 6" />,
    link: (
      <path d="m10 13 4-4m-7 6-1 1a3 3 0 0 0 4 4l4-4a3 3 0 0 0 0-4m3-3 1-1a3 3 0 0 0-4-4l-4 4a3 3 0 0 0 0 4" />
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
