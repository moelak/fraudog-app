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

  // ✅ cache rule names here
  ruleNameCache: Record<string, string> = {};

  constructor() {
    makeAutoObservable(this);
  }

  async fetchOrganizationNotifications(organizationId: string) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("app_event_log")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organization notifications:", error);
      return;
    }

    runInAction(() => {
      this.notifications = data || [];
      this.filteredNotifications = this.notifications;
    });

    // ✅ fetch all rule names once after loading events
    await this.fetchRuleNamesOnce();
  }

  // 🔹 Fetch all rule names for unique rule IDs
  async fetchRuleNamesOnce() {
    const ruleIds = [
      ...new Set(
        this.notifications
          .filter((n) => n.subject_type === "rule")
          .map((n) => n.subject_id)
      ),
    ];

    // Only fetch ones we don't already have cached
    const missingIds = ruleIds.filter((id) => !this.ruleNameCache[id]);
    if (missingIds.length === 0) return;

    const { data, error } = await supabase
      .from("rules")
      .select("id, name")
      .in("id", missingIds);

    if (error) {
      console.error("Error fetching rule names:", error);
      return;
    }

    runInAction(() => {
      data?.forEach((rule) => {
        this.ruleNameCache[rule.id] = rule.name;
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
          // ✅ Type is now fully known (NotificationLog)
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

        // ✅ fetch rule name only if it's a rule event
        if (
          newEvent.subject_type === "rule" &&
          !this.ruleNameCache[newEvent.subject_id]
        ) {
          const { data, error } = await supabase
            .from("rules")
            .select("id, name")
            .eq("id", newEvent.subject_id)
            .single();

          if (!error && data) {
            runInAction(() => {
              this.ruleNameCache[newEvent.subject_id] = data.name;
            });
          }
        }
      }
    )
    .subscribe((status) => {
      console.log("📡 Supabase channel status:", status);
    });
}

    clearSubscription() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
      console.log("🔌 Supabase realtime subscription cleared");
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
