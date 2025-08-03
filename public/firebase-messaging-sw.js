// ✅ Service Worker pour Firebase Messaging (notifications push)
importScripts('https://www.gstatic.com/firebasejs/10.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.3.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCLp02v_ywBw67d4VD7rQ2tCQUdKp83CT8",
  authDomain: "sos-urgently-ac307.firebaseapp.com",
  projectId: "sos-urgently-ac307",
  storageBucket: "sos-urgently-ac307.firebasestorage.app",
  messagingSenderId: "268195823113",
  appId: "1:268195823113:web:10bf2e5bacdc1816f182d8"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Message reçu : ', payload);
  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png', // mets ton icône ici
  });
});
