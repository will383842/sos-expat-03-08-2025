import React, { useEffect, useState } from "react";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

function db() {
  if (!getApps().length) initializeApp({ projectId: "sos-urgently-ac307" });
  return getFirestore();
}

export default function AdminCommsTemplates() {
  const [locale, setLocale] = useState<"fr-FR"|"en">("fr-FR");
  const [eventId, setEventId] = useState("user.signup.success");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const dbase = db();

  async function load() {
    setLoading(true);
    const ref = doc(dbase, `message_templates/${locale}/items/${eventId}`);
    const snap = await getDoc(ref);
    const data = snap.data() as any || {};
    setSubject(data?.email?.subject || "");
    setHtml(data?.email?.html || "");
    setLoading(false);
  }
  async function save() {
    const ref = doc(dbase, `message_templates/${locale}/items/${eventId}`);
    await setDoc(ref, { email: { subject, html } }, { merge: true });
    alert("Sauvegardé.");
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [locale, eventId]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Templates emails</h1>
      <div className="flex gap-3">
        <select value={locale} onChange={e=>setLocale(e.target.value as any)} className="border px-2 py-1 rounded">
          <option value="fr-FR">fr-FR</option>
          <option value="en">en</option>
        </select>
        <input value={eventId} onChange={e=>setEventId(e.target.value)} className="border px-2 py-1 rounded min-w-[320px]" placeholder="eventId" />
        <button onClick={load} className="border px-3 py-1.5 rounded">Recharger</button>
        <button onClick={save} className="border px-3 py-1.5 rounded">Enregistrer</button>
      </div>

      {loading ? <div>Chargement…</div> : (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sujet</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} className="border px-2 py-1 rounded w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">HTML</label>
            <textarea value={html} onChange={e=>setHtml(e.target.value)} rows={14} className="border px-2 py-1 rounded w-full font-mono"></textarea>
          </div>
        </>
      )}
    </div>
  );
}
