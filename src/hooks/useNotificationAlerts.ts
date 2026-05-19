import { useCallback, useEffect, useState } from 'react';

interface UseNotificationAlertsOptions {
  soundEnabled?: boolean;
}

/**
 * Hook for managing browser notifications and sound alerts.
 * Handles permission requests and provides methods to trigger alerts.
 */
export function useNotificationAlerts(options: UseNotificationAlertsOptions = {}) {
  const { soundEnabled = true } = options;
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Initialize audio context on first user interaction
  const initAudio = useCallback(() => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      return ctx;
    }
    return audioContext;
  }, [audioContext]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied' as NotificationPermission;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // Play a notification sound using Web Audio API (respects soundEnabled preference)
  const playSound = useCallback((type: 'info' | 'warning' | 'critical' = 'info') => {
    // Skip if sounds are disabled
    if (!soundEnabled) return;

    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different sound patterns for different alert types
      switch (type) {
        case 'critical':
          // Urgent double beep
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          oscillator.frequency.setValueAtTime(0, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialDecayTo?.(0.01, ctx.currentTime + 0.3) ||
            gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'warning':
          // Medium tone
          oscillator.frequency.setValueAtTime(660, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'info':
        default:
          // Soft chime
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, [initAudio, soundEnabled]);

  // Show a browser notification
  const showBrowserNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!('Notification' in window)) return;

      if (permission === 'granted') {
        const notification = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        return notification;
      } else if (permission === 'default') {
        // Request permission first
        requestPermission().then((result) => {
          if (result === 'granted') {
            showBrowserNotification(title, options);
          }
        });
      }
    },
    [permission, requestPermission]
  );

  // Combined alert for critical notifications
  const triggerCriticalAlert = useCallback(
    (title: string, message: string) => {
      playSound('critical');
      showBrowserNotification(title, {
        body: message,
        tag: 'critical-alert',
        requireInteraction: true,
      });
    },
    [playSound, showBrowserNotification]
  );

  // Combined alert for warning notifications
  const triggerWarningAlert = useCallback(
    (title: string, message: string) => {
      playSound('warning');
      showBrowserNotification(title, {
        body: message,
        tag: 'warning-alert',
      });
    },
    [playSound, showBrowserNotification]
  );

  // Combined alert for info notifications
  const triggerInfoAlert = useCallback(
    (title: string, message: string) => {
      playSound('info');
      // Info alerts don't show browser notifications to avoid being intrusive
    },
    [playSound]
  );

  return {
    permission,
    requestPermission,
    playSound,
    showBrowserNotification,
    triggerCriticalAlert,
    triggerWarningAlert,
    triggerInfoAlert,
  };
}
