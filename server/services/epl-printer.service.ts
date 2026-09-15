import net from 'net';

export interface EplLabelItem {
  name: string;
  categoryName?: string;
  color?: string;
  size?: string;
  sellingPrice: number;
  sku: string;
  barcode: string;
  quantity?: number;
}

export interface EplPrintOptions {
  widthMm?: number;
  heightMm?: number;
  gapMm?: number;
  densityDpi?: number;
  storeName?: string;
}

/**
 * Dedicated EPL2 (Eltron Programming Language) Command Generator
 * Fully supported by virtual-printer.online EPL emulation and TSC TSPL-EZ firmware.
 */
export class EplPrinterService {
  /**
   * Generates native EPL2 command sequence
   * 203 DPI standard: 1mm = 8 dots (50mm = 400 dots, 30mm = 240 dots)
   */
  static generateEpl(items: EplLabelItem[], options: EplPrintOptions = {}): string {
    const dpi = options.densityDpi || 203;
    const dotsPerMm = dpi / 25.4; // ~8 dots/mm
    const widthDots = Math.round((options.widthMm || 50) * dotsPerMm); // 400 dots
    const heightDots = Math.round((options.heightMm || 30) * dotsPerMm); // 240 dots
    const gapDots = Math.round((options.gapMm || 2) * dotsPerMm); // 16 dots
    const store = (options.storeName || 'BRAND 4 LESS').toUpperCase();

    let commands = '';

    items.forEach((item) => {
      const code = (item.barcode || item.sku || '000000').trim().toUpperCase();
      const title = (item.name || 'Apparel').substring(0, 22);
      const attr = [item.color || '', item.size ? `Size: ${item.size}` : ''].filter(Boolean).join(' | ');
      const qty = Math.max(1, item.quantity || 1);

      // EPL2 Header
      commands += '\nN\n'; // Clear image buffer
      commands += `q${widthDots}\n`; // Set label width in dots
      commands += `Q${heightDots},${gapDots}\n`; // Set label height and gap
      commands += 'D8\n'; // Density / darkness (0-15)
      commands += 'S3\n'; // Print speed
      commands += 'ZB\n'; // Print direction top to bottom

      // 1. Store Header & Category
      commands += `A15,10,0,3,1,1,N,"${store}"\n`;
      if (item.categoryName) {
        commands += `A240,12,0,2,1,1,N,"${item.categoryName.toUpperCase().substring(0, 12)}"\n`;
      }

      // 2. Product Name
      commands += `A15,36,0,3,1,1,N,"${title}"\n`;

      // 3. Variant Attributes
      if (attr) {
        commands += `A15,60,0,2,1,1,N,"${attr}"\n`;
      }

      // 4. Code 128 Barcode: Bp1,p2,p3,p4,p5,p6,p7,p8,"DATA"
      // p1=15, p2=85, p3=0 (rotation), p4=1 (Code 128 Auto), p5=2 (narrow), p6=4 (wide), p7=48 (height), p8=B (human readable)
      commands += `B15,85,0,1,2,4,48,B,"${code}"\n`;

      // 5. Price and SKU
      commands += `A15,160,0,3,1,1,N,"PKR ${Number(item.sellingPrice).toLocaleString()}"\n`;
      commands += `A240,162,0,2,1,1,N,"${item.sku}"\n`;

      // 6. Print command: P<copies>,<sets>
      commands += `P${qty},1\n`;
    });

    return commands;
  }
}

async function sendEplToVirtualPrinter(host = 'virtual-printer.online', port = 9511) {
  console.log(`Connecting to ${host}:${port} (EPL Emulation)...`);

  const testItems: EplLabelItem[] = [
    {
      name: 'Men Slim Denim Jeans',
      categoryName: 'Denim',
      color: 'Dark Blue',
      size: '32/34',
      sellingPrice: 2499,
      sku: 'B4L-DNM-32-BLU',
      barcode: '8901234567890',
      quantity: 1,
    },
  ];

  const epl = EplPrinterService.generateEpl(testItems, {
    widthMm: 50,
    heightMm: 30,
    gapMm: 2,
  });

  const buffer = Buffer.from(epl, 'ascii');

  return new Promise<void>((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(5000);

    client.connect(port, host, () => {
      console.log(`✅ Connected to ${host}:${port}!`);
      console.log(`📡 Transmitting ${buffer.length} bytes of raw EPL2 label commands...`);
      console.log('--- EPL Payload ---\n' + epl + '\n-------------------');
      client.write(buffer, () => {
        console.log(`🎉 EPL barcode label successfully transmitted to ${host}:${port}!`);
        client.end();
        resolve();
      });
    });

    client.on('error', (err) => {
      console.error(`❌ Connection failed to ${host}:${port}: ${err.message}`);
      reject(err);
    });

    client.on('timeout', () => {
      console.error(`⏱️ Connection timed out to ${host}:${port}`);
      client.destroy();
      reject(new Error('Timeout'));
    });
  });
}

const host = process.argv[2] || 'virtual-printer.online';
const port = parseInt(process.argv[3] || '9511', 10);

if (process.argv[1]?.includes('test-epl')) {
  sendEplToVirtualPrinter(host, port).catch(() => {
    process.exit(1);
  });
}
