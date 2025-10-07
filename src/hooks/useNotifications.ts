import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getFullName } from '@/utils/getFullName';

export interface NotificationItem {
  id: string;
  title: string;
  type: string;
  body: string;
  full_name: string;
  created_at: string;
  is_read: boolean;
  created_by?: string;
  user_notification_states?: {
    is_read: boolean;
    read_at: string | null;
    expired_at: string | null;
  }[];
}
export type OrgEmbed = { full_name: string } | { full_name: string }[] | null;

interface NotificationRow {
  id: string;
  title: string;
  type: string;
  body: string;
  created_at: string;
  created_by?: string;
  organizations?: OrgEmbed; 

  user_notification_states: {
    is_read: boolean;
    read_at: string | null;
    expired_at: string | null;
  }[];
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);



const fetchNotifications = async () => {
  if (!user) return;
  setLoading(true);

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from<'notifications', NotificationRow>('notifications')
    .select(`
      id,
      title,
      body,
      type,
      created_at,
      created_by,
      user_notification_states!inner(is_read, read_at, expired_at),
      organizations!inner(full_name)
    `)
    .eq('user_notification_states.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

if (!error && data) {
      // ✅ Use strong typing, no any
      const rows = data ;

      const filtered = rows.filter((row) => {
        const expiredAt = row.user_notification_states?.[0]?.expired_at;
        return !expiredAt || expiredAt > now;
      });

      const mapped: NotificationItem[] = filtered.map((row) => {
        
        return {
        id: row.id,
        title: row.title,
        type: row.type,
        body: row.body,
        created_at: row.created_at,
        is_read: row.user_notification_states?.[0]?.is_read ?? false,
        created_by: row.created_by,
        full_name: getFullName(row.organizations),   
        user_notification_states: row.user_notification_states,
      }});

      setNotifications(mapped);
    }
    setLoading(false);
};


const markAsRead = async (id: string) => {
  if (!user) return;

  const readAt = new Date().toISOString();

  await supabase
    .from('user_notification_states')
    .update({ is_read: true, read_at: readAt })
    .eq('notification_id', id)
    .eq('user_id', user.id);

  setNotifications((prev) =>
    prev.map((n) =>
      n.id === id ? { ...n, is_read: true, read_at: readAt } : n
    )
  );
};

const markAllAsRead = async () => {
  if (!user) return;

  const readAt = new Date().toISOString();

  await supabase
    .from('user_notification_states')
    .update({ is_read: true, read_at: readAt })
    .eq('user_id', user.id);

  setNotifications((prev) =>
    prev.map((n) => ({ ...n, is_read: true, read_at: readAt }))
  );
};


  // 📡 Realtime subscription
  useEffect(() => {
    if (!user) return;

    // cleanup
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notification_states',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // whenever my notification state changes (new notif, marked read, etc)
          fetchNotifications();
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  return {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount: notifications.filter((n) => !n.is_read).length,
  };
}
