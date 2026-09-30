import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { HallOfShameSection } from '@/components/sigil/HallOfShameSection';

export default function HistoryPage() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" strokeWidth={1.7} />
            </div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Public Threat Intel</h1>
          </div>
          <p className="text-sm text-white/35 pl-12">Curated high-risk contracts and incidents. Personal scans stay private by default.</p>
        </div>
      </motion.div>
      <HallOfShameSection />
    </div>
  );
}
