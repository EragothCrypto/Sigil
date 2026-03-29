import { motion } from 'framer-motion';

export function ScanAnimation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
      <div className="relative flex flex-col items-center gap-8">

        {/* Concentric rings */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-primary/30"
              style={{ width: `${100 + i * 40}%`, height: `${100 + i * 40}%` }}
              animate={{ opacity: [0.15, 0.5, 0.15], scale: [0.96, 1.04, 0.96] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
            />
          ))}

          {/* Center shield */}
          <motion.div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(168,85,247,0.15) 100%)', border: '1px solid rgba(139,92,246,0.35)' }}
            animate={{ scale: [0.97, 1.03, 0.97] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Scanning line that moves */}
            <motion.div
              className="absolute left-0 right-0 h-[1px] rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)', boxShadow: '0 0 8px #8b5cf6' }}
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
            <div className="text-2xl">🔍</div>
          </motion.div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2">
          <motion.p
            className="font-display font-bold text-lg text-white/80 tracking-[0.15em] uppercase"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            Analyzing
          </motion.p>
          <p className="text-sm font-mono text-white/30">
            Running AI heuristics and bytecode analysis…
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
