import { motion } from 'framer-motion';

export function RiskRing({ score, level }: { score: number, level: string }) {
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let colorClass = "text-success stroke-success drop-shadow-[0_0_15px_rgba(0,255,163,0.4)]";
  if (score > 25) colorClass = "text-warning stroke-warning drop-shadow-[0_0_15px_rgba(255,176,32,0.4)]";
  if (score > 50) colorClass = "text-orange-500 stroke-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]";
  if (score > 75) colorClass = "text-destructive stroke-destructive drop-shadow-[0_0_15px_rgba(255,42,95,0.4)]";

  return (
    <div className="relative flex flex-col items-center justify-center shrink-0">
      <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
        {/* Background track */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
        {/* Progress ring */}
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={colorClass}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-5xl font-display font-bold text-white tracking-tighter">
          {score}
        </span>
      </div>
      <div className={`mt-5 font-mono text-sm uppercase tracking-[0.2em] font-bold ${colorClass.split(' ')[0]}`}>
        {level} RISK
      </div>
    </div>
  );
}
