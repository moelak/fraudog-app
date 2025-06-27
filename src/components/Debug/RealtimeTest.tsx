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

      if (!session?.access_token) {
        console.warn('⚠️ No valid session for realtime');
        return;
      }

      // Clean up existing channel
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
        );

      subscriptionRef.current = channel;

      const { error, status } = await channel.subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

      if (error) {
        console.error('❌ Subscription error:', error);
      }
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
