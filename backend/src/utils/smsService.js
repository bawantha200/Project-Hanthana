// backend/src/utils/smsService.js
const twilio = require('twilio');

let client = null;

function getClient() {
  if (client) return client;

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ [smsService] Twilio credentials not set — SMS disabled.');
    return null;
  }

  client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client;
}

function toInternationalFormat(localNumber) {
  if (!localNumber) return null;
  const cleaned = localNumber.replace(/\D/g, '');
  if (cleaned.startsWith('94')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+94${cleaned.slice(1)}`;
  return `+94${cleaned}`;
}

async function sendSMS({ toPhone, message }) {
  const activeClient = getClient();
  if (!activeClient || !toPhone) {
    console.warn('⚠️ [smsService] Skipping SMS — no client or phone number.');
    return;
  }

  const formattedPhone = toInternationalFormat(toPhone);

  try {
    const result = await activeClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });
    console.log(`📱 [smsService] SMS sent to ${formattedPhone}, SID: ${result.sid}`);
  } catch (err) {
    console.error('❌ [smsService] Failed to send SMS:', err.message);
  }
}

module.exports = { sendSMS };