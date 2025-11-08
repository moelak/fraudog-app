// hooks/useEventLog.ts
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * Type for app_event_log rows
 */
export interface AppEventLog {
  id: number;
  organization_id: string;
  event_type: string;
  actor_user_id: string;
  subject_type: string;
  subject_id: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

/**
 * Hook to record audit events in Supabase
 */
export function useEventLog() {
  const { user } = useAuth();

  /**
   * Log an event to the app_event_log table
   */
  const logEvent = async (
    organizationId: string,
    eventType: string,
    subjectType: string,
    subjectId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<AppEventLog | null> => {
    if (!user?.id) {
      console.warn('Attempted to log event without authenticated user.');
      return null;
    }
      const actorName =
        user?.user_metadata?.first_name + " " + user?.user_metadata?.last_name||
        user?.email ||
        'Unknown User';
    const { data, error } = await supabase
      .from('app_event_log')
      .insert([
        {
          organization_id: organizationId,
          event_type: eventType,
          actor_user_id: user.id,
          subject_type: subjectType,
          subject_id: subjectId,
          metadata,
        actor_name: actorName, 
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to log event:', error);
      return null;
    }

    return data as AppEventLog;
  };

  /**
   * Fetch recent audit events for a given organization or subject
   */
/**
 * Fetch recent audit events ONLY for the user's organization
 */
const fetchEventLogs = async (options: {
  organizationId: string; // 👈 make it required
  subjectType?: string;
  subjectId?: string;
  limit?: number;
}): Promise<AppEventLog[]> => {
  // Always start with org filter
  let query = supabase
    .from('app_event_log')
    .select('*')
    .eq('organization_id', options.organizationId) // 👈 enforce org filter
    .order('created_at', { ascending: false });

  if (options.subjectType)
    query = query.eq('subject_type', options.subjectType);

  if (options.subjectId)
    query = query.eq('subject_id', options.subjectId);

  if (options.limit)
    query = query.limit(options.limit);

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch event logs:', error);
    return [];
  }

  return data as AppEventLog[];
};

  return {
    logEvent,
    fetchEventLogs,
  };
}
