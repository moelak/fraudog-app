import { makeAutoObservable, runInAction } from "mobx";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface TransactionLog {
  transaction_id: string;
  decision: string;
  decision_changed?: string | null;
  datetime: string;
  false_positive: boolean | null;
}

export class MonitoringStore {
  transactionLogs: TransactionLog[] = [];
  filteredLogs: TransactionLog[] = [];
  searchTerm = "";
  channel: RealtimeChannel | null = null;
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
    this.fetchThisWeekTransactions();
    this.subscribeToTransactionUpdates();
  }

  
async fetchThisWeekTransactions(organizationId?: string) {
  if (!organizationId) {
    console.warn("No organizationId provided to fetchThisWeekTransactions()");
    return;
  }

  runInAction(() => {
    this.isLoading = true; // 🔵 show spinner
  });

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 14);

    const { data, error } = await supabase
      .from("transaction_evaluations")
      .select("transaction_id, decision, decision_changed, decision_changed_at, created_at")
      .eq("organization_id", organizationId)
      .or(`created_at.gte.${oneWeekAgo.toISOString()},decision_changed_at.gte.${oneWeekAgo.toISOString()}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    runInAction(() => {
      const processed = (data || [])
        .map((r) => ({
          transaction_id: r.transaction_id,
          decision: r.decision,
          decision_changed: r.decision_changed,
          decision_changed_at: r.decision_changed_at,
          created_at: r.created_at,
          datetime: r.decision_changed_at || r.created_at,
          false_positive: r.decision_changed === "chargeback",
        }))
        .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

      this.transactionLogs = processed;
      this.filteredLogs = processed;
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
  } finally {
    runInAction(() => {
      this.isLoading = false; // 🟢 hide spinner
    });
  }
}


subscribeToTransactionUpdates() {
  this.channel = supabase
    .channel("realtime:transaction_evaluations")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "transaction_evaluations" },
      (payload) => {
        // 👇 Explicitly cast payload.new to your TransactionLog-like type
        const updated = payload.new as {
          transaction_id: string;
          decision: string;
          decision_changed?: string | null;
          decision_changed_at?: string | null;
          created_at?: string | null;
        };

        runInAction(() => {
          const updatedTx: TransactionLog = {
            transaction_id: updated.transaction_id,
            decision: updated.decision,
            decision_changed: updated.decision_changed,
            datetime: updated.decision_changed_at || updated.created_at || new Date().toISOString(),
            false_positive: updated.decision_changed === "chargeback",
          };

          // Remove existing transaction if present
          const existingIndex = this.transactionLogs.findIndex(
            (t) => t.transaction_id === updated.transaction_id
          );
          if (existingIndex >= 0) {
            this.transactionLogs.splice(existingIndex, 1);
          }

          // Add updated transaction to top
          this.transactionLogs.unshift(updatedTx);
          this.filteredLogs = [...this.transactionLogs];
        });
      }
    )
    .subscribe();
}



  applySearch(term: string) {
    this.searchTerm = term;
    const lower = term.toLowerCase();
    this.filteredLogs = this.transactionLogs.filter((tx) =>
      tx.transaction_id.toLowerCase().includes(lower) ||
      tx.decision.toLowerCase().includes(lower) ||
      (tx.decision_changed?.toLowerCase().includes(lower) ?? false)
    );
  }
}

export const monitoringStore = new MonitoringStore();
