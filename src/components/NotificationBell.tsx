import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Notif = {
  id: string;
  user_id: string;
  title: string;
  body?: string | null;
  type?: 'system' | 'announcement' | 'billing' | 'enrollment' | 'document' | string | null;
  meta?: any;
  read_at?: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const mounted = useRef(true);

  const unread = items.filter(n => !n.read_at).length;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifs = async () => {
      const { data, error } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && mounted.current) setItems((data || []) as Notif[]);
    };

    fetchNotifs();

    // realtime subscription
    const channel = (supabase as any)
      .channel(`rt-notifs-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const row = (payload.new || payload.old) as Notif;
          if (!mounted.current) return;

          setItems(prev => {
            switch (payload.eventType) {
              case 'INSERT': return [row, ...prev].slice(0, 20);
              case 'UPDATE': return prev.map(n => (n.id === row.id ? row : n));
              case 'DELETE': return prev.filter(n => n.id !== row.id);
              default: return prev;
            }
          });
        }
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    const ids = items.filter(n => !n.read_at).map(n => n.id);
    if (ids.length === 0) return;

    const now = new Date().toISOString();
    // optimistic UI
    setItems(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: now })));
    await (supabase as any)
      .from('notifications')
      .update({ read_at: now })
      .in('id', ids);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-600 px-1.5 text-center text-[11px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <span className="text-sm font-medium">Notifications</span>
            <button className="text-xs text-primary hover:underline" onClick={markAllRead}>
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">You're all caught up!</div>
            ) : (
              items.map(n => (
                <div key={n.id} className={`border-b p-3 ${!n.read_at ? 'bg-muted/50' : ''}`}>
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="mt-1 text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
