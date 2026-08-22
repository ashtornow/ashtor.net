import { useLanguage } from '@/i18n';

export default function Marquee() {
  const { t } = useLanguage();
  const items = [...t.marquee, ...t.marquee];

  return (
    <div
      className="relative border-y border-white/5 bg-[#0B0E14] py-4 overflow-hidden"
      data-testid="editorial-marquee"
    >
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-10">
            <span className="font-mono-tech text-xs tracking-[0.3em] uppercase text-slate-500">
              {item}
            </span>
            <span className="text-emerald-500/50 text-[10px]">◆</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#07090E] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#07090E] to-transparent" />
    </div>
  );
}
