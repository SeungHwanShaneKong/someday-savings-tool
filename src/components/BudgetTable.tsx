import { useState, useRef, useMemo } from 'react';
import { formatKoreanWon, SubCategory, Category } from '@/lib/budget-categories';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Plus, Pencil, Check, X, Users, Trash2, GripVertical } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCategoryOrder } from '@/hooks/useCategoryOrder';

export type CostSplitType = 'groom' | 'bride' | 'together' | '-';

export interface ExtendedBudgetItem {
  id: string;
  budget_id: string;
  category: string;
  sub_category: string;
  amount: number;
  is_paid: boolean;
  notes: string | null;
  unit_price?: number | null;
  quantity?: number | null;
  custom_name?: string | null;
  is_custom?: boolean;
  cost_split?: CostSplitType;
}

export const COST_SPLIT_OPTIONS: { value: CostSplitType; label: string }[] = [
  { value: '-', label: '-' },
  { value: 'groom', label: '신랑' },
  { value: 'bride', label: '신부' },
  { value: 'together', label: '같이' },
];

interface BudgetTableProps {
  items: ExtendedBudgetItem[];
  onAmountChange: (category: string, subCategory: string, amount: number, unitPrice?: number, quantity?: number) => void;
  onTogglePaid: (itemId: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  onRenameItem?: (itemId: string, newName: string) => void;
  onAddCustomItem?: (categoryId: string, name: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onCostSplitChange?: (itemId: string, costSplit: CostSplitType) => void;
}

// Draggable Category Section Component
function DraggableCategorySection({
  category,
  items,
  children,
}: {
  category: Category;
  items: ExtendedBudgetItem[];
  children: React.ReactNode;
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
    <tbody
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "opacity-50 bg-primary/10"
      )}
    >
      {children}
    </tbody>
  );
}

