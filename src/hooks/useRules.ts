import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { ruleManagementStore } from '../components/RuleManagement/RuleManagementStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  organization_id?:string;
  displayName?: string; 
  decision?:string

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
const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const orgNameMapRef = useRef<Map<string, string>>(new Map());


const fetchRules = async () => {
    if (!user) {
      setRules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Get the user's organization_id
      const { data: orgRow, error: orgError } = await supabase
        .from('organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (orgError || !orgRow) {
        throw orgError || new Error('Organization not found for user.');
      }

      const orgId = orgRow.organization_id;
      setOrganizationId(orgId);


      // 2) Get all users for this organization (user_id, full_name)
const { data: orgUsers, error: orgUsersErr } = await supabase
  .from('organizations')
  .select('user_id, full_name')
  .eq('organization_id', orgId);

if (orgUsersErr) throw orgUsersErr;

orgNameMapRef.current = new Map(
  (orgUsers || []).map(u => [u.user_id, u.full_name || ''])
);

// Build a lookup: user_id -> full_name
const nameMap = new Map<string, string>(
  (orgUsers || []).map((u: { user_id: string; full_name: string | null }) => [
    u.user_id,
    u.full_name || '',
  ])
);

console.log("=>>", orgNameMapRef.current , nameMap)
      // 2. Fetch rules for that organization
      const { data, error: fetchError } = await supabase
        .from('rules')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // 4) Attach displayName to each rule
      const rulesWithNames = (data || []).map((r) => ({
        ...r,
        displayName: nameMap.get(r.user_id) || r.user_id, // fallback to user_id
      }));

      setRules(rulesWithNames || []);

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        await ruleManagementStore.setRules(rulesWithNames || []);
      } else {
        const currentRuleIds = new Set(ruleManagementStore.rules.map(r => r.id));
        const currentInProgressIds = new Set(ruleManagementStore.inProgressRules.map(r => r.id));

        const hasNewRules = (rulesWithNames || []).some(rule =>
          !currentRuleIds.has(rule.id) && !currentInProgressIds.has(rule.id)
        );

        if (hasNewRules) {
          await ruleManagementStore.setRules(rulesWithNames || []);
        } else {
          const mainRules = (rulesWithNames || []).filter(rule => ['active', 'inactive', 'warning'].includes(rule.status));
          const inProgressRules = (rulesWithNames || []).filter(rule => rule.status === 'in progress');

          ruleManagementStore.rules = mainRules.map(rule => {
            const existingRule = ruleManagementStore.rules.find(r => r.id === rule.id);
            if (existingRule?.hasCalculated) {
              return { ...rule, ...existingRule };
            }
            return rule;
          });

          ruleManagementStore.inProgressRules = ruleManagementStore.deduplicateRules(
            inProgressRules.map(rule => {
              const existingRule = ruleManagementStore.inProgressRules.find(r => r.id === rule.id);
              if (existingRule?.hasCalculated) {
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
      if (!organizationId || !user) return;
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
        const channelName = `rules_changes_${organizationId}_${Date.now()}`;
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
            if (rule && rule?.organization_id !== organizationId) {
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
  }, [organizationId, user?.id]);

  useEffect(() => {
    fetchRules();
  }, [user]);

  const createRule = async (ruleData: CreateRuleData): Promise<Rule | null> => {
    if (!user) throw new Error('User not authenticated');

      // Get the user's organization_id
  const { data: orgRow, error: orgError } = await supabase
    .from('organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (orgError || !orgRow) {
    throw orgError || new Error('Organization not found for user.');
  }

  const orgId = orgRow.organization_id;



    const { data, error } = await supabase
      .from('rules')
      .insert({ ...ruleData, user_id: user.id,   organization_id: orgId, source: ruleData.source || 'User' })
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