import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export function ScanAnimation() {
  return (
    <div className="w-full max-w-2xl mx-auto h-[400px] border border-primary/20 rounded-3xl bg-black/60 overflow-hidden flex flex-col items-center justify-center backdrop-blur-md relative shadow-[0_0_50px_rgba(0,229,255,0.05)]">
      {/* Scanning Line */}
      <motion.div 
        className="absolute left-0 w-full h-[2px] bg-primary shadow-[0_0_20px_2px_#00e5ff] z-20"
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Hex Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px] opacity-50 z-0" />
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
           <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
           <Shield className="w-16 h-16 text-primary relative z-10" strokeWidth={1.5} />
        </motion.div>
        
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-display font-bold text-primary tracking-[0.2em] uppercase">
            DECRYPTING PAYLOAD
          </h3>
          <p className="text-sm font-mono text-primary/60">
            Running heuristics and analyzing contract bytecode...
          </p>
        </div>
        
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary rounded-full"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
