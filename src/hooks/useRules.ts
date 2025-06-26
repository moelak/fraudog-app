import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { ruleManagementStore } from '../components/RuleManagement/RuleManagementStore';

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  status: 'active' | 'inactive' | 'warning' | 'in progress';
  severity: 'low' | 'medium' | 'high';
  log_only: boolean;
  catches: number;
  false_positives: number;
  effectiveness: number;
  source: 'AI' | 'User';
  is_deleted: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleData {
  name: string;
  description: string;
  category: string;
  condition: string;
  status: 'active' | 'inactive' | 'warning' | 'in progress';
  severity: 'low' | 'medium' | 'high';
  log_only: boolean;
  source?: 'AI' | 'User';
}

export interface UpdateRuleData extends Partial<CreateRuleData> {
  catches?: number;
  false_positives?: number;
  effectiveness?: number;
}

export function useRules() {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = async () => {
    if (!user) {
      setRules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRules(data || []);
      ruleManagementStore.setRules(data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const setupRealtime = async () => {
      if (subscriptionRef.current) {
        console.warn('Already subscribed. Skipping setup.');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !session.access_token || !user) {
        console.warn('No valid session. Skipping Realtime.');
        return;
      }

      const channel = supabase
        .channel(`rules_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rules',
          },
          (payload) => {
            const updatedRule = payload.new as Rule;

            // ⚠️ Filter manually
            if (updatedRule.user_id !== user.id) return;

            console.log('Realtime rule change:', payload);

            if (!mounted) return;

            if (payload.eventType === 'INSERT') {
              if (updatedRule.status === 'in progress') {
                ruleManagementStore.addInProgressRule(updatedRule);
              } else {
                fetchRules();
              }
            } else if (payload.eventType === 'UPDATE') {
              if (updatedRule.status === 'in progress') {
                ruleManagementStore.updateInProgressRule(updatedRule);
              } else {
                fetchRules();
              }
            } else if (payload.eventType === 'DELETE') {
              fetchRules();
            }
          }
        )
        .on('error', (err) => {
          console.error('Realtime subscription error:', err);
        })
        .on('close', () => {
          console.warn('Realtime channel closed.');
        });

      await channel
        .subscribe((status) => {
          console.log('Subscription status:', status);
        })
        .catch((err) => {
          console.error('Subscribe call failed:', err);
        });

      subscriptionRef.current = channel;
    };

    // Delay to ensure session is ready
    const delayAndSetup = () => {
      setTimeout(() => {
        if (mounted) setupRealtime();
      }, 250);
    };

    delayAndSetup();

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    fetchRules();
  }, [user]);

  const createRule = async (ruleData: CreateRuleData): Promise<Rule | null> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('rules')
      .insert({ ...ruleData, user_id: user.id, source: ruleData.source || 'User' })
      .select()
      .single();

    if (error) throw error;

    await fetchRules();
    return data;
  };

  const updateRule = async (id: string, updates: UpdateRuleData): Promise<Rule | null> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('rules')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    await fetchRules();
    return data;
  };

  const implementRule = async (id: string) => await updateRule(id, { status: 'active' });

  const softDeleteRule = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('rules')
      .update({ is_deleted: true, status: 'inactive' })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await fetchRules();
  };

  const recoverRule = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('rules')
      .update({ is_deleted: false })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await fetchRules();
  };

  const permanentDeleteRule = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    await fetchRules();
  };

  const toggleRuleStatus = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;

    const newStatus = rule.status === 'active' ? 'inactive' : 'active';
    await updateRule(id, { status: newStatus });
  };

  const allowedRules = rules.filter((r) => ['active', 'inactive', 'warning'].includes(r.status));
  const activeRules = allowedRules.filter((r) => !r.is_deleted && r.status === 'active');
  const allRules = allowedRules.filter((r) => !r.is_deleted);
  const needsAttentionRules = allowedRules.filter(
    (r) =>
      !r.is_deleted &&
      (r.status === 'warning' || r.effectiveness < 70 || r.false_positives > 100)
  );
  const deletedRules = allowedRules.filter((r) => r.is_deleted);

  return {
    rules: allowedRules,
    activeRules,
    allRules,
    needsAttentionRules,
    deletedRules,
    loading,
    error,
    fetchRules,
    createRule,
    updateRule,
    implementRule,
    softDeleteRule,
    recoverRule,
    permanentDeleteRule,
    toggleRuleStatus,
  };
}
