const express = require("express");
const router = express.Router();
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // format: 'whatsapp:+14155238886'
const sosSecret = process.env.SOS_EXPATS_SECRET;

const client = twilio(accountSid, authToken);

router.post("/", async (req, res) => {
  const { to, body } = req.body;
  const incomingSecret = req.headers["x-sos-secret"];

  if (incomingSecret !== sosSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!to || !body) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const message = await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${to}`,
      body,
    });

    return res.status(200).json({ success: true, sid: message.sid });
  } catch (err) {
    console.error("❌ Twilio WhatsApp error:", err);
    return res.status(500).json({ error: "Twilio error", details: err.message });
  }
});

module.exports = router;
