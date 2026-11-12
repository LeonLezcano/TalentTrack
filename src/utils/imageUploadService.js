/**
 * ImageUploadService - Servicio Unificado de Almacenamiento en la Nube
 * Soporte Multi-Proveedor: Cloudinary (Principal) con Conmutación Suave (Failover) a ImgBB.
 * Incluye optimización y redimensionado preventivo a 1920x1080 (Full HD) en el cliente
 * para preservar ancho de banda y garantizar el consumo mínimo de créditos gratuitos.
 * 
 * ⚠️ RECORDATORIO AUDITORÍA: Credenciales temporales para entorno de pruebas.
 * Deben ser reemplazadas por cuentas corporativas definitivas antes de producción.
 */

export const ImageUploadService = {
  // Configuración de Cuentas Provisorias de Prueba
  config: {
    cloudinary: {
      cloudName: 'ebfnvo2l',
      uploadPreset: 'qm_preset' // Preset unsigned si está configurado
    },
    imgbb: {
      apiKey: '38bd25c1dbba4f07fbc3e87f8f43f382'
    },
    limits: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85
    }
  },

  /**
   * Redimensiona y optimiza una imagen a máximo 1920x1080px preservando aspect ratio.
   * Si corre en entorno sin DOM/Canvas (ej. tests en Node), devuelve el buffer original sin fallar.
   * 
   * @param {string} dataUrl - Cadena DataURL original
   * @returns {Promise<string>} DataURL redimensionado y optimizado
   */
  async optimizeImage(dataUrl) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return dataUrl;
    }

    // Si es un PDF o documento, no redimensionar con Canvas
    if (dataUrl.startsWith('data:application/pdf')) {
      return dataUrl;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const { maxWidth, maxHeight, quality } = this.config.limits;

        if (width <= maxWidth && height <= maxHeight) {
          return resolve(dataUrl);
        }

        const ratio = Math.min(maxWidth / width, maxHeight / height);
        const targetWidth = Math.round(width * ratio);
        const targetHeight = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        // Fondo blanco para evitar fondos negros en transparencias
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Exportar a JPEG de alta fidelidad optimizado
        const optimizedUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedUrl);
      };

      img.onerror = () => {
        console.warn('⚠️ [ImageUpload] No se pudo cargar imagen para redimensionar, usando original.');
        resolve(dataUrl);
      };

      img.src = dataUrl;
    });
  },

  /**
   * Sube una imagen (DataURL o File/Blob) optimizándola previamente a 1920x1080.
   * Intenta Cloudinary y en caso de error recurre a ImgBB.
   * Si ambos fallan o no hay conexión, preserva el DataURL local.
   * 
   * @param {File|Blob|string} imageInput - Archivo o DataURL en base64
   * @param {string} fileName - Nombre identificador del archivo
   * @returns {Promise<{url: string, provider: 'cloudinary'|'imgbb'|'local', success: boolean}>}
   */
  async uploadImage(imageInput, fileName = 'comprobante') {
    let rawBase64 = null;

    if (typeof imageInput === 'string') {
      rawBase64 = imageInput;
    } else if (imageInput && typeof imageInput === 'object') {
      rawBase64 = await this._fileToDataURL(imageInput);
    } else {
      throw new Error('Formato de imagen no soportado');
    }

    // Optimizar a máximo 1920x1080 antes del envío
    const base64Data = await this.optimizeImage(rawBase64);

    // 1. Intento con Cloudinary (Principal)
    try {
      const cloudRes = await this._uploadToCloudinary(base64Data, fileName);
      if (cloudRes && cloudRes.secure_url) {
        return {
          url: cloudRes.secure_url,
          provider: 'cloudinary',
          success: true
        };
      }
    } catch (cErr) {
      console.warn('⚠️ [ImageUpload] Falló proveedor principal Cloudinary, activando fallback ImgBB:', cErr?.message || cErr);
    }

    // 2. Intento con ImgBB (Fallback de Contingencia)
    try {
      const imgbbRes = await this._uploadToImgbb(base64Data, fileName);
      if (imgbbRes && imgbbRes.url) {
        return {
          url: imgbbRes.url,
          provider: 'imgbb',
          success: true
        };
      }
    } catch (iErr) {
      console.warn('⚠️ [ImageUpload] Falló proveedor secundario ImgBB:', iErr?.message || iErr);
    }

    // 3. Resiliencia Offline-First: Preservar DataURL local
    console.info('💡 [ImageUpload] Persistiendo imagen localmente como respaldo offline.');
    return {
      url: base64Data,
      provider: 'local',
      success: true,
      isLocalFallback: true
    };
  },

  /**
   * Subida a Cloudinary
   */
  async _uploadToCloudinary(base64Data, fileName) {
    const { cloudName, uploadPreset } = this.config.cloudinary;
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', base64Data);
    if (uploadPreset) {
      formData.append('upload_preset', uploadPreset);
    }
    formData.append('public_id', `${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}`);

    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudinary HTTP ${res.status}: ${errText}`);
    }

    return await res.json();
  },

  /**
   * Subida a ImgBB con parámetro name obligatorio
   */
  async _uploadToImgbb(base64Data, fileName) {
    const { apiKey } = this.config.imgbb;
    const url = 'https://api.imgbb.com/1/upload';

    const cleanBase64 = base64Data.includes('base64,') 
      ? base64Data.split('base64,')[1] 
      : base64Data;

    const body = new URLSearchParams();
    body.append('key', apiKey);
    body.append('image', cleanBase64);
    body.append('name', fileName.replace(/[^a-zA-Z0-9_-]/g, '_'));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ImgBB HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error(data.error?.message || 'Error en respuesta de ImgBB');
    }

    return {
      url: data.data.url || data.data.display_url
    };
  },

  _fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Error al leer el archivo local'));
      reader.readAsDataURL(file);
    });
  }
};
