// routes/twoFactor.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// STEP 1: Generate secret + QR code
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `HanthanaWater (${req.user.email})`,
  });

  await db.query(
    'UPDATE users SET two_factor_temp_secret = ? WHERE id = ?',
    [secret.base32, req.user.id]
  );

  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
  res.json({ qrCodeUrl, secret: secret.base32 });
});

// STEP 2: Verify the code user entered from their authenticator app
router.post('/2fa/verify-setup', authenticateToken, async (req, res) => {
  const { token } = req.body;
  const user = await db.query('SELECT two_factor_temp_secret FROM users WHERE id = ?', [req.user.id]);

  const verified = speakeasy.totp.verify({
    secret: user.two_factor_temp_secret,
    encoding: 'base32',
    token,
    window: 1, // 30sec ±1 clock drift allow
  });

  if (!verified) return res.status(400).json({ error: 'Invalid code' });

  await db.query(
    'UPDATE users SET two_factor_secret = two_factor_temp_secret, two_factor_enabled = TRUE, two_factor_temp_secret = NULL WHERE id = ?',
    [req.user.id]
  );

  res.json({ success: true });
});