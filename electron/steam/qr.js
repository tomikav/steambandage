// Login con QR: la app de Steam del celular aprueba el inicio de sesión.
// SteamBandage nunca ve la contraseña; Steam solo le entrega un refresh token.
const { EventEmitter } = require('events');
const { LoginSession, EAuthTokenPlatformType } = require('steam-session');
const QRCode = require('qrcode');

const QR_LIFETIME = 120 * 1000; // al vencer se genera otro QR solo

class QrLogin extends EventEmitter {
  constructor() {
    super();
    this.session = null;
    this.active = false;
  }

  async start() {
    this.cancel();
    this.active = true;
    const session = new LoginSession(EAuthTokenPlatformType.SteamClient);
    this.session = session;
    session.loginTimeout = QR_LIFETIME;

    session.on('remoteInteraction', () => this.emit('scanned'));
    session.on('authenticated', () => {
      if (this.session !== session) return;
      this.active = false;
      this.emit('done', { accountName: session.accountName, refreshToken: session.refreshToken });
    });
    session.on('timeout', () => { if (this.session === session && this.active) this.start(); });
    session.on('error', (err) => {
      if (this.session !== session) return;
      this.active = false;
      this.emit('error', err);
    });

    try {
      const { qrChallengeUrl } = await session.startWithQR();
      if (this.session !== session) return;
      // Negro puro sobre blanco, margen de 4 módulos y corrección L (módulos más grandes):
      // es lo que mejor lee el escáner de la app de Steam.
      const svg = await QRCode.toDataURL(qrChallengeUrl, {
        margin: 4, errorCorrectionLevel: 'L', scale: 12,
        color: { dark: '#000000ff', light: '#ffffffff' },
      });
      this.emit('qr', { svg, expiresAt: Date.now() + QR_LIFETIME });
    } catch (err) {
      if (this.session !== session) return;
      this.active = false;
      this.emit('error', err);
    }
  }

  cancel() {
    this.active = false;
    const s = this.session;
    this.session = null;
    if (s) {
      s.removeAllListeners();
      s.on('error', () => {});
      try { s.cancelLoginAttempt(); } catch {}
    }
  }
}

module.exports = QrLogin;
