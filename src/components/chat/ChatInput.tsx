import { useState, useCallback, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isLoading,
  placeholder = '메시지를 입력하세요...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      setValue('');
      // Reset height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  }, [value, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-card">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className={cn(
          'flex-1 resize-none bg-muted/50 rounded-xl px-3.5 py-2.5 text-sm',
          'border-0 focus:ring-1 focus:ring-primary/30 focus:outline-none',
          'placeholder:text-muted-foreground/60',
          'max-h-[120px]',
          isLoading && 'opacity-50'
        )}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || isLoading}
        className={cn(
          'p-2.5 rounded-xl transition-all flex-shrink-0',
          value.trim() && !isLoading
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
