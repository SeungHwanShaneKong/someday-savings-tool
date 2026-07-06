import { useState, useRef } from 'react';
import React from 'react';
import { formatKoreanWon, SubCategory, Category } from '@/lib/budget-categories';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { Plus, Pencil, Check, X, Users, Trash2, ChevronDown, ChevronUp, GripVertical, Sparkles, AlertTriangle } from 'lucide-react';
import { openHoneymoon } from '@/lib/external-links'; // [CL-HONEYMOON-EXTERNAL-20260416-221500]
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
// [CL-TOP20-P3-INPUT-20260703-030000] 드래그 핸들 props 의 선재 any 2건 → dnd-kit 정식 타입(데스크톱 [CL-TOP20-P0-20260703-004000]과 동일 처방)
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCategoryOrder } from '@/hooks/useCategoryOrder';
import { ExtendedBudgetItem, CostSplitType, COST_SPLIT_OPTIONS } from './BudgetTable';
import { AverageCostTooltip } from './AverageCostTooltip';
import { hasAverageCost, getAverageCost } from '@/lib/average-costs';
import { EditorChangeBadge } from '@/components/collaboration/EditorChangeBadge'; // [CL-READ-UX-20260706-211330] 공유 편집자 배지(닉네임 캡·2줄 스택)
import { SmartWonInput } from './budget/SmartWonInput'; // [CL-TOP20-P3-INPUT-20260703-030000] 스마트 금액 입력(만/억·힌트·평균 1탭)
import { HiddenCostTrigger } from './budget/HiddenCostTrigger'; // [CL-TOP20-P3-HIDDEN-20260703-030000] 숨은 비용 경고 배선
import { countCategoryHiddenCosts } from '@/lib/hidden-cost-map'; // [CL-TOP20-P3-HIDDEN-20260703-030000]

interface BudgetTableMobileProps {
  items: ExtendedBudgetItem[];
  onAmountChange: (category: string, subCategory: string, amount: number, unitPrice?: number, quantity?: number) => void;
  onTogglePaid: (itemId: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  onRenameItem?: (itemId: string, newName: string) => void;
  onAddCustomItem?: (categoryId: string, name: string) => void;
  onDeleteItem?: (itemId: string) => void;
  onCostSplitChange?: (itemId: string, costSplit: CostSplitType) => void;
  /** [CL-PARTNER-DIFF-20260624-000000] 재접속 시 파트너가 바꾼 항목 id — 시머 강조(개선3) */
  changedItemIds?: Set<string>;
  /** [CL-EDITLABEL-20260626] 최근 편집자 라벨용(additive·optional) — 미전달 시 미표시(회귀 0) */
  myUserId?: string | null;
  partnerName?: string | null;
  showEditorLabels?: boolean;
}

// Sortable category for mobile
function SortableMobileCategory({
  category,
  children,
  isAnyDragging,
}: {
  category: Category;
  children: (props: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
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
  onCostSplitChange,
  changedItemIds,
  myUserId,
  partnerName,
  showEditorLabels
}: BudgetTableMobileProps) {
  const { orderedCategories, reorderCategories } = useCategoryOrder();
  
  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Editing states
  const [editingCell, setEditingCell] = useState<string | null>(null);
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
  // [CL-TOP20-P3-INPUT-20260703-030000] 금액 임시버퍼(tempValue)는 SmartWonInput 내부 상태로 이동.
  // 여기선 편집 셀 열기/커밋/취소만 담당 — Enter/Escape/blur 확정 흐름은 SmartWonInput 이 동일 계약으로 보존.
  const handleAmountClick = (categoryId: string, subCategoryId: string) => {
    setEditingCell(`${categoryId}-${subCategoryId}`);
  };

  const handleAmountCommit = (categoryId: string, subCategoryId: string, amount: number) => {
    onAmountChange(categoryId, subCategoryId, amount);
    setEditingCell(null);
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
            // [CL-TOP20-P3-HIDDEN-20260703-030000] 카테고리 요약 헤더 집계 배지용
            const categoryHiddenCount = countCategoryHiddenCosts(category.id, items);
            
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
                        {/* [CL-READ-UX-20260706-211340] min-w-0 flex-1: 이름이 break-keep 로 음절 안 깨고 최대 2줄 줄바꿈·"(N개)"는 nowrap 고정 */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xl flex-shrink-0">{category.icon}</span>
                          <span className="font-semibold text-sm break-keep min-w-0">{category.name}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            ({categoryItems.length}개)
                          </span>
                          {/* [CL-TOP20-P3-HIDDEN-20260703-030000] 숨은 비용 집계 배지(N>0 시만) */}
                          {categoryHiddenCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
                              <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" aria-hidden="true" />
                              숨은 비용 {categoryHiddenCount}건
                            </span>
                          )}
                          {/* [CL-HOME-FIX-20260315-120000] button 중첩 해소 — span + role=link */}
                          {category.id === 'honeymoon' && (
                            <span
                              role="link"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); openHoneymoon(); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); openHoneymoon(); } }}
                              className="flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors animate-pulse-subtle cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              추천
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-primary text-sm whitespace-nowrap">
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
                          const isMealCostItem = category.id === 'main-ceremony' && subCat.id === 'meal-cost';
                          
