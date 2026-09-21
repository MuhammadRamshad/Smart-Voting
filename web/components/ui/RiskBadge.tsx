'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface RiskBadgeProps {
  score: number;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score }) => {
  if (score >= 0.8) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-600 text-neutral-300 text-[10px] font-mono uppercase">
        <AlertTriangle className="w-3 h-3" />
        High ({score.toFixed(2)})
      </span>
    );
  }

  if (score >= 0.6) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 text-neutral-400 text-[10px] font-mono uppercase">
        <AlertTriangle className="w-3 h-3" />
        Medium ({score.toFixed(2)})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-800 text-neutral-500 text-[10px] font-mono uppercase">
      <ShieldCheck className="w-3 h-3" />
      Low ({score.toFixed(2)})
    </span>
  );
};
