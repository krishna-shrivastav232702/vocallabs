'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

interface ConnectionIndicatorProps {
  isReconnecting: boolean;
}

export function ConnectionIndicator({ isReconnecting }: ConnectionIndicatorProps) {
  return (
    <AnimatePresence>
      {isReconnecting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: 'var(--color-pending-bg)',
            border: '1px solid var(--color-pending-border)',
            color: 'var(--color-pending)',
          }}
          role="status"
          aria-live="polite"
          aria-label="Reconnecting to live updates"
        >
          <WifiOff className="w-3 h-3 animate-pulse" />
          Reconnecting…
        </motion.div>
      )}
    </AnimatePresence>
  );
}
