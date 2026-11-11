/**
 * TalentTrack Digital Signature Canvas & Cryptographic Hashing
 * Captures touch/stylus/mouse signatures with forensic timestamp & SHA-256 integrity hash.
 */

export class DigitalSignaturePad {
  /**
   * @param {HTMLCanvasElement} canvas 
   * @param {Object} options 
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.strokeColor = options.strokeColor || '#0f172a';
    this.lineWidth = options.lineWidth || 2.5;
    this.isDrawing = false;
    this.pointsCount = 0;

    if (this.canvas) {
      this._init();
    }
  }

  _init() {
    this.canvas.style.touchAction = 'none';
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const start = (e) => {
      this.isDrawing = true;
      const pos = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
      this.pointsCount++;
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.pointsCount++;
    };

    const stop = () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.ctx.closePath();
      }
    };

    this.canvas.addEventListener('pointerdown', start);
    this.canvas.addEventListener('pointermove', draw);
    this.canvas.addEventListener('pointerup', stop);
    this.canvas.addEventListener('pointerleave', stop);
    this.canvas.addEventListener('pointercancel', stop);
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.pointsCount = 0;
  }

  isEmpty() {
    return this.pointsCount < 5;
  }

  toDataURL(type = 'image/png') {
    if (!this.canvas) return '';
    return this.canvas.toDataURL(type);
  }

  /**
   * Generates a lightweight SHA-256 hash representation of signature bytes + timestamp.
   * @param {string} dataUrl 
   * @param {string} signerName 
   * @param {string} timestamp 
   * @returns {Promise<string>}
   */
  static async computeForensicHash(dataUrl, signerName, timestamp) {
    const rawData = `${signerName}|${timestamp}|${dataUrl}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawData);
    
    // Si CryptoSubtle está disponible (navegador o Node 19+)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback matemático no bloqueante
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      const char = rawData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'sig-hash-' + Math.abs(hash).toString(16).padStart(16, '0');
  }
}
