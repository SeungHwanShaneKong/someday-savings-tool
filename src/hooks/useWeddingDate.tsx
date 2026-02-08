import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

export interface WeddingDateInfo {
  wedding_date: string | null;
  wedding_time: string | null;
}

export function useWeddingDate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [weddingTime, setWeddingTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch wedding date from the first budget
  const fetchWeddingDate = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('wedding_date, wedding_time')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setWeddingDate(data.wedding_date);
        setWeddingTime(data.wedding_time);
      }
    } catch (error: any) {
      console.error('Failed to fetch wedding date:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update wedding date and time
  const updateWeddingDate = async (date: string | null, time: string | null) => {
    if (!user) return;

    try {
      // Update all budgets for this user
      const { error } = await supabase
        .from('budgets')
        .update({ wedding_date: date, wedding_time: time })
        .eq('user_id', user.id);

      if (error) throw error;

      setWeddingDate(date);
      setWeddingTime(time);

      toast({
        title: '결혼 일정이 저장되었어요',
        description: date ? `${date}${time ? ` ${time}` : ''}` : '일정이 초기화되었습니다.',
      });
    } catch (error: any) {
      toast({
        title: '저장 중 오류가 발생했어요',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchWeddingDate();
    } else {
      setWeddingDate(null);
      setWeddingTime(null);
      setLoading(false);
    }
  }, [user, fetchWeddingDate]);

  return {
    weddingDate,
    weddingTime,
    loading,
    updateWeddingDate,
    refetch: fetchWeddingDate,
  };
}
