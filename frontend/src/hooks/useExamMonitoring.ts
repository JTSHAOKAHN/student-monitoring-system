'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { MonitoringEventPayload, MonitoringEventType } from '@/lib/types';

interface UseExamMonitoringOptions {
  sessionId: string | null;
  enabled: boolean;
  questionIndex?: number;
}

export function useExamMonitoring({ sessionId, enabled, questionIndex = 0 }: UseExamMonitoringOptions) {
  const queueRef = useRef<MonitoringEventPayload[]>([]);
  const lastActivityRef = useRef(Date.now());
  const tabHiddenAtRef = useRef<number | null>(null);
  const questionIndexRef = useRef(questionIndex);

  questionIndexRef.current = questionIndex;

  const flush = useCallback(async () => {
    if (!sessionId || queueRef.current.length === 0) {
      return;
    }

    const batch = [...queueRef.current];
    queueRef.current = [];

    await fetch('/api/monitoring/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, events: batch }),
    });
  }, [sessionId]);

  const track = useCallback(
    (eventType: MonitoringEventType, details?: Record<string, unknown>) => {
      if (!enabled || !sessionId) {
        return;
      }

      queueRef.current.push({
        event_type: eventType,
        details: { ...details, questionIndex: questionIndexRef.current },
        created_at: new Date().toISOString(),
      });

      if (queueRef.current.length >= 5) {
        void flush();
      }
    },
    [enabled, sessionId, flush]
  );

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    track('exam_started');

    const onVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenAtRef.current = Date.now();
        track('tab_switch', { action: 'left' });
        track('window_blur');
      } else {
        const duration = tabHiddenAtRef.current ? Math.round((Date.now() - tabHiddenAtRef.current) / 1000) : 0;
        tabHiddenAtRef.current = null;
        track('window_focus');
        if (duration > 0) {
          track('tab_switch', { action: 'returned', durationSeconds: duration });
        }
      }
    };

    const onBlur = () => track('window_blur');
    const onFocus = () => track('window_focus');
    const onCopy = () => track('copy_attempt');
    const onPaste = () => track('paste_attempt');
    const onContextMenu = (e: Event) => {
      e.preventDefault();
      track('right_click');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        track('keyboard_shortcut', { key: e.key });
      }
      lastActivityRef.current = Date.now();
    };
    const onClick = () => {
      track('mouse_click');
      lastActivityRef.current = Date.now();
    };
    const onResize = () => track('window_resize', { width: window.innerWidth, height: window.innerHeight });
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      track('refresh_attempt');
      void flush();
      e.preventDefault();
    };
    const onOffline = () => track('internet_disconnect');
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        track('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('offline', onOffline);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const idleInterval = setInterval(() => {
      const idleSeconds = Math.round((Date.now() - lastActivityRef.current) / 1000);
      if (idleSeconds >= 30) {
        track('idle', { durationSeconds: idleSeconds });
        lastActivityRef.current = Date.now();
      }
    }, 15000);

    const flushInterval = setInterval(() => void flush(), 10000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      clearInterval(idleInterval);
      clearInterval(flushInterval);
      void flush();
    };
  }, [enabled, sessionId, track, flush]);

  return { track, flush };
}
