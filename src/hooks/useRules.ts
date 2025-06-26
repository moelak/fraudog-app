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

      if (fetchError) {
        throw fetchError;
      }

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

       const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      console.warn('No valid session. Skipping realtime.');
      return;
    }
    
    if (!user) {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    // Cleanup any previous channel
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`rules_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rules',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time rule change:', payload);

          if (!mounted) return;

          if (payload.eventType === 'INSERT') {
            const newRule = payload.new as Rule;
            if (newRule.status === 'in progress') {
              ruleManagementStore.addInProgressRule(newRule);
            } else {
              fetchRules();
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedRule = payload.new as Rule;
            if (updatedRule.status === 'in progress') {
              ruleManagementStore.updateInProgressRule(updatedRule);
            } else {
              fetchRules();
            }
          } else if (payload.eventType === 'DELETE') {
            fetchRules();
          }
        }
      );

    await channel.subscribe((status) => {
  console.log('Subscription status:', status); // Will log "SUBSCRIBED", "CHANNEL_ERROR", etc.
});
 
    subscriptionRef.current = channel;
  };

  setupRealtime();

  return () => {
    mounted = false;
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };
}, [user?.id]);



  const createRule = async (ruleData: CreateRuleData): Promise<Rule | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('rules')
        .insert({
          ...ruleData,
          user_id: user.id,
          source: ruleData.source || 'User'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Force a complete refresh to ensure UI updates
      await fetchRules();
      return data;
    } catch (err) {
      console.error('Error creating rule:', err);
      throw err;
    }
  };

  const updateRule = async (id: string, updates: UpdateRuleData): Promise<Rule | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('rules')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Force a complete refresh to ensure UI updates
      await fetchRules();
      return data;
    } catch (err) {
      console.error('Error updating rule:', err);
      throw err;
    }
  };

  const implementRule = async (id: string): Promise<void> => {
    await updateRule(id, { status: 'active' });
  };

  const softDeleteRule = async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }
		
    try {
      // First, let's try to fetch the rule to make sure it exists and belongs to the user
      const { data: existingRule, error: fetchError } = await supabase
        .from('rules')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw new Error(`Rule not found or access denied: ${fetchError.message}`);
      }

      if (!existingRule) {
        throw new Error('Rule not found or you do not have permission to delete it');
      }

      // Now perform the update with explicit user_id check
      const { error } = await supabase
        .from('rules')
        .update({ 
          is_deleted: true, 
          status: 'inactive' as const
        })
        .eq('id', id)
        .eq('user_id', user.id); 

      if (error) {
        console.error('Soft delete error details:', error);
        throw error;
      }

      // Force a complete refresh to ensure UI updates
      await fetchRules();
    } catch (err) {
      console.error('Error soft deleting rule:', err);
      throw err;
    }
  };

  const recoverRule = async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('rules')
        .update({ is_deleted: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Force a complete refresh to ensure UI updates
      await fetchRules();
    } catch (err) {
      console.error('Error recovering rule:', err);
      throw err;
    }
  };

  const permanentDeleteRule = async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Force a complete refresh to ensure UI updates
      await fetchRules();
    } catch (err) {
      console.error('Error permanently deleting rule:', err);
      throw err;
    }
  };

  const toggleRuleStatus = async (id: string): Promise<void> => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    const newStatus = rule.status === 'active' ? 'inactive' : 'active';
    await updateRule(id, { status: newStatus });
  };

  useEffect(() => {
    fetchRules();
  }, [user]);

  // Filter functions - only include allowed statuses
  const allowedRules = rules.filter(rule => ['active', 'inactive', 'warning'].includes(rule.status));
  const activeRules = allowedRules.filter(rule => !rule.is_deleted && rule.status === 'active');
  const allRules = allowedRules.filter(rule => !rule.is_deleted);
  const needsAttentionRules = allowedRules.filter(rule => 
    !rule.is_deleted && (
      rule.status === 'warning' || 
      rule.effectiveness < 70 || 
      rule.false_positives > 100
    )
  );
  const deletedRules = allowedRules.filter(rule => rule.is_deleted);

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
    toggleRuleStatus
  };
}