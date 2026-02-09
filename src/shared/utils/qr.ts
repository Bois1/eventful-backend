import QRCode from 'qrcode';

export async function generateQRCode(data: string, options: { 
  width?: number; 
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' 
} = {}): Promise<string> {
  const { width = 400, errorCorrectionLevel = 'H' } = options;

  const qrBuffer = await QRCode.toBuffer(data, {
    width,
    errorCorrectionLevel,
    margin: 2
  });

  return `image/png;base64,${qrBuffer.toString('base64')}`;
}