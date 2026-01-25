import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Category } from '@/lib/budget-categories';

interface DraggableCategoryRowProps {
  category: Category;
  customItemsCount: number;
  children: React.ReactNode;
}

export function DraggableCategoryHeader({ 
  category, 
  rowSpan 
}: { 
  category: Category; 
  rowSpan: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableCell 
      ref={setNodeRef}
      style={style}
      rowSpan={rowSpan}
      className={cn(
        "font-semibold bg-secondary/50 align-top pt-2 sm:pt-4 px-1 sm:px-4",
        isDragging && "opacity-50 bg-primary/20"
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors touch-none"
          title="드래그하여 순서 변경"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-base sm:text-lg">{category.icon}</span>
        <span className="text-[10px] sm:text-sm text-center break-keep">{category.name}</span>
      </div>
    </TableCell>
  );
}
