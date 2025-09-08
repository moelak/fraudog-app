import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useColumns() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchColumns = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Find the org ID for this user
        const { data: orgRow, error: orgErr } = await supabase
          .from('organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (orgErr || !orgRow) throw orgErr || new Error('Organization not found for user');
        const orgId = orgRow.organization_id as string;
        setOrganizationId(orgId);

        // 2. Fetch columns for that org
        const { data, error } = await supabase
          .from('organizations_column')
          .select('column_name')
          .eq('organization_id', orgId);

        if (error) throw error;

        setColumns((data || []).map((row) => row.column_name));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch columns');
      } finally {
        setLoading(false);
      }
    };

    fetchColumns();
  }, [user?.id]);

  return { columns, loading, error, organizationId };
}
