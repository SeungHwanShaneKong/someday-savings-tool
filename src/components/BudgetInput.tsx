import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatKoreanWon } from '@/lib/budget-categories';
import { cn } from '@/lib/utils';

interface BudgetInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  label: string;
  className?: string;
  autoFocus?: boolean;
}

export function BudgetInput({ 
  value, 
  onChange, 
  placeholder, 
  label, 
  className,
  autoFocus = false 
}: BudgetInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isFocused && value > 0) {
      setInputValue(formatKoreanWon(value));
    } else if (!isFocused && value === 0) {
      setInputValue('');
    }
  }, [value, isFocused]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    // Parse the input - allow only numbers
    const numericValue = raw.replace(/[^0-9]/g, '');
    const parsed = parseInt(numericValue) || 0;

    // Debounce the onChange call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(parsed);
    }, 300);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number for editing
    if (value > 0) {
      setInputValue(value.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the display
    if (value > 0) {
      setInputValue(formatKoreanWon(value));
    } else {
      setInputValue('');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-body font-medium text-foreground">{label}</label>
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || '금액을 입력해주세요'}
        className="h-14 text-body-lg bg-secondary border-0 focus:ring-2 focus:ring-primary/20 rounded-xl placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
