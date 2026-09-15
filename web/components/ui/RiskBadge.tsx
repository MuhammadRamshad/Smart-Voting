'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface RiskBadgeProps {
  score: number;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score }) => {
  if (score >= 0.8) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/60 border border-red-500/50 text-red-300">
        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        High Risk Review ({score.toFixed(2)})
      </span>
    );
  }

  if (score >= 0.6) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-500/50 text-amber-300">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        Flagged for Review ({score.toFixed(2)})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
      Low Risk ({score.toFixed(2)})
    </span>
  );
};
