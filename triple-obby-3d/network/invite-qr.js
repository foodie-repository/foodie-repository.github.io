(() => {
  function createInviteUrl(roomCode) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('room', roomCode);
    return url.toString();
  }

  async function renderInviteQr(canvas, url) {
    if (!canvas) return;
    if (!window.QRCode?.toCanvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('QR 로더 오류', canvas.width / 2, canvas.height / 2);
      return;
    }
    await window.QRCode.toCanvas(canvas, url, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#05070f', light: '#ffffff' },
    });
  }

  window.TripleObbyOnline = window.TripleObbyOnline || {};
  window.TripleObbyOnline.createInviteUrl = createInviteUrl;
  window.TripleObbyOnline.renderInviteQr = renderInviteQr;
})();
