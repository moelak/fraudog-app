import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  status: 'active' | 'inactive' | 'warning';
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
  status: 'active' | 'inactive' | 'warning';
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
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
    } finally {
      setLoading(false);
    }
  };

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

      // Update local state
      setRules(prev => [data, ...prev]);
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

      // Update local state
      setRules(prev => prev.map(rule => rule.id === id ? data : rule));
      return data;
    } catch (err) {
      console.error('Error updating rule:', err);
      throw err;
    }
  };

  const softDeleteRule = async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('rules')
        .update({ 
          is_deleted: true, 
          status: 'inactive' 
        })
        .eq('id', id)
        // .eq('user_id', user.id);  

      if (error) {
        throw error;
      }

      // Update local state
      setRules(prev => prev.map(rule => 
        rule.id === id 
          ? { ...rule, is_deleted: true, status: 'inactive' as const }
          : rule
      ));
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

      // Update local state
      setRules(prev => prev.map(rule => 
        rule.id === id 
          ? { ...rule, is_deleted: false }
          : rule
      ));
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

      // Update local state
      setRules(prev => prev.filter(rule => rule.id !== id));
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

  // Filter functions
  const activeRules = rules.filter(rule => !rule.is_deleted && rule.status === 'active');
  const allRules = rules.filter(rule => !rule.is_deleted);
  const needsAttentionRules = rules.filter(rule => 
    !rule.is_deleted && (
      rule.status === 'warning' || 
      rule.effectiveness < 70 || 
      rule.false_positives > 100
    )
  );
  const deletedRules = rules.filter(rule => rule.is_deleted);

  return {
    rules,
    activeRules,
    allRules,
    needsAttentionRules,
    deletedRules,
    loading,
    error,
    fetchRules,
    createRule,
    updateRule,
    softDeleteRule,
    recoverRule,
    permanentDeleteRule,
    toggleRuleStatus
  };
}