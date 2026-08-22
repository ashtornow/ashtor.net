import { motion } from 'framer-motion';

const winkVariants = {
  rest: { y: 0 },
  wink: { y: 3 },
};

const mouthVariants = {
  rest: { scaleY: 1 },
  wink: { scaleY: 1.15 },
};

export const LogoMark = ({ size = 15, className = "text-emerald-400" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3.5 7.5 L8 12 L3.5 16.5" />
    <motion.line
      x1="14.5"
      y1="10.8"
      x2="20"
      y2="12"
      variants={winkVariants}
      transition={{ type: 'spring', stiffness: 520, damping: 11 }}
    />
    <motion.path
      d="M6 18.5 Q12 23 18 17.5"
      variants={mouthVariants}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      style={{ transformBox: 'fill-box', transformOrigin: 'top center' }}
    />
  </svg>
);

export const LogoBox = ({ size = 15 }) => (
  <motion.span
    initial="rest"
    animate="rest"
    whileHover="wink"
    className="relative w-8 h-8 rounded-lg bg-[#0A100E] border border-emerald-400/60 flex items-center justify-center cursor-pointer shadow-[0_0_14px_rgba(16,185,129,0.4),inset_0_0_10px_rgba(16,185,129,0.12)] group-hover:shadow-[0_0_24px_rgba(16,185,129,0.65),inset_0_0_12px_rgba(16,185,129,0.2)] transition-shadow duration-300"
    data-testid="logo-wink-box"
  >
    <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-400/15 via-transparent to-emerald-500/10" />
    <LogoMark size={size} />
  </motion.span>
);
