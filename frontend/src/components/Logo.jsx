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
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3.5 7.5 L8 12 L3.5 16.5" />
    <motion.line
      x1="14.5"
      y1="12"
      x2="20"
      y2="11"
      variants={winkVariants}
      transition={{ type: 'spring', stiffness: 520, damping: 11 }}
    />
    <motion.path
      d="M5.5 19 Q12 23.5 18.5 18"
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
    className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center cursor-pointer group-hover:shadow-[0_0_18px_rgba(16,185,129,0.35)] transition-shadow duration-300"
    data-testid="logo-wink-box"
  >
    <LogoMark size={size} />
  </motion.span>
);