                          return (
                            <div key={item.id} className={cn("p-3 space-y-2", changedItemIds?.has(item.id) && "partner-changed-row")}>
                              {/* Row 1: Checkbox + Item Name + Actions — [CL-READ-UX-20260706-211330] items-start(이름 2줄 대응·체크박스는 줄1 정렬) */}
                              <div className="flex items-start gap-2">
                                <Checkbox
                                  checked={item.is_paid || false}
                                  onCheckedChange={() => onTogglePaid(item.id)}
                                  className="mt-0.5 data-[state=checked]:bg-success data-[state=checked]:border-success h-5 w-5 flex-shrink-0"
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
                                    {/* [CL-TOP20-P5-PWA-20260703-050000] 터치 타깃 확대: 모바일 40px(h-10 w-10), md 이상 기존 크기 유지.
                                        아이콘은 Button 베이스 [&_svg]:size-4 가 자식 클래스보다 우선하므로 부모 레벨에서 확대. */}
                                    {/* [CL-BTNAUDIT3-20260704 | 접근명] 아이콘 전용 버튼 접근명 + 아이콘 aria-hidden */}
                                    <Button size="icon" variant="ghost" aria-label="이름 저장" className="h-10 w-10 md:h-8 md:w-8 [&_svg]:size-5 md:[&_svg]:size-4" onClick={() => handleSaveRename(item.id)}>
                                      <Check className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                    <Button size="icon" variant="ghost" aria-label="편집 취소" className="h-10 w-10 md:h-8 md:w-8 [&_svg]:size-5 md:[&_svg]:size-4" onClick={handleCancelRename}>
                                      <X className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    {/* [CL-READ-UX-20260706-211330] 이름 열: 줄1=이름+아이콘 트리거(truncate), 줄2=편집 배지(있을 때만) → 이름 전체 노출·겹침 0 */}
                                    <div className="flex-1 min-w-0">
                                      <div className={cn(
                                        "flex items-center gap-1 min-w-0",
                                        item.is_paid && "line-through text-muted-foreground"
                                      )}>
                                        <span className="text-sm truncate">{displayName}</span>
                                        {!item.is_custom && hasAverageCost(category.id, subCat.id) && (
                                          <AverageCostTooltip
                                            categoryId={category.id}
                                            subCategoryId={subCat.id}
                                            className="flex-shrink-0"
                                          />
                                        )}
                                        {/* [CL-TOP20-P3-HIDDEN-20260703-030000] 숨은 비용 경고 트리거(금액 입력 시 발동) */}
                                        <HiddenCostTrigger
                                          categoryId={category.id}
                                          subCategoryId={subCat.id}
                                          amount={item.amount || 0}
                                          itemName={displayName}
                                          className="flex-shrink-0"
                                        />
                                      </div>
                                      {/* [CL-VULN-R6C-A11Y-20260625] 파트너 변경 비색상 단서(색맹/SR 가시, WCAG 1.4.1) */}
                                      {/* [CL-READ-UX-20260706-211330] 편집 배지를 이름 아래 2번째 줄로 → 긴 닉네임이 이름과 겹치지 않음. 공유 컴포넌트(닉네임 캡). */}
                                      <EditorChangeBadge
                                        changed={changedItemIds?.has(item.id) ?? false}
                                        partnerName={partnerName}
                                        lastEditedBy={item.last_edited_by}
                                        myUserId={myUserId}
                                        showEditorLabels={showEditorLabels}
                                        className="mt-0.5"
                                      />
                                    </div>
                                    {/* [CL-TOP20-P5-PWA-20260703-050000] 터치 타깃 확대: 모바일 40px(h-10 w-10), md 이상 기존 크기 유지.
                                        아이콘은 Button 베이스 [&_svg]:size-4 가 자식 클래스보다 우선하므로 부모 레벨에서 확대. */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {onRenameItem && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          aria-label={`${displayName} 수정`}
                                          className="h-10 w-10 md:h-7 md:w-7 [&_svg]:size-5 md:[&_svg]:size-4"
                                          onClick={() => handleStartRename(item.id, displayName)}
                                        >
                                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Button>
                                      )}
                                      {onDeleteItem && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          aria-label={`${displayName} 삭제`}
                                          className="h-10 w-10 md:h-7 md:w-7 [&_svg]:size-5 md:[&_svg]:size-4 text-destructive"
                                          onClick={() => {
                                            setItemToDelete({ id: item.id, name: displayName });
                                            setDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        </Button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Row 2: Amount + Per Person Button */}
                              <div className="flex items-center gap-2 pl-7">
                                {isMealCostItem && (
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
                                      {/* 식대비 입력 유도 버튼: 고대비 + glow 애니메이션 (미입력 시만 활성화) */}
                                      <Button 
                                        size="sm" 
                                        className={cn(
                                          "flex-shrink-0 gap-1.5 rounded-lg shadow-md transition-all active:scale-95",
                                          "bg-primary text-primary-foreground hover:bg-primary/90",
                                          item.amount === 0 && "animate-glow-pulse"
                                        )}
                                      >
                                        <Users className="h-4 w-4" />
                                        <span className="text-xs font-medium">식대 계산</span>
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
                                  /* [CL-TOP20-P3-INPUT-20260703-030000] 스마트 금액 입력(만/억 인식·실시간 힌트·평균 1탭) — Enter/Escape/blur 흐름 보존 */
                                  <SmartWonInput
                                    value={item.amount || 0}
                                    onCommit={amount => handleAmountCommit(category.id, subCat.id, amount)}
                                    onCancel={() => setEditingCell(null)}
                                    averageAmount={!item.is_custom ? getAverageCost(category.id, subCat.id)?.amount ?? null : null}
                                    containerClassName="flex-1"
                                    className="h-9 text-right w-full"
                                    aria-label={`${displayName} 금액`}
                                    autoFocus
                                    placeholder="금액 입력"
                                  />
                                ) : (
                                  <button
                                    onClick={() => handleAmountClick(category.id, subCat.id)}
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
      {/* FAB 버튼과의 중첩 방지를 위한 하단 스페이서 */}
      <div className="h-16" aria-hidden="true" />
      
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
