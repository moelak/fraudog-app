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
  isCalculating?: boolean;
  hasCalculated?: boolean;
}

export interface CreateRuleData {
  name: string;
  description: string;
  category: string;
  condition: string;
  status: 'active' | 'inactive' | 'warning';
  severity: 'low' | 'medium' | 'high';
  log_only: boolean;
  source?: 'AI' | 'User';
}

export interface UpdateRuleData {
  name?: string;
  description?: string;
  category?: string;
  condition?: string;
  status?: 'active' | 'inactive' | 'warning' | 'in progress';
  severity?: 'low' | 'medium' | 'high';
  log_only?: boolean;
  source?: 'AI' | 'User';
  catches?: number;
  false_positives?: number;
  effectiveness?: number;
}

export function useRules() {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const hasInitializedRef = useRef(false);
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
      
      // Only call setRules if this is the first initialization
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        await ruleManagementStore.setRules(data || []);
      } else {
        // For subsequent updates, check if there are actually new rules
        const currentRuleIds = new Set(ruleManagementStore.rules.map(r => r.id));
        const currentInProgressIds = new Set(ruleManagementStore.inProgressRules.map(r => r.id));
        
        // Check if there are any new rules
        const hasNewRules = (data || []).some(rule => 
          !currentRuleIds.has(rule.id) && !currentInProgressIds.has(rule.id)
        );
        
        if (hasNewRules) {
          // Only update if there are genuinely new rules
          await ruleManagementStore.setRules(data || []);
        } else {
          // Just update the rules without recalculating
          const mainRules = (data || []).filter(rule => ['active', 'inactive', 'warning'].includes(rule.status));
          const inProgressRules = (data || []).filter(rule => rule.status === 'in progress');
          
          // Update main rules while preserving calculated values
          ruleManagementStore.rules = mainRules.map(rule => {
            const existingRule = ruleManagementStore.rules.find(r => r.id === rule.id);
            if (existingRule && existingRule.hasCalculated) {
              return { ...rule, ...existingRule };
            }
            return rule;
          });
          
          // Update in progress rules while preserving calculated values
          ruleManagementStore.inProgressRules = ruleManagementStore.deduplicateRules(
            inProgressRules.map(rule => {
              const existingRule = ruleManagementStore.inProgressRules.find(r => r.id === rule.id);
              if (existingRule && existingRule.hasCalculated) {
                return { ...rule, ...existingRule };
              }
              return rule;
            })
          );
        }
      }
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
      // Skip if already subscribed or no user
      if (isSubscribedRef.current || !user) {
        return;
      }

      try {
        // Check for valid session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.warn('No valid session for Realtime');
          return;
        }

        // Clean up any existing subscription
        if (subscriptionRef.current) {
          await supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
          isSubscribedRef.current = false;
        }

        console.log('Setting up Realtime subscription for user:', user.id);

        // Create new channel with unique name
        const channelName = `rules_changes_${user.id}_${Date.now()}`;
        const channel = supabase.channel(channelName);

        // Set up event listener
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rules',
          },
          async (payload) => {
            console.log('Realtime rule change:', payload);

            if (!mounted) return;

            const rule = payload.new as Rule;
            
            // Filter by user_id manually since RLS might not work with Realtime
            if (rule && rule.user_id !== user.id) {
              return;
            }

            if (payload.eventType === 'INSERT') {
              if (rule.status === 'in progress') {
                await ruleManagementStore.addInProgressRule(rule);
              } else {
                fetchRules();
              }
            } else if (payload.eventType === 'UPDATE') {
              if (rule.status === 'in progress') {
                await ruleManagementStore.updateInProgressRule(rule);
              } else {
                // If rule was moved from 'in progress' to another status, remove from in progress
                ruleManagementStore.removeInProgressRule(rule.id);
                fetchRules();
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedRule = payload.old as Rule;
              if (deletedRule?.id) {
                ruleManagementStore.removeInProgressRule(deletedRule.id);
              }
              fetchRules();
            }
          }
        );

        // Subscribe to the channel
        channel.subscribe((status, err) => {
          console.log('Subscription status:', status);
          
          if (err) {
            console.error('Subscription error:', err);
            isSubscribedRef.current = false;
          } else if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to Realtime');
            isSubscribedRef.current = true;
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error occurred');
            isSubscribedRef.current = false;
          } else if (status === 'TIMED_OUT') {
            console.error('Subscription timed out');
            isSubscribedRef.current = false;
          } else if (status === 'CLOSED') {
            console.log('Channel closed');
            isSubscribedRef.current = false;
          }
        });

        subscriptionRef.current = channel;

      } catch (error) {
        console.error('Error setting up Realtime:', error);
        isSubscribedRef.current = false;
      }
    };

    // Delay setup to ensure auth is ready
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setupRealtime();
      }
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      
      if (subscriptionRef.current) {
        console.log('Cleaning up Realtime subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
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