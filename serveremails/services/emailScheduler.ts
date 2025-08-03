/**
 * Planifie l'exécution différée d'une fonction d'envoi d'email.
 * Utilisé pour programmer des envois à une date future.
 *
 * @param emailFn - Fonction d'envoi d'email (async)
 * @param date - Date future à laquelle envoyer l'email
 */
export const scheduleEmail = (
  emailFn: () => Promise<void>,
  date: Date
): void => {
  const delay = date.getTime() - Date.now();

  if (delay <= 0) {
    // Si la date est déjà passée ou immédiate, on envoie tout de suite
    void emailFn();
  } else {
    // Sinon, on programme l'envoi
    setTimeout(() => {
      void emailFn();
    }, delay);
  }
};
