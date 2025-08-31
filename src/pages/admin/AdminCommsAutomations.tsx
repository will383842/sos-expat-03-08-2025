import React, { useEffect, useState } from "react";
import { call } from "@/config/firebase";

type Channel = "email"|"sms"|"push"|"whatsapp"|"inapp";
const CHANNELS: Channel[] = ["email","push","sms","whatsapp","inapp"];

type RoutingEntry = {
  channels: Channel[];
  rate_limit_h?: number;
  delays?: Partial<Record<Channel, number>>; // secondes
};
type RoutingDoc = {
  // ton back peut renvoyer {events:{...}} ou {routing:{...}} selon le seed
  events?: Record<string, RoutingEntry>;
  routing?: Record<string, RoutingEntry>;
  version?: number;
};

const getRouting = () => call<{}, {exists:boolean, data?:RoutingDoc}>("admin_routing_get");
const upsertOne  = () => call<{eventId:string,channels:Channel[],rate_limit_h?:number,delays?:Record<string,number>}, {ok:boolean}>("admin_routing_upsert");

export default function AdminCommsAutomations(){
  const [map, setMap] = useState<Record<string, RoutingEntry>>({});
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ (async()=>{
    const { data } = await getRouting()({});
    const raw = data.data;
    const base = raw?.events ?? raw?.routing ?? {};
    setMap(base as Record<string,RoutingEntry>);
  })(); }, []);

  const toggle = (eid:string, ch:Channel) => setMap(prev=>{
    const e = {...prev[eid]};
    const set = new Set(e.channels || []);
    if (set.has(ch)) set.delete(ch); else set.add(ch);
    e.channels = Array.from(set);
    return { ...prev, [eid]: e };
  });

  const update = (eid:string, key:"rate_limit_h", value:number) => setMap(prev=>{
    const e = {...prev[eid]}; (e as any)[key] = value; return { ...prev, [eid]: e };
  });

  const updateDelay = (eid:string, ch:Channel, sec:number) => setMap(prev=>{
    const e = {...prev[eid], delays: { ...(prev[eid]?.delays||{}) } };
    if (!sec) delete e.delays![ch]; else e.delays![ch] = sec;
    return { ...prev, [eid]: e };
  });

  const saveAll = async () => {
    setSaving(true);
    const entries = Object.entries(map);
    for (const [eid, cfg] of entries) {
      await upsertOne()({
        eventId: eid,
        channels: cfg.channels || [],
        rate_limit_h: Number(cfg.rate_limit_h||0),
        delays: cfg.delays as Record<string, number> | undefined
      });
    }
    setSaving(false);
    alert("Routing enregistré");
  };

  const eids = Object.keys(map).sort();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Communication • Automations (Routing)</h1>

      {eids.length===0 ? <p className="opacity-60">Aucun événement trouvé. Lance le seed côté back si besoin.</p> : (
        eids.map(eid=>{
          const e = map[eid];
          return (
            <div key={eid} className="border rounded p-3 space-y-2">
              <div className="flex items-center gap-4">
                <strong className="min-w-[280px]">{eid}</strong>
                <label className="text-sm">Rate limit (h)
                  <input type="number" className="border ml-2 p-1 w-24"
                         value={e.rate_limit_h || 0}
                         onChange={ev=>update(eid,"rate_limit_h", Number(ev.target.value||0))}/>
                </label>
                <div className="text-xs opacity-60">délais (sec) par canal en dessous</div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {CHANNELS.map(ch=>{
                  const checked = (e.channels||[]).includes(ch);
                  const d = e.delays?.[ch] ?? 0;
                  return (
                    <div key={ch} className="border rounded p-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={checked} onChange={()=>toggle(eid, ch)}/>
                        <span className="capitalize">{ch}</span>
                      </label>
                      <div className="mt-2">
                        <label className="text-xs">Delay (sec)</label>
                        <input type="number" className="border p-1 w-full"
                               value={d} onChange={ev=>updateDelay(eid, ch, Number(ev.target.value||0))}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <button className="border px-3 py-1 rounded" disabled={saving} onClick={saveAll}>
        {saving? "Enregistrement…" : "Enregistrer tout"}
      </button>
    </div>
  );
}
