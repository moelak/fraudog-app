import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function RealtimeTest() {
  useEffect(() => {
    const test = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log('📦 Supabase session:', session);

      const channel = supabase
        .channel('debug_rules_channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rules',
          },
          (payload) => {
            console.log('⚡ Realtime event received:', payload);
          }
        )
        .on('error', (err) => {
          console.error('❌ Realtime subscription error:', err);
        })
        .on('close', () => {
          console.warn('⚠️ Realtime channel closed');
        });

      await channel
        .subscribe((status) => {
          console.log('📡 Subscription status:', status); // Should be "SUBSCRIBED"
        })
        .catch((err) => {
          console.error('❌ Subscribe failed:', err);
        });
    };

    test();
  }, []);

  return <div className="p-6 text-lg">✅ Realtime Test Running (check your console)</div>;
}
