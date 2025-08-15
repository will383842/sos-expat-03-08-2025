// public/firebase-messaging-sw.js
// Service Worker Firebase Messaging (compat, car importScripts)
importScripts('/firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// La config est fournie par firebase-config.js, non committée
firebase.initializeApp(self.__FIREBASE_CONFIG__);
const messaging = firebase.messaging();

// (Optionnel) Gestion des notifications en arrière-plan
// messaging.onBackgroundMessage((payload) => {
//   self.registration.showNotification(payload.notification.title, {
//     body: payload.notification.body,
//     icon: '/icons/icon-192x192.png',
//   });
// });