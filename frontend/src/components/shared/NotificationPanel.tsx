'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationPanel({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    }
    void load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative rounded-full border px-3 py-2 text-sm shadow-sm ${
          dark
            ? 'border-white/10 bg-slate-900 text-slate-200 hover:bg-slate-800'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        🔔 Notifications
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-xs text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-medium text-slate-800">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-violet-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">No notifications</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id} className={`border-b border-slate-50 px-4 py-3 ${!n.is_read ? 'bg-violet-50/50' : ''}`}>
                  {n.link ? (
                    <Link href={n.link} onClick={() => setOpen(false)} className="block">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                    </Link>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
