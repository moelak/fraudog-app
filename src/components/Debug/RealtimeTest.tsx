import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function RealtimeTest() {
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log('📦 Supabase session:', session);

      // 🔁 Remove existing channel before creating a new one
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

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

      subscriptionRef.current = channel;

      // ✅ CORRECT way to subscribe
      channel.subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
    };

    setupRealtime();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, []);

  return <div className="p-6 text-lg">✅ Realtime Test Running (check console)</div>;
}
