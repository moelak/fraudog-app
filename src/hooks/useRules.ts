// hooks/useRules.ts
import { useState, useEffect, useRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {  ruleManagementStore } from '../components/RuleManagement/RuleManagementStore';
import { RealtimeChannel } from "@supabase/supabase-js";
dayjs.extend(utc);
import { toJS } from "mobx";

/* =========================
   Types
   ========================= */
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
  chargebacks: number;
  effectiveness: number | null;
  source: 'AI' | 'User';
  is_deleted: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  isCalculating?: boolean;
  hasCalculated?: boolean;
  organization_id?: string;
  displayName?: string;
   decision: 'allow' | 'review' | 'deny';
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
 decision: 'allow' | 'review' | 'deny';
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
  chargebacks?: number;
  effectiveness?: number | null;
  decision?: 'allow' | 'review' | 'deny';
}

type MetricsRow = {
  rule_id: string;
  timestamp: string;
  catches: number | null;
  false_positives: number | null;
  chargebacks: number | null;
  organization_id: string;
};

type TimeWindow = {
  // e.g. "2025-08-14 00:00:00+00" (inclusive)
  fromISO: string;
  // e.g. "2025-08-15 00:00:00+00" (exclusive)
  toExclusiveISO: string;
};

/* =========================
   Guards (React 18 Dev double-run)
   ========================= */

/* =========================
   Hook
   ========================= */
