// src/api/sendContactReply.ts

export const sendContactReply = async ({
  to,
  firstName,
  userMessage,
  adminReply,
}: {
  to: string;
  firstName: string;
  userMessage: string;
  adminReply: string;
}) => {
  try {
    const response = await fetch('/api/sendContactReply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, firstName, userMessage, adminReply }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Erreur serveur');

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof Error) {
      return { success: false, error: err.message };
    }
    return { success: false, error: 'Erreur inconnue' };
  }
};
