import { PresenceState } from '@/hooks/useCollaboration';
import { cn } from '@/lib/utils';

interface EditingIndicatorProps {
  itemId: string;
  presenceState: Record<string, PresenceState>;
  className?: string;
}

// Colors for different users
const USER_COLORS = [
  'border-blue-500 bg-blue-500/10',
  'border-green-500 bg-green-500/10',
  'border-purple-500 bg-purple-500/10',
  'border-orange-500 bg-orange-500/10',
  'border-pink-500 bg-pink-500/10',
];

export function EditingIndicator({ 
  itemId, 
  presenceState,
  className 
}: EditingIndicatorProps) {
  const editingUsers = Object.values(presenceState).filter(
    user => user.editing_item_id === itemId
  );

  if (editingUsers.length === 0) return null;

  const user = editingUsers[0];
  const colorIndex = Object.keys(presenceState).indexOf(user.user_id);
  const colorClass = USER_COLORS[colorIndex % USER_COLORS.length];

  return (
    <div 
      className={cn(
        "absolute inset-0 pointer-events-none border-2 rounded-md animate-pulse",
        colorClass,
        className
      )}
    >
      <span 
        className={cn(
          "absolute -top-5 left-0 text-[10px] px-1.5 py-0.5 rounded-t font-medium text-white",
          colorClass.replace('bg-', 'bg-').replace('/10', '')
        )}
        style={{
          backgroundColor: colorClass.includes('blue') ? '#3b82f6' :
                          colorClass.includes('green') ? '#22c55e' :
                          colorClass.includes('purple') ? '#a855f7' :
                          colorClass.includes('orange') ? '#f97316' :
                          '#ec4899'
        }}
      >
        {user.display_name || user.email?.split('@')[0]} 편집 중
      </span>
    </div>
  );
}

// Hook to get border class for an item being edited
export function useEditingBorder(
  itemId: string, 
  presenceState: Record<string, PresenceState>
): string | null {
  const editingUsers = Object.values(presenceState).filter(
    user => user.editing_item_id === itemId
  );

  if (editingUsers.length === 0) return null;

  const user = editingUsers[0];
  const colorIndex = Object.keys(presenceState).indexOf(user.user_id);
  
  const colors = [
    'ring-2 ring-blue-500 ring-offset-1',
    'ring-2 ring-green-500 ring-offset-1',
    'ring-2 ring-purple-500 ring-offset-1',
    'ring-2 ring-orange-500 ring-offset-1',
    'ring-2 ring-pink-500 ring-offset-1',
  ];

  return colors[colorIndex % colors.length];
}