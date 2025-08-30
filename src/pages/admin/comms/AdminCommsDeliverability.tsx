import React, { useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, query, orderBy, limit, startAfter,
  where, onSnapshot, getDocs, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot
} from "firebase/firestore";

function ensureDb(){
  if (!getApps().length) initializeApp({ projectId: "sos-urgently-ac307" });
  return getFirestore();
}

type Delivery = {
  id: string; eventId?: string; channel?: "email"|"sms"|"push"|"whatsapp";
  to?: string; status?: "sent"|"failed"|"queued"; provider?: string;
  providerMsgId?: string; error?: string; locale?: string; createdAt?: any; context?: any;
};

function Badge({children}:{children:React.ReactNode}){return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 border">{children}</span>}
function Button(p:React.ButtonHTMLAttributes<HTMLButtonElement>){return <button {...p} className={`px-3 py-1.5 rounded border hover:bg-gray-50 ${p.className??""}`}/> }
function Input(p:React.InputHTMLAttributes<HTMLInputElement>){return <input {...p} className={`px-2 py-1 border rounded w-full ${p.className??""}`}/> }
function Select(p:React.SelectHTMLAttributes<HTMLSelectElement>){return <select {...p} className={`px-2 py-1 border rounded ${p.className??""}`}/> }

export default function AdminCommsDeliverability(){
  const db = ensureDb();
  const [eventFilter, setEventFilter] = useState(""); const [channelFilter,setChannelFilter]=useState<""|Delivery["channel"]>(""); const [statusFilter,setStatusFilter]=useState<""|Delivery["status"]>(""); const [emailFilter,setEmailFilter]=useState("");
  const [rows,setRows]=useState<Delivery[]>([]); const [loading,setLoading]=useState(false); const [endCursor,setEndCursor]=useState<QueryDocumentSnapshot<DocumentData>|null>(null);
  const pageSize=25; const unsubRef = useRef<()=>void>();

  const qBase = useMemo(()=>{ let q:any = query(collection(db,"message_deliveries"), orderBy("createdAt","desc"), limit(pageSize)); const wh:any[]=[]; if(eventFilter) wh.push(where("eventId","==",eventFilter)); if(channelFilter) wh.push(where("channel","==",channelFilter)); if(statusFilter) wh.push(where("status","==",statusFilter)); return {q,wh}; }, [db,eventFilter,channelFilter,statusFilter]);

  useEffect(()=>{ setLoading(true); if (unsubRef.current) unsubRef.current(); let q:any=query(collection(db,"message_deliveries"),orderBy("createdAt","desc"),limit(pageSize)); for(const w of qBase.wh) q=query(q,w);
    const unsub=onSnapshot(q,(snap)=>{ const list:Delivery[]=snap.docs.map(d=>({id:d.id,...(d.data() as any)})); const filtered=emailFilter?list.filter(x=>(x.to||"").toLowerCase().includes(emailFilter.toLowerCase())):list; setRows(filtered); setEndCursor(snap.docs.length ? snap.docs[snap.docs.length-1] : null); setLoading(false); },(e)=>{console.error(e);setLoading(false);}); unsubRef.current=unsub; return ()=>{unsub();unsubRef.current=undefined;}; }, [qBase,emailFilter,pageSize,db]);

  async function loadMore(){ if(!endCursor) return; setLoading(true); let q:any=query(collection(db,"message_deliveries"),orderBy("createdAt","desc"),startAfter(endCursor),limit(pageSize)); for(const w of qBase.wh) q=query(q,w); const snap=await getDocs(q); const more:Delivery[]=snap.docs.map(d=>({id:d.id,...(d.data() as any)})); const merged=[...rows,...more]; setRows(emailFilter?merged.filter(x=>(x.to||"").toLowerCase().includes(emailFilter.toLowerCase())):merged); setEndCursor(snap.docs.length ? snap.docs[snap.docs.length-1] : null); setLoading(false); }

  async function resend(d:Delivery){ try{ if(!d.eventId) throw new Error("eventId manquant"); const payload:any={eventId:d.eventId, uid:d.context?.user?.uid||"ADMIN_RESEND", locale:d.locale||(d.context?.user?.preferredLanguage||"en"), context:d.context||{}, createdAt:serverTimestamp(),}; if(d.to){ payload.context.user={...(payload.context.user||{}), email:d.to}; } await addDoc(collection(db,"message_events"), payload); alert("Relance planifiée."); }catch(e:any){ console.error(e); alert("Relance impossible: "+e.message);} }

  return (<div className="p-6 space-y-4">
    <h1 className="text-2xl font-semibold">Délivrabilité</h1>
    <div className="flex flex-wrap gap-3 items-end">
      <div><label className="block text-xs text-gray-500 mb-1">EventId</label><Input placeholder="ex: user.signup.success" value={eventFilter} onChange={e=>setEventFilter(e.target.value)} /></div>
      <div><label className="block text-xs text-gray-500 mb-1">Canal</label><Select value={channelFilter} onChange={e=>setChannelFilter(e.target.value as any)}><option value="">(tous)</option><option value="email">email</option><option value="sms">sms</option><option value="push">push</option><option value="whatsapp">whatsapp</option></Select></div>
      <div><label className="block text-xs text-gray-500 mb-1">Statut</label><Select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)}><option value="">(tous)</option><option value="sent">sent</option><option value="failed">failed</option><option value="queued">queued</option></Select></div>
      <div className="min-w-[220px]"><label className="block text-xs text-gray-500 mb-1">Destinataire (contient)</label><Input placeholder="email@domaine..." value={emailFilter} onChange={e=>setEmailFilter(e.target.value)} /></div>
      <div className="ml-auto"><Button onClick={()=>{setEventFilter('');setChannelFilter('' as any);setStatusFilter('' as any);setEmailFilter('');}}>Réinitialiser</Button></div>
    </div>

    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50"><tr className="text-left"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">Canal</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Provider</th><th className="px-3 py-2">MsgId</th><th className="px-3 py-2 w-1/3">Erreur</th><th className="px-3 py-2">Actions</th></tr></thead>
        <tbody>
        {rows.map(d=>{ const dt=d.createdAt?.toDate?d.createdAt.toDate():(d.createdAt?new Date(d.createdAt):null); const dateStr=dt?new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"medium"}).format(dt):"-";
          return (<tr key={d.id} className="border-t">
            <td className="px-3 py-2 text-gray-600">{dateStr}</td>
            <td className="px-3 py-2 font-mono">{d.eventId||"-"}</td>
            <td className="px-3 py-2">{d.channel?<Badge>{d.channel}</Badge>:"-"}</td>
            <td className="px-3 py-2">{d.to||"-"}</td>
            <td className="px-3 py-2">{d.status?<Badge>{d.status}</Badge>:"-"}</td>
            <td className="px-3 py-2">{d.provider||"-"}</td>
            <td className="px-3 py-2 truncate max-w-[180px]" title={d.providerMsgId||""}>{d.providerMsgId||"-"}</td>
            <td className="px-3 py-2 text-red-600 truncate max-w-[300px]" title={d.error||""}>{d.error||""}</td>
            <td className="px-3 py-2"><div className="flex gap-2"><Button onClick={()=>resend(d)}>Resend</Button>
              <a className="px-3 py-1.5 rounded border hover:bg-gray-50" href={`https://console.firebase.google.com/project/sos-urgently-ac307/firestore/data/~2Fmessage_deliveries~2F${encodeURIComponent(d.id)}`} target="_blank" rel="noreferrer">Ouvrir doc</a>
            </div></td>
          </tr>); })}
        {!rows.length && !loading && (<tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">Aucun résultat</td></tr>)}
        </tbody>
      </table>
    </div>
    <div className="flex items-center gap-3"><Button disabled={!endCursor||loading} onClick={loadMore}>Charger plus</Button>{loading&&<span className="text-sm text-gray-500">Chargement…</span>}</div>
  </div>);
}
