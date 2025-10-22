import { makeAutoObservable, runInAction } from "mobx";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TransactionLog {
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

  constructor() {
    makeAutoObservable(this);
    this.fetchThisWeekTransactions();
    this.subscribeToTransactionUpdates();
  }

  async fetchThisWeekTransactions() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("transaction_evaluations")
      .select("transaction_id, decision, decision_changed, decision_changed_at, created_at")
      .or(`created_at.gte.${oneWeekAgo.toISOString()},decision_changed_at.gte.${oneWeekAgo.toISOString()}`)
      .order("created_at", { ascending: false }); 

    if (error) {
      console.error("Error fetching transactions:", error);
      return;
    }

    runInAction(() => {
      this.transactionLogs = data.map((r) => ({
        transaction_id: r.transaction_id,
        decision: r.decision,
        decision_changed: r.decision_changed,
        decision_changed_at: r.decision_changed_at,
        datetime: r.created_at,
        false_positive: r.decision_changed === "chargeback",
      }));
      this.filteredLogs = this.transactionLogs;
    });
  }

  subscribeToTransactionUpdates() {
    this.channel = supabase
      .channel("realtime:transaction_evaluations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transaction_evaluations" },
        (payload) => {
          const updated = payload.new;

          runInAction(() => {
        
          const existingIndex = this.transactionLogs.findIndex(
            // @ts-expect-error – suppress typing until Supabase payload type is defined
            (t) => t.transaction_id === updated.transaction_id
          );

          const updatedTx: TransactionLog = {
            // @ts-expect-error – Supabase realtime payload not typed yet
            transaction_id: updated.transaction_id,
           // @ts-expect-error – Supabase realtime payload not typed yet
            decision: updated.decision,
           // @ts-expect-error – Supabase realtime payload not typed yet
            decision_changed: updated.decision_changed,
            // @ts-expect-error – Supabase realtime payload not typed yet
            datetime: updated.created_at,
            // @ts-expect-error – Supabase realtime payload not typed yet
            false_positive: updated.decision_changed === "chargeback",
          };


            // Remove the old one (if exists) and bring this to top
            if (existingIndex >= 0) {
              this.transactionLogs.splice(existingIndex, 1);
            }
            this.transactionLogs.unshift(updatedTx);
            this.applySearch(this.searchTerm);
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
