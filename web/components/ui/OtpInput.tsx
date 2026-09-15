'use client';

import React, { useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const char = e.target.value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const valArray = value.split('');
    valArray[idx] = char;
    const newVal = valArray.join('').slice(0, length);
    onChange(newVal);

    if (char && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const nextFocus = Math.min(pasted.length, length - 1);
    inputsRef.current[nextFocus]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center my-4">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
        />
      ))}
    </div>
  );
};
