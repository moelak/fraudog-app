// components/Monitoring/NotificationStore.ts
import { makeAutoObservable, runInAction } from "mobx";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface NotificationLog {
  id: number;
  organization_id: string;
  event_type: string;
  actor_user_id: string;
  actor_name?: string | null;
  subject_type: string;
  subject_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export class NotificationStore {
  notifications: NotificationLog[] = [];
  filteredNotifications: NotificationLog[] = [];
  searchTerm = "";
  channel: RealtimeChannel | null = null;
isLoading = false;

  // ✅ cache rule names here
  ruleNameCache: Record<string, string> = {};

  constructor() {
    makeAutoObservable(this);
  }

async fetchOrganizationNotifications(organizationId: string) {
  runInAction(() => {
    this.isLoading = true; // 🔵 Start loading
  });

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 14);

    const { data, error } = await supabase
      .from("app_event_log")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    runInAction(() => {
      this.notifications = data || [];
      this.filteredNotifications = this.notifications;
    });

    // ✅ fetch all rule names once after loading events
    await this.fetchRuleNamesOnce(organizationId);
  } catch (err) {
    console.error("Error fetching organization notifications:", err);
  } finally {
    runInAction(() => {
      this.isLoading = false; 
    });
  }
}


async fetchRuleNamesOnce(organizationId: string) {
  if (!organizationId) {
    console.warn("⚠️ No organizationId provided to fetchRuleNamesOnce()");
    return;
  }

  const ruleIds = [
    ...new Set(
      this.notifications
        .filter(
          (n) =>
            n.subject_type === "rule" &&
            n.organization_id === organizationId
        )
        .map((n) => n.subject_id)
    ),
  ];

  const missingIds = ruleIds.filter(
    (id) => !this.ruleNameCache[`${organizationId}_${id}`]
  );
  if (missingIds.length === 0) return;

  const { data, error } = await supabase
    .from("rules")
    .select("id, name, organization_id")
    .in("id", missingIds)
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Error fetching rule names:", error);
    return;
  }

  runInAction(() => {
    (data || []).forEach((rule) => {
      const cacheKey = `${rule.organization_id}_${rule.id}`;
      this.ruleNameCache[cacheKey] = rule.name;
    });
  });
}


subscribeToNotifications(organizationId: string): void {
  if (this.channel) {
    this.channel.unsubscribe();
  }

  this.channel = supabase
    .channel(`realtime:app_event_log:${organizationId}`)
    .on<{
      new: NotificationLog | null;
      old: NotificationLog | null;
    }>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "app_event_log",
        filter: `organization_id=eq.${organizationId}`,
      },
      async (payload) => {
        const newEvent = payload.new as NotificationLog | null;
        if (!newEvent) return;

        runInAction(() => {
          // Replace or prepend new event
          this.notifications = [
            newEvent,
            ...this.notifications.filter((n) => n.id !== newEvent.id),
          ].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

          this.applySearch(this.searchTerm);
        });

        // ✅ fetch rule name safely scoped by org
        if (newEvent.subject_type === "rule") {
          const cacheKey = `${organizationId}_${newEvent.subject_id}`;
          if (!this.ruleNameCache[cacheKey]) {
            const { data, error } = await supabase
              .from("rules")
              .select("id, name, organization_id")
              .eq("id", newEvent.subject_id)
              //.eq("organization_id", organizationId) // 👈 important
              .single();

            if (!error && data) {
              runInAction(() => {
                this.ruleNameCache[cacheKey] = data.name;
              });
            }
          }
        }
      }
    )
    .subscribe();
}

    clearSubscription() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  applySearch(term: string) {
    this.searchTerm = term;
    const lower = term.toLowerCase();
    this.filteredNotifications = this.notifications.filter(
      (n) =>
        n.event_type.toLowerCase().includes(lower) ||
        n.actor_name?.toLowerCase().includes(lower) ||
        n.subject_type.toLowerCase().includes(lower) ||
        n.subject_id.toLowerCase().includes(lower)
    );
  }
}

export const notificationStore = new NotificationStore();
