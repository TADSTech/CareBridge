import React from 'react';
import { motion } from 'framer-motion';

interface AudioWaveformProps {
  active: boolean;
  bars?: number;
  color?: 'cyan' | 'mint' | 'violet';
  height?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  active,
  bars = 16,
  color = 'cyan',
  height = 'h-10',
}) => {
  const barColors = {
    cyan: 'bg-clinical-cyan',
    mint: 'bg-mint-vital',
    violet: 'bg-iris-pulse',
  }[color];

  return (
    <div className={`flex items-center justify-center space-x-1 ${height}`}>
      {Array.from({ length: bars }).map((_, index) => {
        // Create varied animation delays and scale heights for realistic audio visualizer look
        const minHeight = 4;
        const maxHeight = active ? 28 + Math.sin(index * 0.8) * 12 : 6;
        const duration = 0.4 + (index % 5) * 0.1;

        return (
          <motion.div
            key={index}
            className={`w-1 rounded-full ${barColors} transition-all duration-150`}
            animate={
              active
                ? {
                    height: [minHeight, maxHeight, minHeight],
                  }
                : { height: minHeight }
            }
            transition={
              active
                ? {
                    repeat: Infinity,
                    duration: duration,
                    ease: 'easeInOut',
                    delay: (index % 4) * 0.1,
                  }
                : { duration: 0.2 }
            }
          />
        );
      })}
    </div>
  );
};
