import React, { useRef } from 'react';

interface LobbyCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onEnter?: () => void;
}

export function LobbyCodeInput({ value, onChange, disabled, onEnter }: LobbyCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = value.split('').concat(Array(6).fill('')).slice(0, 6);

  const handleInputChange = (index: number, val: string) => {
    if (!/^[a-zA-Z0-9]?$/.test(val)) return;
    const charsArr = chars.slice();
    charsArr[index] = val.toUpperCase();
    onChange(charsArr.join(''));
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData
      .getData('Text')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
    if (pasted.length === 0) return;
    const newCode = pasted.slice(0, 6).split('');
    const filled = Array(6).fill('');
    for (let i = 0; i < 6; i++) {
      filled[i] = newCode[i] || '';
    }
    onChange(filled.join(''));
    setTimeout(() => {
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }, 0);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      const updated = chars.slice();
      updated[index - 1] = '';
      onChange(updated.join(''));
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && onEnter && chars.every((c) => c)) {
      onEnter();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {chars.map((char, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el;
          }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={char}
          onChange={(e) => handleInputChange(idx, e.target.value)}
          onPaste={idx === 0 ? handlePaste : undefined}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          className="focus:ring-primary h-12 w-10 rounded border border-gray-600 bg-gray-700/80 text-center font-mono text-2xl text-white transition-all focus:outline-none focus:ring-2"
          aria-label={`Game code character ${idx + 1}`}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
