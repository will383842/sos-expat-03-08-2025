import React, { useEffect, useState } from "react";
import { call } from "@/config/firebase";

// Typages légers alignés sur tes callables
type Channel = "email"|"sms"|"push"|"whatsapp"|"inapp";
type Locale = "fr-FR"|"en";

type EmailTpl = { enabled?: boolean; subject?: string; html?: string; text?: string };
type SmsTpl   = { enabled?: boolean; text?: string };
type PushTpl  = { enabled?: boolean; title?: string; body?: string; deeplink?: string };

type TemplateDoc = {
  channels?: Partial<Record<Channel, boolean>>; // certains assets ont channels.{email:true,...}
  email?: EmailTpl;
  sms?: SmsTpl;
  push?: PushTpl;
  // on tolère la présence de whatsapp/inapp mais on ne les édite pas ici
};

// helpers httpsCallable
const fnList       = () => call<{locale:Locale},{eventIds:string[]}>("admin_templates_list");
const fnGet        = () => call<{locale:Locale,eventId:string},{exists:boolean,data?:TemplateDoc}>("admin_templates_get");
const fnUpsert     = () => call<{locale:Locale,eventId:string,payload:TemplateDoc},unknown>("admin_templates_upsert");
const fnTestSend   = () => call<{locale:Locale,eventId:string,channel:Channel,to:string,context:any},unknown>("admin_testSend");

const CHANNELS: Channel[] = ["email","sms","push"]; // simple & conforme à tes callables

export default function AdminCommsTemplates(){
  const [locale, setLocale] = useState<Locale>("fr-FR");
  const [events, setEvents] = useState<string[]>([]);
  const [sel, setSel]       = useState<string>();
  const [doc, setDoc]       = useState<TemplateDoc|undefined>();
  const [tab, setTab]       = useState<Channel>("email");
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async()=>{
    setLoading(true);
    const { data } = await fnList()({ locale });
    setEvents(data.eventIds||[]);
    setLoading(false);
  })(); }, [locale]);

  const open = async (eventId:string) => {
    setSel(eventId);
    setDoc(undefined);
    const { data } = await fnGet()({ locale, eventId });
    setDoc(data.exists ? (data.data||{}) : { email:{}, sms:{}, push:{} });
    setTab("email");
  };

  const set = (path:(string|number)[], value:any) => {
    setDoc(prev=>{
      const clone:any = { ...(prev||{}) };
      let cur = clone;
      for (let i=0;i<path.length-1;i++) cur = cur[path[i]] ?? (cur[path[i]] = {});
      cur[path[path.length-1]] = value;
      return clone;
    });
  };

  const save = async () => {
    if (!sel || !doc) return;
    await fnUpsert()({ locale, eventId: sel, payload: doc });
    alert("Template enregistré");
  };

  const test = async () => {
    if (!sel) return;
    const to = prompt(`Adresse/numéro pour test ${tab}:`, "you@example.com");
    if (!to) return;
    const context = { user:{ displayName:"Admin", email:to, phoneNumber:to, uid:"admin-test", preferredLanguage:locale } };
    await fnTestSend()({ locale, eventId: sel, channel: tab, to, context });
    alert("Test envoyé (vérifie logs si rien reçu)");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Communication • Templates</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm">Locale</label>
        <select value={locale} onChange={e=>setLocale(e.target.value as Locale)} className="border px-2 py-1 rounded">
          <option value="fr-FR">fr-FR</option>
          <option value="en">en</option>
        </select>
        <button onClick={()=>setLocale(locale)} className="border px-3 py-1 rounded">Rafraîchir</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Liste des events */}
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Événements ({loading?"…":events.length})</div>
          <ul className="divide-y">
            {events.map(eid=>(
              <li key={eid} className={`py-2 cursor-pointer ${sel===eid?"bg-gray-50":""}`} onClick={()=>open(eid)}>
                <div className="flex items-center justify-between">
                  <span>{eid}</span>
                  <span className="text-xs opacity-60">
                    {(doc?.channels?.email || doc?.email?.enabled) ? "✉️" : ""}
                    {(doc?.channels?.sms   || doc?.sms?.enabled)   ? " 📱" : ""}
                    {(doc?.channels?.push  || doc?.push?.enabled)  ? " 🔔" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Éditeur */}
        <div className="border rounded p-3">
          {!sel ? <p className="opacity-60">Sélectionne un événement.</p> : !doc ? <p>Chargement…</p> : (
            <>
              <div className="flex gap-2 mb-3">
                {CHANNELS.map(c=>(
                  <button key={c} className={`px-3 py-1 border rounded ${tab===c?"bg-indigo-50 border-indigo-300":""}`} onClick={()=>setTab(c)}>{c}</button>
                ))}
              </div>

              {tab==="email" && (
                <div className="space-y-2">
                  <label className="text-sm"><input type="checkbox" checked={!!(doc.email?.enabled ?? doc.channels?.email)} onChange={e=>set(["email","enabled"], e.target.checked)} /> Enabled</label>
                  <input className="border p-2 w-full" placeholder="Subject" value={doc.email?.subject||""} onChange={e=>set(["email","subject"],e.target.value)} />
                  <textarea className="border p-2 w-full" rows={3} placeholder="Text" value={doc.email?.text||""} onChange={e=>set(["email","text"],e.target.value)} />
                  <textarea className="border p-2 w-full" rows={8} placeholder="HTML" value={doc.email?.html||""} onChange={e=>set(["email","html"],e.target.value)} />
                </div>
              )}

              {tab==="sms" && (
                <div className="space-y-2">
                  <label className="text-sm"><input type="checkbox" checked={!!(doc.sms?.enabled ?? doc.channels?.sms)} onChange={e=>set(["sms","enabled"], e.target.checked)} /> Enabled</label>
                  <textarea className="border p-2 w-full" rows={4} placeholder="Texte SMS" value={doc.sms?.text||""} onChange={e=>set(["sms","text"],e.target.value)} />
                </div>
              )}

              {tab==="push" && (
                <div className="space-y-2">
                  <label className="text-sm"><input type="checkbox" checked={!!(doc.push?.enabled ?? doc.channels?.push)} onChange={e=>set(["push","enabled"], e.target.checked)} /> Enabled</label>
                  <input className="border p-2 w-full" placeholder="Title" value={doc.push?.title||""} onChange={e=>set(["push","title"],e.target.value)} />
                  <textarea className="border p-2 w-full" rows={3} placeholder="Body" value={doc.push?.body||""} onChange={e=>set(["push","body"],e.target.value)} />
                  <input className="border p-2 w-full" placeholder="Deeplink" value={doc.push?.deeplink||""} onChange={e=>set(["push","deeplink"],e.target.value)} />
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button onClick={save} className="border px-3 py-1 rounded">Enregistrer</button>
                <button onClick={test} className="border px-3 py-1 rounded">Envoyer un test ({tab})</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
