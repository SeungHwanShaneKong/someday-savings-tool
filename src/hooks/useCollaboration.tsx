import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
  id: string;
  user_id: string;
  role: CollaboratorRole;
  email?: string;
  display_name?: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: CollaboratorRole;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

export interface PresenceState {
  user_id: string;
  email?: string;
  display_name?: string;
  online_at: string;
  editing_item_id?: string;
  cursor_position?: { category: string; subCategory: string };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: any;
  is_read: boolean;
  created_at: string;
}

export function useCollaboration(budgetId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [myRole, setMyRole] = useState<CollaboratorRole | null>(null);
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [presenceChannel, setPresenceChannel] = useState<RealtimeChannel | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Fetch my role for this budget
  const fetchMyRole = useCallback(async () => {
    if (!budgetId || !user) return;

    try {
      const { data, error } = await supabase.rpc('get_budget_role', {
        p_budget_id: budgetId,
        p_user_id: user.id
      });

      if (error) throw error;
      setMyRole(data as CollaboratorRole);
    } catch (error: any) {
      console.error('Failed to fetch role:', error);
    }
  }, [budgetId, user]);

  // Fetch collaborators
  const fetchCollaborators = useCallback(async () => {
    if (!budgetId) return;

    try {
      const { data, error } = await supabase
        .from('budget_collaborators')
        .select('*')
        .eq('budget_id', budgetId);

      if (error) throw error;
      setCollaborators((data || []) as Collaborator[]);
    } catch (error: any) {
      console.error('Failed to fetch collaborators:', error);
    }
  }, [budgetId]);

  // Fetch pending invitations
  const fetchInvitations = useCallback(async () => {
    if (!budgetId) return;

    try {
      const { data, error } = await supabase
        .from('budget_invitations')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('status', 'pending');

      if (error) throw error;
      setInvitations((data || []) as Invitation[]);
    } catch (error: any) {
      console.error('Failed to fetch invitations:', error);
    }
  }, [budgetId]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const typed = (data || []) as Notification[];
      setNotifications(typed);
      setUnreadCount(typed.filter(n => !n.is_read).length);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [user]);

  // Send invitation
  const sendInvitation = async (email: string, role: CollaboratorRole) => {
    if (!budgetId || !user) return { success: false, error: 'Not authenticated' };

    try {
      // Get budget name
      const { data: budget } = await supabase
        .from('budgets')
        .select('name')
        .eq('id', budgetId)
        .single();

      // Get inviter name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const inviterName = profile?.display_name || user.email?.split('@')[0] || '사용자';

      const response = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          budgetId,
          budgetName: budget?.name || '결혼 예산',
          role,
          inviterName,
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      await fetchInvitations();
      
      toast({
        title: '초대장을 보냈어요',
        description: `${email}로 초대 이메일을 발송했습니다.`,
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: '초대 실패',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  // Accept invitation (from URL token)
  const acceptInvitation = async (token: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('accept_budget_invitation', {
        p_token: token
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; budget_id?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to accept invitation');
      }

      toast({
        title: '초대를 수락했어요',
        description: '이제 예산을 함께 관리할 수 있어요.',
      });

      return { success: true, budgetId: result.budget_id };
    } catch (error: any) {
      toast({
        title: '초대 수락 실패',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('budget_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      
      await fetchInvitations();
      
      toast({
        title: '초대를 취소했어요',
      });
    } catch (error: any) {
      toast({
        title: '취소 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Update collaborator role
  const updateCollaboratorRole = async (collaboratorId: string, newRole: CollaboratorRole) => {
    try {
      const { error } = await supabase
        .from('budget_collaborators')
        .update({ role: newRole })
        .eq('id', collaboratorId);

      if (error) throw error;
      
      await fetchCollaborators();
      
      toast({
        title: '권한을 변경했어요',
      });
    } catch (error: any) {
      toast({
        title: '권한 변경 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Remove collaborator
  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from('budget_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;
      
      await fetchCollaborators();
      
      toast({
        title: '협업자를 제거했어요',
      });
    } catch (error: any) {
      toast({
        title: '제거 실패',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Update presence (what I'm editing)
  const updatePresence = async (editingItemId?: string, cursorPosition?: { category: string; subCategory: string }) => {
    if (!presenceChannel || !user) return;

    await presenceChannel.track({
      user_id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
      online_at: new Date().toISOString(),
      editing_item_id: editingItemId,
      cursor_position: cursorPosition,
    });
  };

  // Setup presence channel
  useEffect(() => {
    if (!budgetId || !user) return;

    const channel = supabase.channel(`presence:budget:${budgetId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presenceMap: Record<string, PresenceState> = {};
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: PresenceState) => {
            if (presence.user_id !== user.id) {
              presenceMap[presence.user_id] = presence;
            }
          });
        });
        
        setPresenceState(presenceMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            email: user.email,
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
            online_at: new Date().toISOString(),
          });
        }
      });

    setPresenceChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [budgetId, user]);

  // Setup realtime channel for budget_items changes
  useEffect(() => {
    if (!budgetId) return;

    const channel = supabase
      .channel(`realtime:budget_items:${budgetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_items',
          filter: `budget_id=eq.${budgetId}`,
        },
        (payload) => {
          console.log('Realtime budget_items change:', payload);
          // The parent hook should handle refreshing items
          // This is just for awareness
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [budgetId]);

  // Setup realtime for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification:', payload);
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast({
            title: newNotification.title,
            description: newNotification.message || undefined,
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, toast]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyRole(),
        fetchCollaborators(),
        fetchInvitations(),
        fetchNotifications(),
      ]);
      setLoading(false);
    };

    if (user) {
      init();
    }
  }, [budgetId, user, fetchMyRole, fetchCollaborators, fetchInvitations, fetchNotifications]);

  // Helper to check permissions
  const canEdit = myRole === 'owner' || myRole === 'editor';
  const canManageCollaborators = myRole === 'owner';
  const isOwner = myRole === 'owner';

  return {
    // State
    collaborators,
    invitations,
    myRole,
    presenceState,
    notifications,
    unreadCount,
    loading,
    
    // Permission helpers
    canEdit,
    canManageCollaborators,
    isOwner,
    
    // Actions
    sendInvitation,
    acceptInvitation,
    cancelInvitation,
    updateCollaboratorRole,
    removeCollaborator,
    updatePresence,
    markNotificationRead,
    markAllNotificationsRead,
    
    // Refetch
    refetchCollaborators: fetchCollaborators,
    refetchInvitations: fetchInvitations,
  };
}