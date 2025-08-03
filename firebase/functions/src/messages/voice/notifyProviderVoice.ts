import { buildVoiceMessage } from './buildVoiceMessage';
import { twilioClient } from '../../lib/twilio';


export async function notifyProviderVoice(to: string, text: string) {
 await twilioClient.calls.create({
    twiml: buildVoiceMessage(text),
    to,
    from: process.env.TWILIO_PHONE_NUMBER!
  });
}