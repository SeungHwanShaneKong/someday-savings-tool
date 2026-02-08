import { useState, useRef } from 'react';
import React from 'react';
import { formatKoreanWon, SubCategory, Category } from '@/lib/budget-categories';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Plus, Pencil, Check, X, Users, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCategoryOrder } from '@/hooks/useCategoryOrder';
import { ExtendedBudgetItem, CostSplitType, COST_SPLIT_OPTIONS } from './BudgetTable';

interface BudgetTableMobileProps {
  items: ExtendedBudgetItem[];
  onAmountChange: (category: string, subCategory: string, amount: number, unitPrice?: number, quantity?: number) => void;
  onTogglePaid: (itemId: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  onRenameItem?: (itemId: string, newName: string) => void;
  onAddCustomItem?: (categoryId: string, name: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onCostSplitChange?: (itemId: string, costSplit: CostSplitType) => void;
}

// Sortable category for mobile
function SortableMobileCategory({
  category,
  children,
  isAnyDragging,
}: {
  category: Category;
  children: (props: {
    attributes: Record<string, any>;
    listeners: Record<string, any> | undefined;
    isDragging: boolean;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
  }) => React.ReactNode;
  isAnyDragging: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: category.id
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return <>{children({ attributes, listeners, isDragging, setNodeRef, style })}</>;
}

// Mobile drag overlay
function MobileDragOverlay({ category }: { category: Category }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-card border-2 border-primary rounded-xl shadow-xl">
      <GripVertical className="h-5 w-5 text-primary" />
      <span className="text-xl">{category.icon}</span>
      <span className="font-bold">{category.name}</span>
    </div>
  );
}

export function BudgetTableMobile({
  items,
  onAmountChange,
  onTogglePaid,
  onNotesChange,
  onRenameItem,
  onAddCustomItem,
  onDeleteItem,
  onCostSplitChange
}: BudgetTableMobileProps) {
  const { orderedCategories, reorderCategories } = useCategoryOrder();
  
  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(orderedCategories.map(c => c.id)));
  
  // Editing states
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
  
  // Drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // Notes temp state for Korean IME
  const [tempNotes, setTempNotes] = useState<{ [key: string]: string }>({});
  const isComposingRef = useRef<{ [key: string]: boolean }>({});
  
  // DnD sensors with better touch handling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderCategories(active.id as string, over.id as string);
    }
    setActiveDragId(null);
  };
  
  const handleDragCancel = () => {
    setActiveDragId(null);
  };
  
  const draggingCategory = activeDragId ? orderedCategories.find(c => c.id === activeDragId) : null;
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };
  
  // Helper functions
  const getItem = (categoryId: string, subCategoryId: string) => {
    return items.find(item => item.category === categoryId && item.sub_category === subCategoryId);
  };
  
  const getCustomItems = (categoryId: string) => {
    return items.filter(item => item.category === categoryId && item.is_custom);
  };
  
  const getCategoryTotal = (categoryId: string) => {
    return items.filter(item => item.category === categoryId).reduce((sum, item) => sum + item.amount, 0);
  };
  
  const getOverallTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };
  
  const parseNumericInput = (value: string): string => {
    return value.replace(/[^0-9]/g, '');
  };
  
  const getCategoryItems = (categoryId: string) => {
    const categoryItems: { item: ExtendedBudgetItem; subCat: SubCategory }[] = [];
    const category = orderedCategories.find(c => c.id === categoryId);
    if (!category) return categoryItems;
    
    category.subCategories.forEach(subCat => {
      const item = getItem(categoryId, subCat.id);
      if (item) {
        categoryItems.push({ item, subCat });
      }
    });
    
    const customItems = getCustomItems(categoryId);
    customItems.forEach(item => {
      categoryItems.push({
        item,
        subCat: {
          id: item.sub_category,
          name: item.custom_name || item.sub_category
        }
      });
    });
    
    return categoryItems;
  };
  
  // Amount handling
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
  
  // Notes handling
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
  
  // Rename handling
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
  
  // Add custom item
  const handleAddCustomItem = (categoryId: string) => {
    if (onAddCustomItem && newItemName.trim()) {
      onAddCustomItem(categoryId, newItemName.trim());
      setNewItemName('');
      setAddingToCategory(null);
    }
  };
  
  // Per person save
  const handlePerPersonSave = (categoryId: string, subCategoryId: string) => {
    const unitPrice = parseInt(parseNumericInput(tempUnitPrice)) || 0;
    const quantity = parseInt(parseNumericInput(tempQuantity)) || 0;
    const totalAmount = unitPrice * quantity;
    onAmountChange(categoryId, subCategoryId, totalAmount, unitPrice, quantity);
    setPerPersonPopover(null);
    setTempUnitPrice('');
    setTempQuantity('');
  };
  
  // Delete handling
  const handleDeleteConfirm = () => {
    if (itemToDelete && onDeleteItem) {
      onDeleteItem(itemToDelete.id);
    }
    setItemToDelete(null);
    setDeleteDialogOpen(false);
  };
  
  const isAnyDragging = activeDragId !== null;
  
  return (
    <div className="w-full space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={orderedCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {orderedCategories.map(category => {
            const categoryItems = getCategoryItems(category.id);
            const categoryTotal = getCategoryTotal(category.id);
            const isExpanded = expandedCategories.has(category.id);
            
            return (
              <SortableMobileCategory
                key={category.id}
                category={category}
                isAnyDragging={isAnyDragging}
              >
                {({ attributes, listeners, isDragging, setNodeRef, style }) => (
                  <div
                    ref={setNodeRef}
                    style={style}
                    className={cn(
                      "bg-card border border-border rounded-xl overflow-hidden transition-all",
                      isDragging && "opacity-50 ring-2 ring-primary"
                    )}
                  >
                    {/* Category Header */}
                    <div className="flex items-center bg-secondary/50 p-3 gap-2">
                      <div
                        {...attributes}
                        {...listeners}
                        className="touch-none cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-primary/10"
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="flex-1 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{category.icon}</span>
                          <span className="font-semibold text-sm">{category.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({categoryItems.length}개)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-sm">
                            ₩{categoryTotal.toLocaleString()}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    </div>
                    
                    {/* Category Items */}
                    {isExpanded && !isAnyDragging && (
                      <div className="divide-y divide-border">
                        {categoryItems.map(({ item, subCat }) => {
                          const cellKey = `${category.id}-${subCat.id}`;
                          const isEditing = editingCell === cellKey;
                          const isRenamingThis = editingName === item.id;
                          const displayName = item.custom_name || subCat.name;
                          const isPerPersonItem = category.id === 'wedding-hall' && subCat.id === 'meal-cost';
                          
                          return (
                            <div key={item.id} className="p-3 space-y-2">
                              {/* Row 1: Checkbox + Item Name + Actions */}
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={item.is_paid || false}
                                  onCheckedChange={() => onTogglePaid(item.id)}
                                  className="data-[state=checked]:bg-success data-[state=checked]:border-success h-5 w-5 flex-shrink-0"
                                />
                                
                                {isRenamingThis ? (
                                  <div className="flex items-center gap-1 flex-1">
                                    <Input
                                      value={tempName}
                                      onChange={e => setTempName(e.target.value)}
                                      className="h-8 text-sm flex-1"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveRename(item.id);
                                        if (e.key === 'Escape') handleCancelRename();
                                      }}
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveRename(item.id)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelRename}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className={cn(
                                      "text-sm flex-1",
                                      item.is_paid && "line-through text-muted-foreground"
                                    )}>
                                      {displayName}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {onRenameItem && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7"
                                          onClick={() => handleStartRename(item.id, displayName)}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                      {onDeleteItem && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-destructive"
                                          onClick={() => {
                                            setItemToDelete({ id: item.id, name: displayName });
                                            setDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Row 2: Amount + Per Person Button */}
                              <div className="flex items-center gap-2 pl-7">
                                {isPerPersonItem && (
                                  <Popover
                                    open={perPersonPopover === cellKey}
                                    onOpenChange={open => {
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
                                      <Button size="icon" variant="outline" className="h-8 w-8 flex-shrink-0">
                                        <Users className="h-4 w-4" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64" align="start">
                                      <div className="space-y-3">
                                        <div className="text-sm font-medium">인원수 계산</div>
                                        <div className="space-y-2">
                                          <div>
                                            <label className="text-xs text-muted-foreground">1인당 비용 (₩)</label>
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={tempUnitPrice}
                                              onChange={e => setTempUnitPrice(parseNumericInput(e.target.value))}
                                              placeholder="65000"
                                              className="h-9"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs text-muted-foreground">예상 인원 (명)</label>
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={tempQuantity}
                                              onChange={e => setTempQuantity(parseNumericInput(e.target.value))}
                                              placeholder="300"
                                              className="h-9"
                                            />
                                          </div>
                                          {tempUnitPrice && tempQuantity && (
                                            <div className="text-sm font-medium text-primary">
                                              = {formatKoreanWon((parseInt(tempUnitPrice) || 0) * (parseInt(tempQuantity) || 0))}
                                            </div>
                                          )}
                                        </div>
                                        <Button size="sm" className="w-full" onClick={() => handlePerPersonSave(category.id, subCat.id)}>
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
                                    onChange={e => handleAmountChange(e.target.value)}
                                    onBlur={() => handleAmountBlur(category.id, subCat.id)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleAmountBlur(category.id, subCat.id);
                                      if (e.key === 'Escape') {
                                        setEditingCell(null);
                                        setTempValue('');
                                      }
                                    }}
                                    className="h-9 text-right flex-1"
                                    autoFocus
                                    placeholder="금액 입력"
                                  />
                                ) : (
                                  <button
                                    onClick={() => handleAmountClick(category.id, subCat.id, item.amount || 0)}
                                    className={cn(
                                      "flex-1 text-right px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm",
                                      item.amount ? "text-foreground font-medium" : "text-muted-foreground italic"
                                    )}
                                  >
                                    {item.amount ? `₩${item.amount.toLocaleString()}` : '금액 입력'}
                                  </button>
                                )}
                              </div>
                              
                              {item.unit_price && item.quantity && (
                                <div className="text-xs text-muted-foreground pl-7">
                                  ₩{item.unit_price.toLocaleString()} × {item.quantity}명
                                </div>
                              )}
                              
                              {/* Row 3: Cost Split + Notes */}
                              <div className="flex items-center gap-2 pl-7">
                                {onCostSplitChange && (
                                  <Select
                                    value={item.cost_split || '-'}
                                    onValueChange={(value: CostSplitType) => onCostSplitChange(item.id, value)}
                                  >
                                    <SelectTrigger className="h-9 text-xs w-20 flex-shrink-0">
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
                                
                                <Input
                                  type="text"
                                  value={tempNotes[item.id] !== undefined ? tempNotes[item.id] : (item.notes || '')}
                                  onChange={e => handleNotesChange(item.id, e.target.value)}
                                  onFocus={() => handleNotesFocus(item.id, item.notes)}
                                  onBlur={() => handleNotesBlur(item.id, item.notes)}
                                  className="h-9 text-sm flex-1"
                                  placeholder="메모..."
                                />
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Add Item Button */}
                        <div className="p-3">
                          {addingToCategory === category.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={newItemName}
                                onChange={e => setNewItemName(e.target.value)}
                                placeholder="새 항목 이름..."
                                className="h-9 text-sm flex-1"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddCustomItem(category.id);
                                  if (e.key === 'Escape') {
                                    setAddingToCategory(null);
                                    setNewItemName('');
                                  }
                                }}
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleAddCustomItem(category.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setAddingToCategory(null);
                                  setNewItemName('');
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-muted-foreground hover:text-foreground"
                              onClick={() => setAddingToCategory(category.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              항목 추가
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </SortableMobileCategory>
            );
          })}
        </SortableContext>
        
        <DragOverlay>
          {draggingCategory && <MobileDragOverlay category={draggingCategory} />}
        </DragOverlay>
      </DndContext>
      
      {/* Total Card */}
      <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">총계</span>
          <span className="text-xl font-bold text-primary">
            {formatKoreanWon(getOverallTotal())}
          </span>
        </div>
        <div className="text-right text-xs text-muted-foreground mt-1">
          ₩{getOverallTotal().toLocaleString()}
        </div>
      </div>
      
      {/* Delete Dialog */}
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
