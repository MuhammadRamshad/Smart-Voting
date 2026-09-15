'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface CandidateCardProps {
  id: number;
  name: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  id,
  name,
  selected,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between p-5 rounded-xl border transition-all text-left ${
        selected
          ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
            selected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          #{id}
        </div>
        <div>
          <h3 className="font-semibold text-lg text-slate-100">{name}</h3>
          <p className="text-xs text-slate-400">Official Candidate Candidate #{id}</p>
        </div>
      </div>
      <div
        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
          selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-700'
        }`}
      >
        {selected && <Check className="w-4 h-4" />}
      </div>
    </button>
  );
};
