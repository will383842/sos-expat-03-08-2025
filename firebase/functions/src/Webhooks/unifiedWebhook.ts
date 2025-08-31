import { onRequest } from 'firebase-functions/v2/https';
import { Request, Response } from 'express';
import { twilioCallWebhook, twilioConferenceWebhook, twilioRecordingWebhook } from '../Webhooks/twilioWebhooks';

export const unifiedWebhook = onRequest(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1},
  async (req: Request, res: Response) => {
    const path = (req.path || '').toLowerCase();
    const body = (req as any).body || {};

    const isRecording = path.includes('record') || 'RecordingSid' in body || 'RecordingUrl' in body;
    const isConference = path.includes('conference') || 'ConferenceSid' in body || 'ConferenceName' in body;

    if (isRecording) {
      return (twilioRecordingWebhook as any)(req, res);
    } else if (isConference) {
      return (twilioConferenceWebhook as any)(req, res);
    } else {
      return (twilioCallWebhook as any)(req, res);
    }
  }
);
