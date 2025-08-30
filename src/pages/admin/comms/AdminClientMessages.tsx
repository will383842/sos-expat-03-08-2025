import React, { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

function db(){ if(!getApps().length) initializeApp({ projectId: "sos-urgently-ac307" }); return getFirestore(); }

export default function AdminClientMessages(){
  const dbase = db();
  const [locale,setLocale] = useState<"fr-FR"|"en">("fr-FR");
  const [eventId,setEventId] = useState("user.signup.success");
  const [email,setEmail] = useState("");
  const [ctx,setCtx] = useState('{\n  "user": { "firstName": "William" },\n  "payment": { "amount": 2599, "currency": "EUR" }\n}');

  async function send(){
    const context = ctx ? JSON.parse(ctx) : {};
    if (email) { context.user = { ...(context.user||{}), email }; }
    await addDoc(collection(dbase,"message_events"), {
      eventId, uid: "ADMIN_TEST", locale, context, createdAt: serverTimestamp(),
    });
    alert("Événement créé. Regarde la délivrabilité / ta boîte mail.");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Messages temps réel (test envoi)</h1>
      <div className="flex flex-wrap gap-3">
        <select value={locale} onChange={e=>setLocale(e.target.value as any)} className="border px-2 py-1 rounded">
          <option value="fr-FR">fr-FR</option><option value="en">en</option>
        </select>
        <input value={eventId} onChange={e=>setEventId(e.target.value)} placeholder="eventId" className="border px-2 py-1 rounded min-w-[320px]" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="destinataire email (optionnel)" className="border px-2 py-1 rounded min-w-[320px]" />
        <button onClick={send} className="border px-3 py-1.5 rounded">Envoyer</button>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Context (JSON)</label>
        <textarea value={ctx} onChange={e=>setCtx(e.target.value)} rows={12} className="border px-2 py-1 rounded w-full font-mono"></textarea>
      </div>
    </div>
  );
}