export function useRules() {
  const { user } = useAuth();
const orgId = toJS(ruleManagementStore.organizationId);
const rangeSnapshot = toJS(ruleManagementStore.range);
  // Local state (MobX store holds table-rendering state)
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // const [organizationId, setOrganizationId] = useState<string | null>(null);
const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // Realtime (kept around for future use)
  // const subscriptionRef = useRef<RealtimeChannel | null>(null);
  // const isSubscribedRef = useRef(false);

  // Persist the last-selected UTC date window
  const currentRangeRef = useRef<TimeWindow | null>(null);

  // user_id -> display name
  const orgNameMapRef = useRef<Map<string, string>>(new Map());

  // Latest-wins token to prevent stale commits when multiple requests overlap
  const activeReqIdRef = useRef(0);

  /* =========================
     Date helpers (UTC-day windows)
     ========================= */
  // Postgres-friendly UTC string: "YYYY-MM-DD HH:mm:ss+00"
  const fmtPG = (d: Dayjs) => d.utc().format('YYYY-MM-DD HH:mm:ss[+00]');

  // Build UTC 00:00 for the given calendar day of a Dayjs object.
  // We intentionally drop local time by formatting date only and re-parsing as UTC.
  const utcDayStart = (d: Dayjs) => dayjs.utc(d.format('YYYY-MM-DD')); // 00:00:00+00

  // Default window: last 7 UTC days inclusive of today
  const defaultWindowUTC = (): TimeWindow => {
    const from = dayjs.utc(dayjs().subtract(6, 'day').format('YYYY-MM-DD')); // 6 days ago 00:00 UTC
    const toExclusive = dayjs
      .utc(dayjs().format('YYYY-MM-DD'))
      .add(1, 'day'); // tomorrow 00:00 UTC
    return { fromISO: fmtPG(from), toExclusiveISO: fmtPG(toExclusive) };
  };

  // Normalize a picked [from, to] into [UTC 00:00, next-day 00:00)
  const normalizeRangeToUTC = (range: { from: Dayjs | null; to: Dayjs | null }): TimeWindow => {
    const fromUtc = range.from
      ? utcDayStart(range.from)
      : dayjs.utc(dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
  // 👇 use endOf('day') so it's inclusive through 23:59:59
  const toInclusiveUtc = range.to
    ? dayjs.utc(range.to.format('YYYY-MM-DD')).endOf('day')
    : dayjs.utc(dayjs().format('YYYY-MM-DD')).endOf('day');

  return { fromISO: fmtPG(fromUtc), toExclusiveISO: fmtPG(toInclusiveUtc) };
  };

  // Use persisted window if present; otherwise default UTC window
  const getActiveWindow = (): TimeWindow => currentRangeRef.current ?? defaultWindowUTC();

  /* =========================
     Helpers
     ========================= */
  const attachDisplayNames = (rows:Rule[]) =>
    (rows || []).map((r) => ({
      ...r,
      displayName: orgNameMapRef.current.get(r.user_id) || r.user_id,
    })) as Rule[];



useEffect(() => {
  if (!ruleManagementStore.organizationId) return;

  // Clean up existing subscription if any
  if (subscriptionRef.current) {
    supabase.removeChannel(subscriptionRef.current);
  }
  // Subscribe to changes only for the same organization
  const channel = supabase
    .channel(`rules-changes-${ruleManagementStore.organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',          // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'rules',
        filter: `organization_id=eq.${ruleManagementStore.organizationId}`
      },
      async () => {
      // async (payload) => {
        // console.log("Realtime change:", payload);

        // Option 1: Simple — refetch all rules
        await fetchRules();

        // Option 2: Optimistic — merge changes directly into store
        // if (payload.eventType === "INSERT") {
        //   ruleManagementStore.addRule(payload.new as Rule);
        // }
        // if (payload.eventType === "UPDATE") {
        //   ruleManagementStore.updateRuleInStore(payload.new as Rule);
        // }
        // if (payload.eventType === "DELETE") {
        //   ruleManagementStore.setRules(
        //     ruleManagementStore.rules.filter(r => r.id !== payload.old.id)
        //   );
        // }
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
}, [user?.id, ruleManagementStore.organizationId]);

async function fetchAllMetrics(orgId: string, ruleIds: string[], window: TimeWindow) {
  const batchSize = 400; // number of rows to keep each time
  const allMetrics: MetricsRow[] = [];

  let offset = 0;
  let hasNext = true;

  while (hasNext) {
    // 👇 Fetch one extra (401st) to check if there’s another page
    const { data, error } = await supabase
      .from("rules_metrics_hourly")
      .select("rule_id, catches, false_positives, chargebacks, timestamp, organization_id")
      .eq("organization_id", orgId)
      .in("rule_id", ruleIds)
      .gte("timestamp", window.fromISO)
      .lte("timestamp", window.toExclusiveISO)
      .range(offset, offset + batchSize); // returns 401 rows max (0 → 400 inclusive)

    if (error) throw error;
    if (!data || data.length === 0) break;

    // ✅ Keep only the first 400 (discard the 401st “next page indicator”)
    const currentBatch = data.slice(0, batchSize);
    allMetrics.push(...currentBatch);

    // ✅ Decide whether to continue
    hasNext = data.length > batchSize;
    offset += batchSize;
  }

  return allMetrics;
}



  // Merge metrics for rules in a UTC window and apply decision logic
// Merge metrics for rules in a UTC window and apply decision logic
const aggregateAndApplyMetrics = async (
  baseRules: Rule[],
  window: TimeWindow,
  orgId: string
): Promise<Rule[]> => {
  const ruleIds = baseRules.map((r) => r.id);
  if (!ruleIds.length) return baseRules;

  const metrics = await fetchAllMetrics(orgId, ruleIds, window);

  const sums = new Map<string, { c: number; fp: number; cb: number }>();
  (metrics as MetricsRow[] | null)?.forEach((row) => {
    const prev = sums.get(row.rule_id) ?? { c: 0, fp: 0, cb: 0 };
    prev.c += row.catches ?? 0;
    prev.fp += row.false_positives ?? 0;
    prev.cb += row.chargebacks ?? 0;
    sums.set(row.rule_id, prev);
  });

  return baseRules.map((rule) => {
    const s = sums.get(rule.id) ?? { c: 0, fp: 0, cb: 0 };
    const catches = s.c;
    const displayFalsePositives = s.fp;
    const displayChargebacks = s.cb;

    let effectiveness: number | null = null;
    if (catches > 0) {
      const ratio = displayFalsePositives / catches;
      effectiveness = Math.round((1 - ratio) * 1000) / 10; // 1 decimal
    }

    // ✅ check if the rule has any metrics
    const hasMetrics = sums.has(rule.id);

    return {
      ...rule,
      catches,
      false_positives: displayFalsePositives,
      chargebacks: displayChargebacks,
      effectiveness,
      isCalculating: false,
      hasCalculated: true,
      hasMetrics, // 👈 add this flag
    };
  });
};


  /* =========================
     Fetch (latest-wins)
     ========================= */
  const fetchRules = async () => {
    if (!user?.id) {
      setRules([]);
      setLoading(false);
      return;
    }

    const reqId = ++activeReqIdRef.current;
    try {
      setLoading(true);
      setError(null);

      // 1) Organization for this user
      const { data: orgRow, error: orgErr } = await supabase
        .from('organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      if (orgErr || !orgRow) throw orgErr || new Error('Organization not found for user');
      const orgId = orgRow.organization_id as string;
      // setOrganizationId(orgId);

      // 2) Org users (for display names)
      const { data: orgUsers, error: orgUsersErr } = await supabase
        .from('organizations')
        .select('user_id, full_name')
        .eq('organization_id', orgId);
      if (orgUsersErr) throw orgUsersErr;
      orgNameMapRef.current = new Map(
        (orgUsers || []).map((u) => [u.user_id as string, (u.full_name as string) || ''])
      );

      // 3) Base rules (not deleted)
      const { data: rulesRows, error: rulesErr } = await supabase
        .from('rules')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (rulesErr) throw rulesErr;

      const baseRules = attachDisplayNames(rulesRows).map((r) => ({
        ...r,
        catches: 0,
        false_positives: 0,
        chargebacks: 0,
        effectiveness: null,
      })) as Rule[];

      // 4) Active UTC window
      const window = getActiveWindow();

      // 5) Merge metrics
      const merged = await aggregateAndApplyMetrics(baseRules, window, orgId);

      if (reqId !== activeReqIdRef.current) return; // stale
      
      setRules(merged);
      await ruleManagementStore.setRules(merged);
    } catch (e) {
      if (reqId !== activeReqIdRef.current) return; // stale
      setError(e instanceof Error ? e.message : 'Failed to fetch rules');
    } finally {
      if (reqId === activeReqIdRef.current) setLoading(false);
    }
  };

  /* =========================
     Search (latest-wins)
     ========================= */
  const searchByDateRange = async (range: { from: Dayjs | null; to: Dayjs | null }) => {
const orgId= ruleManagementStore.organizationId
    if (!user?.id || !ruleManagementStore.organizationId) return;
 
    const reqId = ++activeReqIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const window = normalizeRangeToUTC(range);
      currentRangeRef.current = window; // persist exact UTC window

      // Re-fetch base rules (in case new rules were added)
      const { data: rulesRows, error: rulesErr } = await supabase
        .from('rules')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (rulesErr) throw rulesErr;

      const { data: orgUsers, error: orgUsersErr } = await supabase
        .from('organizations')
        .select('user_id, full_name')
        .eq('organization_id', orgId);
      if (orgUsersErr) throw orgUsersErr;
      orgNameMapRef.current = new Map(
        (orgUsers || []).map((u) => [u.user_id as string, (u.full_name as string) || ''])
      );

      const baseRules:Rule[] = attachDisplayNames(rulesRows).map((r) => ({
        ...r,
        catches: 0,
        false_positives: 0,
        chargebacks: 0,
        effectiveness: null,
      })) as Rule[];

      const merged = await aggregateAndApplyMetrics(baseRules, window, ruleManagementStore.organizationId);

      if (reqId !== activeReqIdRef.current) return; // stale
   
      setRules(merged);
      await ruleManagementStore.setRules(merged);
    } catch (e) {
      if (reqId !== activeReqIdRef.current) return; // stale
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      if (reqId === activeReqIdRef.current) setLoading(false);
    }
  };

  /* =========================
     Initial load (once)
     ========================= */
// useEffect(() => {
//   if (!user?.id) return;
//   if (!ruleManagementStore.organizationId) return;
// console.log("test=>>>")
//   // wait until range is ready
//   if (ruleManagementStore.range?.from && ruleManagementStore.range?.to) {
//     void refetchWithCurrentRange();
//   } else {
//     // fallback to default 7-day fetch
//     void fetchRules();
//   }
// }, [user?.id]);

const hasFetchedRef = useRef(false);

useEffect(() => {
  if (hasFetchedRef.current) return;
  if (!user?.id || !orgId) return;

  hasFetchedRef.current = true;

  console.log("🚀 Initializing once with range:", rangeSnapshot);
  if (rangeSnapshot?.from && rangeSnapshot?.to) {
    void refetchWithCurrentRange();
  } else {
    void fetchRules();
  }
}, [orgId]);


  /* =========================
     CRUD (unchanged behavior; refresh via fetchRules)
     ========================= */
const createRule = async (ruleData: CreateRuleData): Promise<Rule | null> => {
  if (!user) throw new Error('User not authenticated');

  const { data: orgRow, error: orgErr } = await supabase
    .from('organizations')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();
  if (orgErr || !orgRow) throw orgErr || new Error('Organization not found for user');
  const orgId = orgRow.organization_id as string;

  const { data, error } = await supabase
    .from('rules')
    .insert({
      ...ruleData,
      user_id: user.id,
      decision: ruleData.decision.toLowerCase(),
      organization_id: orgId,
      source: ruleData.source || 'User',
    })
    .select()
    .single();
  if (error) throw error;

  // 🔔 Notify + fan-out
  const { data: notif, error: notifErr } = await supabase
    .from('notifications')
    .insert({
      organization_id: orgId,
      type: 'rule.created',
      title: `Rule created: ${ruleData.name}`,
      body: ruleData.description,
      data: { ...data},
      source_type: 'rule',
      source_id: data.id,
      created_by: user.id,
    })
    .select()
    .single();
  if (notifErr) throw notifErr;

  await supabase.rpc('fan_out_notification', {
    notif_id: notif.id,
    org_id: orgId,
    actor_user_id: user.id, // exclude yourself
  });

  void refetchWithCurrentRange();
  return data as Rule;
};

const updateRule = async (id: string, updates: UpdateRuleData): Promise<Rule | null> => {
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('rules')
    .update({
      ...updates,
      ...(updates.decision ? { decision: updates.decision.toLowerCase() } : {})
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // 1️⃣ Insert notification
  const { data: notif, error: notifErr } = await supabase
    .from('notifications')
    .insert({
      organization_id: data.organization_id,
      type: 'rule.updated',
      title: `Rule updated: ${data.name}`,
      body: updates.description || data.description,
      data: { ...data},
      source_type: 'rule',
      source_id: data.id,
      created_by: user.id,
    })
    .select()
    .single();

    if (notifErr) throw notifErr;

    // 2️⃣ Fan out to user_notification_states
    await supabase.rpc('fan_out_notification', {
      notif_id: notif.id,
      org_id: data.organization_id,
      actor_user_id: user.id,   // exclude yourself
    });

   void refetchWithCurrentRange();
    return data as Rule;
};


  const implementRule = async (id: string) => await updateRule(id, { status: 'active' });

 const softDeleteRule = async (id: string) => {
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('rules')
    .update({ is_deleted: true, status: 'inactive' })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) throw error;

  // 🔔 Notify + fan-out
  const { data: notif, error: notifErr } = await supabase
    .from('notifications')
    .insert({
      organization_id: data.organization_id,
      type: 'rule.deleted',
      title: `Rule deleted: ${data.name}`,
      body: `Rule "${data.name}" was marked inactive.`,
      data: { rule_id: data.id },
      source_type: 'rule',
      source_id: data.id,
      created_by: user.id,
    })
    .select()
    .single();
  if (notifErr) throw notifErr;

  await supabase.rpc('fan_out_notification', {
    notif_id: notif.id,
    org_id: data.organization_id,
    actor_user_id: user.id,
  });

void refetchWithCurrentRange();
};

const recoverRule = async (id: string) => {
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('rules')
    .update({ is_deleted: false, status: 'inactive' })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) throw error;

  // 🔔 Notify + fan-out
  const { data: notif, error: notifErr } = await supabase
    .from('notifications')
    .insert({
      organization_id: data.organization_id,
      type: 'rule.recovered',
      title: `Rule recovered: ${data.name}`,
      body: `Rule "${data.name}" was recovered.`,
      data: { rule_id: data.id },
      source_type: 'rule',
      source_id: data.id,
      created_by: user.id,
    })
    .select()
    .single();
  if (notifErr) throw notifErr;

  await supabase.rpc('fan_out_notification', {
    notif_id: notif.id,
    org_id: data.organization_id,
    actor_user_id: user.id,
  });

  void refetchWithCurrentRange();
};

const permanentDeleteRule = async (id: string) => {
  if (!user) throw new Error('User not authenticated');

  const { data: existingRule } = await supabase
    .from('rules')
    .select('id, name, organization_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;

  if (existingRule) {
    // 🔔 Notify + fan-out
    const { data: notif, error: notifErr } = await supabase
      .from('notifications')
      .insert({
        organization_id: existingRule.organization_id,
        type: 'rule.permanently_deleted',
        title: `Rule permanently deleted: ${existingRule.name}`,
        body: `Rule "${existingRule.name}" was permanently removed.`,
        data: { rule_id: existingRule.id },
        source_type: 'rule',
        source_id: existingRule.id,
        created_by: user.id,
      })
      .select()
      .single();
    if (notifErr) throw notifErr;

    await supabase.rpc('fan_out_notification', {
      notif_id: notif.id,
      org_id: existingRule.organization_id,
      actor_user_id: user.id,
    });
  }

  void refetchWithCurrentRange();
};

const toggleRuleStatus = async (id: string) => {
  const currentRules = ruleManagementStore.rules || [];
  const rule = currentRules.find((r) => r.id === id);

  if (!rule) {
    console.warn("Rule not found in store for id:", id);
    return;
  }

  const newStatus = rule.status === "active" ? "inactive" : "active";
  console.log(`Toggling rule "${rule.name}" → ${newStatus}`);

  await updateRule(id, { status: newStatus });

  // Update MobX store to reflect new status immediately
  ruleManagementStore.updateRuleInStore({
    ...rule,
    status: newStatus,
    updated_at: new Date().toISOString(),
  });
};

// ✅ Helper: Refetch with current or default date range
const refetchWithCurrentRange = async () => {
  console.log("🔄 Refetching with saved date range:", ruleManagementStore.range);

  // check if valid range exists
  if (ruleManagementStore.range?.from && ruleManagementStore.range?.to) {
    // format in UTC for display or queries
    const formatUTC = (d: dayjs.Dayjs) => d.utc().format("YYYY-MM-DD HH:mm:ss[+00]");

    const from = dayjs(ruleManagementStore.range.from);
    const to = dayjs(ruleManagementStore.range.to);

    console.log(
      `timestamp\ngte.${formatUTC(from)}\ntimestamp\nlte.${formatUTC(to)}`
    );

    // 🔄 use the actual stored ISO range
    await searchByDateRange({
      from,
      to,
    });
  } else {
    console.log("🔄 Refetching with default range");
    await fetchRules();
  }
};


  /* =========================
     Derived subsets
     ========================= */
  const allowedRules = rules.filter((r) => ['active', 'inactive', 'warning'].includes(r.status));
  const activeRules = allowedRules.filter((r) => !r.is_deleted && r.status === 'active');
  const allRules = allowedRules.filter((r) => !r.is_deleted);
  const needsAttentionRules = allowedRules.filter(
    (r) => !r.is_deleted && (r.status === 'warning' || (r.effectiveness ?? 0) < 70 || (r.false_positives ?? 0) > 100)
  );
  const deletedRules = allowedRules.filter((r) => r.is_deleted);

  return {
    // data
    rules: allowedRules,
    activeRules,
    allRules,
    needsAttentionRules,
    deletedRules,

    // state
    loading,
    error,

    // actions
    fetchRules,
    searchByDateRange,
    createRule,
    updateRule,
    implementRule,
    softDeleteRule,
    recoverRule,
    permanentDeleteRule,
    toggleRuleStatus,
  };
}


