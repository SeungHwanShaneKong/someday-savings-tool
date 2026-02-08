import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PresenceState } from '@/hooks/useCollaboration';
import { cn } from '@/lib/utils';

interface PresenceAvatarsProps {
  presenceState: Record<string, PresenceState>;
  currentEditingItemId?: string;
  className?: string;
}

// Colors for different users
const USER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
];

export function PresenceAvatars({ 
  presenceState, 
  currentEditingItemId,
  className 
}: PresenceAvatarsProps) {
  const users = Object.values(presenceState);
  
  if (users.length === 0) return null;

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const getUserColor = (index: number) => {
    return USER_COLORS[index % USER_COLORS.length];
  };

  // Check if any user is editing the same item
  const editingUsers = users.filter(u => 
    u.editing_item_id && u.editing_item_id === currentEditingItemId
  );

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user, index) => {
          const isEditing = user.editing_item_id === currentEditingItemId;
          
          return (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar 
                    className={cn(
                      "h-7 w-7 border-2 border-background transition-transform hover:scale-110 hover:z-10",
                      isEditing && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <AvatarFallback 
                      className={cn(
                        "text-[10px] font-medium text-white",
                        getUserColor(index)
                      )}
                    >
                      {getInitials(user.display_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Online indicator */}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                  
                  {/* Editing indicator */}
                  {user.editing_item_id && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[8px] text-white">✏️</span>
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{user.display_name || user.email}</p>
                {user.editing_item_id && (
                  <p className="text-muted-foreground">편집 중...</p>
                )}
                {user.cursor_position && (
                  <p className="text-muted-foreground">
                    {user.cursor_position.category} &gt; {user.cursor_position.subCategory}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {users.length > 5 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background bg-muted">
                <AvatarFallback className="text-[10px] font-medium">
                  +{users.length - 5}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>그 외 {users.length - 5}명</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      <span className="ml-2 text-xs text-muted-foreground">
        {users.length}명 접속 중
      </span>
    </div>
  );
}