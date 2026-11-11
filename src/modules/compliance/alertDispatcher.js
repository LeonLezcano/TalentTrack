/**
 * TalentTrack Real Alert Dispatcher & WhatsApp / Web Notifications (AiAppFactory Standard)
 * Generates direct wa.me messaging URLs for drivers/workers and dispatches browser desktop notifications.
 */

export class AlertDispatcher {
  /**
   * Generates a direct WhatsApp link to alert a worker about expiring credentials.
   * @param {Object} employee 
   * @param {Object} alert 
   * @param {string} companyName 
   * @returns {string} Safe WhatsApp Web URL
   */
  static generateWhatsAppAlertUrl(employee, alert, companyName = 'Recursos Humanos') {
    if (!employee || !employee.phone) return '';

    // Sanitizar teléfono a formato internacional (+54 9 ...)
    let cleanPhone = String(employee.phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('15')) cleanPhone = cleanPhone.substring(2);
    if (!cleanPhone.startsWith('549') && !cleanPhone.startsWith('54')) {
      cleanPhone = `549${cleanPhone}`;
    }

    const firstName = employee.firstName || 'Colaborador';
    const docName = alert.credentialLabel || 'Habilitación / Carnet';
    const expDate = alert.formattedDate;
    const days = alert.daysRemaining;

    let urgencyText = `vence en ${days} días`;
    if (days < 0) urgencyText = `se encuentra VENCIDO hace ${Math.abs(days)} días`;
    if (days === 0) urgencyText = `VENCE HOY`;

    const message = `Hola ${firstName}, te contactamos desde ${companyName}. Te recordamos que tu ${docName} ${urgencyText} (Fecha de vencimiento: ${expDate}). Por favor, acércate a RRHH o gestiona el turno de renovación a la brevedad para mantener tu legajo y habilitación operativa al día. Muchas gracias.`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Requests permission and dispatches native browser desktop notifications.
   * @param {string} title 
   * @param {string} body 
   */
  static async dispatchBrowserNotification(title, body) {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    try {
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: './manifest.json',
          badge: './manifest.json'
        });
        return true;
      }
    } catch (err) {
      console.warn('⚠️ [AlertDispatcher] Notificación no admitida o bloqueada:', err.message);
    }
    return false;
  }
}
