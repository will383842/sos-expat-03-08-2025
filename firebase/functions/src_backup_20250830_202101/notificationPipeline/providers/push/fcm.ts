import { messaging } from "../../../utils/firebase"; // admin.messaging()

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  await messaging.send({
    token,
    notification: { title, body },
    data,
  });
}
