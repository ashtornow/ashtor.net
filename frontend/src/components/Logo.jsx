export const LogoMark = ({ size = 15, className = "text-emerald-400" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M6 8.5 L9.2 11.5 L6 14.5" />
    <line x1="13.5" y1="9.5" x2="18.5" y2="7.5" />
    <path d="M7.5 16.5 Q12 20.5 16.5 15.5" />
  </svg>
);

export const LogoBox = ({ size = 15 }) => (
  <span className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center group-hover:shadow-[0_0_18px_rgba(16,185,129,0.35)] transition-shadow duration-300">
    <LogoMark size={size} />
  </span>
);
