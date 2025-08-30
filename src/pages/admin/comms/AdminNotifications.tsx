import React, { useEffect, useState } from "react";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";

function db() {
  if (!getApps().length) initializeApp({ projectId: "sos-urgently-ac307" });
  return getFirestore();
}

type Channels = { email?: boolean; sms?: boolean; push?: boolean; whatsapp?: boolean; };

export default function AdminNotifications() {
  const [eventId, setEventId] = useState("user.signup.success");
  const [channels, setChannels] = useState<Channels>({});
  const [rateLimitH, setRateLimitH] = useState<number>(0);
  const dbase = db();

  async function load() {
    const ref = doc(dbase, "message_routing/config");
    const snap = await getDoc(ref);
    const data = snap.data() as any || {};
    const conf = data?.[eventId] || {};
    setChannels(conf.channels || {});
    setRateLimitH(conf.rate_limit_h || 0);
  }
  async function save() {
    const ref = doc(dbase, "message_routing/config");
    await setDoc(ref, { [eventId]: { channels, rate_limit_h: rateLimitH } }, { merge: true });
    alert("Sauvegardé.");
  }
  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [eventId]);

  function toggle(k: keyof Channels) {
    setChannels(prev=>({ ...prev, [k]: !prev[k]}));
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Notifications (routing)</h1>
      <div className="flex gap-3 items-end">
        <input value={eventId} onChange={e=>setEventId(e.target.value)} className="border px-2 py-1 rounded min-w-[320px]" placeholder="eventId" />
        <button onClick={load} className="border px-3 py-1.5 rounded">Recharger</button>
        <button onClick={save} className="border px-3 py-1.5 rounded">Enregistrer</button>
      </div>

      <div className="flex gap-6 items-center">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!channels.email} onChange={()=>toggle("email")} /> Email</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!channels.sms} onChange={()=>toggle("sms")} /> SMS</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!channels.push} onChange={()=>toggle("push")} /> Push</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!channels.whatsapp} onChange={()=>toggle("whatsapp")} /> WhatsApp</label>
        <div className="ml-8">
          <span className="text-sm text-gray-600 mr-2">Rate-limit (h)</span>
          <input type="number" value={rateLimitH} onChange={e=>setRateLimitH(parseInt(e.target.value||"0"))} className="border px-2 py-1 rounded w-24" />
        </div>
      </div>
    </div>
  );
}
