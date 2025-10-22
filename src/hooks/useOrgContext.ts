import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase";
import { ruleManagementStore } from "./useRuleManagementStore";

export function useOrgContext() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchOrg = async () => {
      const { data } = await supabase
        .from('organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setOrgId(data.organization_id);
        ruleManagementStore.setOrganizationId(data.organization_id);
      }
    };

    fetchOrg();
  }, [user?.id]);

  return orgId;
}