export function BudgetTable({ 
  items, 
  onAmountChange, 
  onTogglePaid, 
  onNotesChange,
  onRenameItem,
  onAddCustomItem,
  onDeleteItem,
  onCostSplitChange
}: BudgetTableProps) {
  const { orderedCategories, reorderCategories } = useCategoryOrder();
  
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [tempName, setTempName] = useState<string>('');
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');
  const [perPersonPopover, setPerPersonPopover] = useState<string | null>(null);
  const [tempUnitPrice, setTempUnitPrice] = useState<string>('');
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // For handling Korean IME input properly
  const [tempNotes, setTempNotes] = useState<{ [key: string]: string }>({});
  const isComposingRef = useRef<{ [key: string]: boolean }>({});

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderCategories(active.id as string, over.id as string);
    }
  };

  const handleNotesChange = (itemId: string, value: string) => {
    setTempNotes(prev => ({ ...prev, [itemId]: value }));
  };

  const handleNotesBlur = (itemId: string, originalNotes: string | null) => {
    const newNotes = tempNotes[itemId];
    if (newNotes !== undefined && newNotes !== (originalNotes || '')) {
      onNotesChange(itemId, newNotes);
    }
    setTempNotes(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handleNotesFocus = (itemId: string, currentNotes: string | null) => {
    setTempNotes(prev => ({ ...prev, [itemId]: currentNotes || '' }));
  };

  const handleCompositionStart = (itemId: string) => {
    isComposingRef.current[itemId] = true;
  };

  const handleCompositionEnd = (itemId: string) => {
    isComposingRef.current[itemId] = false;
  };

  const getItem = (categoryId: string, subCategoryId: string) => {
    return items.find(item => item.category === categoryId && item.sub_category === subCategoryId);
  };

  const getCustomItems = (categoryId: string) => {
    return items.filter(item => item.category === categoryId && item.is_custom);
  };

  const getCategoryTotal = (categoryId: string) => {
    return items
      .filter(item => item.category === categoryId)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const getOverallTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  // Parse numeric input - only allow numbers
  const parseNumericInput = (value: string): string => {
    return value.replace(/[^0-9]/g, '');
  };

  const handleAmountClick = (categoryId: string, subCategoryId: string, currentAmount: number) => {
    const cellKey = `${categoryId}-${subCategoryId}`;
    setEditingCell(cellKey);
    setTempValue(currentAmount > 0 ? currentAmount.toString() : '');
  };

  const handleAmountChange = (value: string) => {
    const numericValue = parseNumericInput(value);
    setTempValue(numericValue);
  };

  const handleAmountBlur = (categoryId: string, subCategoryId: string) => {
    const amount = parseInt(tempValue) || 0;
    onAmountChange(categoryId, subCategoryId, amount);
    setEditingCell(null);
    setTempValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, categoryId: string, subCategoryId: string) => {
    if (e.key === 'Enter') {
      handleAmountBlur(categoryId, subCategoryId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempValue('');
    }
  };

  const handleStartRename = (itemId: string, currentName: string) => {
    setEditingName(itemId);
    setTempName(currentName);
  };

  const handleSaveRename = (itemId: string) => {
    if (onRenameItem && tempName.trim()) {
      onRenameItem(itemId, tempName.trim());
    }
    setEditingName(null);
    setTempName('');
  };

  const handleCancelRename = () => {
    setEditingName(null);
    setTempName('');
  };

  const handleAddCustomItem = (categoryId: string) => {
    if (onAddCustomItem && newItemName.trim()) {
      onAddCustomItem(categoryId, newItemName.trim());
      setNewItemName('');
      setAddingToCategory(null);
    }
  };

  const handlePerPersonSave = (categoryId: string, subCategoryId: string) => {
    const unitPrice = parseInt(parseNumericInput(tempUnitPrice)) || 0;
    const quantity = parseInt(parseNumericInput(tempQuantity)) || 0;
    const totalAmount = unitPrice * quantity;
    onAmountChange(categoryId, subCategoryId, totalAmount, unitPrice, quantity);
    setPerPersonPopover(null);
    setTempUnitPrice('');
    setTempQuantity('');
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete && onDeleteItem) {
      onDeleteItem(itemToDelete.id);
    }
    setItemToDelete(null);
    setDeleteDialogOpen(false);
  };

  const renderItemRow = (
    category: Category,
    subCat: SubCategory,
    subIndex: number,
    totalRowsForCategory: number,
    item: ExtendedBudgetItem,
    isFirstInCategory: boolean
  ) => {
    const cellKey = `${category.id}-${subCat.id}`;
    const isEditing = editingCell === cellKey;
    const isRenamingThis = editingName === item.id;
    const displayName = item.custom_name || subCat.name;
    const isPerPersonItem = category.id === 'wedding-hall' && subCat.id === 'meal-cost';

    return (
      <TableRow 
        key={cellKey}
        className={cn(
          "hover:bg-muted/50 transition-colors",
          isFirstInCategory && "border-t-2 border-primary/10"
        )}
      >
        {subIndex === 0 && (
          <TableCell 
            rowSpan={totalRowsForCategory}
            className="font-semibold bg-secondary/50 align-top pt-2 sm:pt-4 px-1 sm:px-4"
          >
            <div className="flex flex-col items-center gap-1">
              <div
                className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors touch-none"
                title="드래그하여 순서 변경"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-base sm:text-lg">{category.icon}</span>
              <span className="text-[10px] sm:text-sm text-center break-keep">{category.name}</span>
            </div>
          </TableCell>
        )}
        <TableCell className="text-center px-1 sm:px-4">
          <Checkbox
            checked={item.is_paid || false}
            onCheckedChange={() => onTogglePaid(item.id)}
            className="data-[state=checked]:bg-success data-[state=checked]:border-success h-4 w-4 sm:h-5 sm:w-5"
          />
        </TableCell>
        <TableCell className="text-xs sm:text-sm px-1 sm:px-4">
          {isRenamingThis ? (
            <div className="flex items-center gap-1">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="h-6 sm:h-7 text-xs sm:text-sm w-16 sm:w-24"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(item.id);
                  if (e.key === 'Escape') handleCancelRename();
                }}
              />
              <Button size="icon" variant="ghost" className="h-5 w-5 sm:h-6 sm:w-6" onClick={() => handleSaveRename(item.id)}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5 sm:h-6 sm:w-6" onClick={handleCancelRename}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <span className="break-keep text-[10px] sm:text-sm">{displayName}</span>
              {onRenameItem && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 sm:h-5 sm:w-5 opacity-100 flex-shrink-0"
                  onClick={() => handleStartRename(item.id, displayName)}
                >
                  <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              )}
              {onDeleteItem && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 sm:h-5 sm:w-5 opacity-100 text-destructive flex-shrink-0"
                  onClick={() => {
                    setItemToDelete({ id: item.id, name: displayName });
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="text-right px-1 sm:px-4">
          <div className="flex items-center justify-end gap-0.5 sm:gap-1">
            {isPerPersonItem && (
              <Popover 
                open={perPersonPopover === cellKey} 
                onOpenChange={(open) => {
                  if (open) {
                    setPerPersonPopover(cellKey);
                    setTempUnitPrice(item.unit_price?.toString() || '');
                    setTempQuantity(item.quantity?.toString() || '');
                  } else {
                    setPerPersonPopover(null);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-5 w-5 sm:h-6 sm:w-6">
                    <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 sm:w-64" align="end">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">인원수 계산</div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">1인당 비용 (₩)</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={tempUnitPrice}
                          onChange={(e) => setTempUnitPrice(parseNumericInput(e.target.value))}
                          placeholder="65000"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">예상 인원 (명)</label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={tempQuantity}
                          onChange={(e) => setTempQuantity(parseNumericInput(e.target.value))}
                          placeholder="300"
                          className="h-8"
                        />
                      </div>
                      {tempUnitPrice && tempQuantity && (
                        <div className="text-sm font-medium text-primary">
                          = {formatKoreanWon((parseInt(tempUnitPrice) || 0) * (parseInt(tempQuantity) || 0))}
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handlePerPersonSave(category.id, subCat.id)}
                    >
                      적용
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            {isEditing ? (
              <Input
                type="text"
                inputMode="numeric"
                value={tempValue}
                onChange={(e) => handleAmountChange(e.target.value)}
                onBlur={() => handleAmountBlur(category.id, subCat.id)}
                onKeyDown={(e) => handleKeyDown(e, category.id, subCat.id)}
                className="h-6 sm:h-8 text-right text-[10px] sm:text-sm w-16 sm:w-28"
                autoFocus
                placeholder="0"
              />
            ) : (
              <button
                onClick={() => handleAmountClick(category.id, subCat.id, item.amount || 0)}
                className={cn(
                  "text-right px-1 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-muted transition-colors text-[10px] sm:text-sm",
                  item.amount ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {item.amount ? `₩${item.amount.toLocaleString()}` : '-'}
              </button>
            )}
          </div>
          {item.unit_price && item.quantity && (
            <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
              ₩{item.unit_price.toLocaleString()} × {item.quantity}명
            </div>
          )}
        </TableCell>
        <TableCell className="w-14 sm:w-20 px-1 sm:px-4">
          {onCostSplitChange && (
            <Select
              value={item.cost_split || '-'}
              onValueChange={(value: CostSplitType) => onCostSplitChange(item.id, value)}
            >
              <SelectTrigger className="h-6 sm:h-8 text-[10px] sm:text-xs w-full px-1 sm:px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COST_SPLIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </TableCell>
        <TableCell className="px-1 sm:px-4">
          <Input
            type="text"
            value={tempNotes[item.id] !== undefined ? tempNotes[item.id] : (item.notes || '')}
            onChange={(e) => handleNotesChange(item.id, e.target.value)}
            onFocus={() => handleNotesFocus(item.id, item.notes)}
            onBlur={() => handleNotesBlur(item.id, item.notes)}
            onCompositionStart={() => handleCompositionStart(item.id)}
            onCompositionEnd={() => handleCompositionEnd(item.id)}
            className="h-6 sm:h-8 text-[10px] sm:text-sm border-0 bg-transparent focus:bg-background"
            placeholder="메모..."
          />
        </TableCell>
      </TableRow>
    );
  };

  // Get visible items for each category
  const getCategoryItems = (categoryId: string) => {
    const categoryItems: { item: ExtendedBudgetItem; subCat: SubCategory }[] = [];
    const category = orderedCategories.find(c => c.id === categoryId);
    if (!category) return categoryItems;

    // Add default items that exist in the items array
    category.subCategories.forEach(subCat => {
      const item = getItem(categoryId, subCat.id);
      if (item) {
        categoryItems.push({ item, subCat });
      }
    });

    // Add custom items
    const customItems = getCustomItems(categoryId);
    customItems.forEach(item => {
      categoryItems.push({
        item,
        subCat: { id: item.sub_category, name: item.custom_name || item.sub_category }
      });
    });

    return categoryItems;
  };

  return (
    <div className="w-full overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedCategories.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <Table className="min-w-[600px] sm:min-w-full text-xs sm:text-sm">
            <TableHeader>
              <TableRow className="bg-primary/10 border-b-2 border-primary/20">
                <TableHead className="font-bold text-foreground w-16 sm:w-24 px-1 sm:px-4">구분</TableHead>
                <TableHead className="font-bold text-foreground w-10 sm:w-16 text-center px-1 sm:px-4">완료</TableHead>
                <TableHead className="font-bold text-foreground w-24 sm:w-40 px-1 sm:px-4">항목</TableHead>
                <TableHead className="font-bold text-foreground text-right w-24 sm:w-40 px-1 sm:px-4">비용</TableHead>
                <TableHead className="font-bold text-foreground w-14 sm:w-20 text-center px-1 sm:px-4">분담</TableHead>
                <TableHead className="font-bold text-foreground w-28 sm:w-48 px-1 sm:px-4">메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedCategories.map((category) => {
                const categoryItems = getCategoryItems(category.id);
                const customItems = getCustomItems(category.id);
                
                // Total rows = visible items + add row + subtotal row
                const visibleItemCount = categoryItems.length;
                const totalRowsForCategory = visibleItemCount + 2; // +1 for add row, +1 for subtotal

                if (visibleItemCount === 0) {
                  // Category with no items - still show it for adding
                  return (
                    <React.Fragment key={category.id}>
                      <TableRow className="border-t-2 border-primary/10">
                        <TableCell 
                          rowSpan={2}
                          className="font-semibold bg-secondary/50 align-top pt-2 sm:pt-4 px-1 sm:px-4"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors touch-none"
                              title="드래그하여 순서 변경"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="text-base sm:text-lg">{category.icon}</span>
                            <span className="text-[10px] sm:text-sm text-center break-keep">{category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell colSpan={5} className="px-1 sm:px-4">
                          {addingToCategory === category.id ? (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="새 항목 이름..."
                                className="h-6 sm:h-7 text-xs sm:text-sm w-24 sm:w-40"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddCustomItem(category.id);
                                  if (e.key === 'Escape') {
                                    setAddingToCategory(null);
                                    setNewItemName('');
                                  }
                                }}
                              />
                              <Button size="sm" variant="ghost" className="h-6 sm:h-7 px-2" onClick={() => handleAddCustomItem(category.id)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 sm:h-7 px-2" onClick={() => { setAddingToCategory(null); setNewItemName(''); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground h-6 sm:h-8 text-[10px] sm:text-sm px-1 sm:px-3"
                              onClick={() => setAddingToCategory(category.id)}
                            >
                              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              항목 추가
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-warning/10 border-b-2 border-warning/30">
                        <TableCell colSpan={3} className="font-semibold text-right text-[10px] sm:text-sm px-1 sm:px-4">
                          {category.name} 총 비용
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary text-[10px] sm:text-sm px-1 sm:px-4">
                          ₩0
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                }

                return (
                  <React.Fragment key={category.id}>
                    {categoryItems.map(({ item, subCat }, subIndex) => 
                      renderItemRow(category, subCat, subIndex, totalRowsForCategory, item, subIndex === 0)
                    )}
                    {/* Add custom item row */}
                    <TableRow className="hover:bg-muted/30">
                      <TableCell colSpan={5} className="px-1 sm:px-4">
                        {addingToCategory === category.id ? (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Input
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="새 항목 이름..."
                              className="h-6 sm:h-7 text-xs sm:text-sm w-24 sm:w-40"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddCustomItem(category.id);
                                if (e.key === 'Escape') {
                                  setAddingToCategory(null);
                                  setNewItemName('');
                                }
                              }}
                            />
                            <Button size="sm" variant="ghost" className="h-6 sm:h-7 px-2" onClick={() => handleAddCustomItem(category.id)}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 sm:h-7 px-2" onClick={() => { setAddingToCategory(null); setNewItemName(''); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground h-6 sm:h-8 text-[10px] sm:text-sm px-1 sm:px-3"
                            onClick={() => setAddingToCategory(category.id)}
                          >
                            <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            항목 추가
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {/* Category subtotal row */}
                    <TableRow className="bg-warning/10 border-b-2 border-warning/30">
                      <TableCell colSpan={3} className="font-semibold text-right text-[10px] sm:text-sm px-1 sm:px-4">
                        {category.name} 총 비용
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary text-[10px] sm:text-sm px-1 sm:px-4">
                        ₩{getCategoryTotal(category.id).toLocaleString()}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
              {/* Overall total row */}
              <TableRow className="bg-primary/20 border-t-4 border-primary">
                <TableCell colSpan={4} className="font-bold text-right text-xs sm:text-base px-1 sm:px-4">
                  총계
                </TableCell>
                <TableCell className="text-right font-bold text-sm sm:text-lg text-primary px-1 sm:px-4">
                  ₩{getOverallTotal().toLocaleString()}
                </TableCell>
                <TableCell className="px-1 sm:px-4">
                  <span className="text-[10px] sm:text-sm text-muted-foreground">
                    {formatKoreanWon(getOverallTotal())}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>항목을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{itemToDelete?.name}" 항목을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add React import for Fragment
import React from 'react';
