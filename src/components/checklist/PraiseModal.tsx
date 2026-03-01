import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PraiseModalProps {
  open: boolean;
  onClose: () => void;
  emoji: string;
  title: string;
  description: string;
}

export function PraiseModal({
  open,
  onClose,
  emoji,
  title,
  description,
}: PraiseModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs text-center sm:max-w-sm">
        <DialogHeader className="items-center space-y-3 pt-4">
          <div className="text-6xl animate-bounce">{emoji}</div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose} className="w-full mt-2">
          계속 준비하기
        </Button>
      </DialogContent>
    </Dialog>
  );
}
