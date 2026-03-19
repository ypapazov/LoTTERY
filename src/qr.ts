import qrcode from 'qrcode-generator';

export function renderQRCode(data: string, container: HTMLElement, cellSize = 4): void {
  const qr = qrcode(0, 'M');
  qr.addData(data);
  qr.make();

  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = qr.createDataURL(cellSize, 0);
  img.alt = 'QR code containing commitment data';
  img.className = 'qr-code';
  container.appendChild(img);
}

export function renderQRCodeLarge(data: string, container: HTMLElement): void {
  renderQRCode(data, container, 8);
}
