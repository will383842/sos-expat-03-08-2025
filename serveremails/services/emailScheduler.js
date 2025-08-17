"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleEmail = void 0;
/**
 * Planifie l'exécution différée d'une fonction d'envoi d'email.
 * Utilisé pour programmer des envois à une date future.
 *
 * @param emailFn - Fonction d'envoi d'email (async)
 * @param date - Date future à laquelle envoyer l'email
 */
var scheduleEmail = function (emailFn, date) {
    var delay = date.getTime() - Date.now();
    if (delay <= 0) {
        // Si la date est déjà passée ou immédiate, on envoie tout de suite
        void emailFn();
    }
    else {
        // Sinon, on programme l'envoi
        setTimeout(function () {
            void emailFn();
        }, delay);
    }
};
exports.scheduleEmail = scheduleEmail;
