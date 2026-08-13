"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({ value, onChange, placeholder = "Search tools…", autoFocus }: Props) {
  return (
    <div
      className="w-full flex items-center gap-3 rounded-full px-5 py-3"
      style={{ backgroundColor: "var(--color-panel)", border: "1px solid var(--color-border)" }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10.8 10.8L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 min-w-0 bg-transparent text-sm outline-none"
        style={{ color: "var(--color-text-primary)" }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="flex-shrink-0 text-sm leading-none transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          title="Clear search"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
