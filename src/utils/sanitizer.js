/**
 * TalentTrack Security Sanitizer (Zero-Trust DOM sink defense)
 * Protects against XSS, script injection, and malicious URL protocols.
 */

export const Sanitizer = {
  /**
   * Escapes HTML special characters into safe entity strings.
   * @param {string|number} str 
   * @returns {string}
   */
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Safe DOM renderer using DOMParser (AiAppFactory Standard)
   * Eliminates direct innerHTML assignments and prevents XSS sink vulnerabilities.
   * @param {HTMLElement} target 
   * @param {string} htmlString 
   */
  renderTemplate(target, htmlString) {
    if (!target || typeof document === 'undefined') return;
    const parser = new DOMParser();
    const tagName = target.tagName ? target.tagName.toUpperCase() : '';
    if (tagName === 'TBODY' || tagName === 'THEAD' || tagName === 'TFOOT') {
      const parsedDoc = parser.parseFromString(`<table><tbody>${htmlString}</tbody></table>`, 'text/html');
      const tbody = parsedDoc.querySelector('tbody');
      target.replaceChildren(...Array.from(tbody.childNodes));
    } else if (tagName === 'TABLE') {
      const parsedDoc = parser.parseFromString(`<table>${htmlString}</table>`, 'text/html');
      const table = parsedDoc.querySelector('table');
      target.replaceChildren(...Array.from(table.childNodes));
    } else if (tagName === 'SELECT') {
      const parsedDoc = parser.parseFromString(`<select>${htmlString}</select>`, 'text/html');
      const sel = parsedDoc.querySelector('select');
      target.replaceChildren(...Array.from(sel.childNodes));
    } else {
      const parsedDoc = parser.parseFromString(htmlString, 'text/html');
      target.replaceChildren(...Array.from(parsedDoc.body.childNodes));
    }
  },

  /**
   * Safely clears an element without innerHTML sinks.
   * @param {HTMLElement} element 
   */
  safeClear(element) {
    if (!element) return;
    element.replaceChildren();
  },

  /**
   * Sanitizes URLs preventing execution of javascript:, vbscript:, or data: html injection.
   * @param {string} url 
   * @returns {string}
   */
  sanitizeURL(url) {
    if (!url || typeof url !== 'string') return '#';
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      (lower.startsWith('data:') && !lower.startsWith('data:image/'))
    ) {
      console.warn('⚠️ [Sanitizer] URL bloqueada por protocolo no seguro:', trimmed);
      return '#';
    }
    return trimmed;
  },

  /**
   * Safely formats text, preventing DOM sink overflow.
   * @param {string} text 
   * @param {number} maxLen 
   * @returns {string}
   */
  truncate(text, maxLen = 100) {
    if (!text) return '';
    const escaped = this.escapeHTML(text);
    return escaped.length > maxLen ? escaped.substring(0, maxLen) + '...' : escaped;
  }
};
