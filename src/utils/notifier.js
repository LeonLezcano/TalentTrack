/**
 * TalentTrack Notification System & Mobile Screen WakeLock (AiAppFactory Standard)
 * Provides toast alerts, status badges, and Screen Wake Lock API auto-recovery.
 */

export class Notifier {
  /**
   * Displays an interactive toast notification.
   * @param {string} message 
   * @param {'success'|'warning'|'danger'|'info'} [type='info']
   * @param {number} [durationMs=4000]
   */
  static showToast(message, type = 'info', durationMs = 4000) {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all transform translate-y-4 opacity-0 border';

    let colorStyles = 'bg-slate-900 text-white border-slate-700';
    let icon = 'ℹ️';

    if (type === 'success') {
      colorStyles = 'bg-emerald-900 text-emerald-100 border-emerald-700';
      icon = '✅';
    } else if (type === 'warning') {
      colorStyles = 'bg-amber-900 text-amber-100 border-amber-700';
      icon = '⚠️';
    } else if (type === 'danger') {
      colorStyles = 'bg-rose-900 text-rose-100 border-rose-700';
      icon = '🚨';
    }

    toast.className += ` ${colorStyles}`;
    toast.textContent = `${icon} ${message}`;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, durationMs);
  }

  /**
   * Screen Wake Lock API (Mandatory for field/driving roles)
   * Auto-reengages when returning from background (visibilitychange).
   */
  static initScreenWakeLock() {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      console.log('ℹ️ [WakeLock] Screen Wake Lock API no soportado en este entorno.');
      return;
    }

    let wakeLockSentinel = null;

    const requestLock = async () => {
      try {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        console.log('💡 [WakeLock] Pantalla activa fijada para rol operativo.');
        wakeLockSentinel.addEventListener('release', () => {
          console.log('💡 [WakeLock] Bloqueo de pantalla liberado.');
        });
      } catch (err) {
        console.warn('⚠️ [WakeLock] No se pudo solicitar wake lock:', err.message);
      }
    };

    requestLock();

    // Re-enganche obligatorio al volver a la pestaña
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
          requestLock();
        }
      });
    }
  }
}
