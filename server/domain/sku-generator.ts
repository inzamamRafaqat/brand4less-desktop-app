import QRCode from 'qrcode';

export interface SkuParams {
  categoryName?: string;
  color?: string;
  size?: string;
  brand?: string;
  sequenceNumber?: number;
}

/**
 * Sanitize a string for clean SKU segment generation.
 */
function cleanSegment(str?: string, maxLen = 4): string {
  if (!str) return 'GEN';
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, maxLen) || 'GEN';
}

/**
 * Generates an internal unique SKU if the client does not provide one.
 * Example: B4L-TSH-BLK-M-1042
 */
export function generateInternalSku(params: SkuParams): string {
  const cat = cleanSegment(params.categoryName, 3);
  const col = cleanSegment(params.color, 3);
  const sz = cleanSegment(params.size, 3);
  const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
  const seq = params.sequenceNumber !== undefined ? `-${params.sequenceNumber}` : '';

  return `B4L-${cat}-${col}-${sz}-${entropy}${seq}`;
}

/**
 * Creates standardized QR Code content string for fast POS / mobile scanning.
 */
export function formatQrPayload(sku: string, sellingPrice: number, productName?: string): string {
  const safeName = (productName || '').replace(/\|/g, '');
  return `B4L|${sku}|${sellingPrice}|${safeName}`;
}

/**
 * Generates a base64 Data URL for a QR Code image.
 */
export async function generateQrDataUrl(qrPayload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR data URL:', err);
    return '';
  }
}
