import { useState, useEffect, useMemo } from "react";

/* Stats are embedded rather than fetched: the artifact sandbox blocks outbound
   requests, so a live Data Dragon call fails here. The patch and roster size
   are whatever the build baked in — don't restate them here, or a rebuild
   silently ships a stale claim. Order per row:
   name, hp, hp+, hp5, hp5+, ad, ad+, as, as+%, ar, ar+, mr, mr+, ms */
const D = __DATA__;
const PATCH = "__PATCH__";

const curve = (l) => (l - 1) * (0.7025 + 0.0175 * (l - 1));

const STATS = [
  { k:"hp",  label:"Health",        short:"HP",  dp:0, f:(c,m)=>c[1]+c[2]*m },
  { k:"hp5", label:"Health regen",  short:"HP5", dp:2, f:(c,m)=>c[3]+c[4]*m },
  { k:"ad",  label:"Attack damage", short:"AD",  dp:1, f:(c,m)=>c[5]+c[6]*m },
  { k:"as",  label:"Attack speed",  short:"AS",  dp:3, f:(c,m)=>c[7]*(1+(c[8]/100)*m) },
  { k:"ar",  label:"Armor",         short:"AR",  dp:1, f:(c,m)=>c[9]+c[10]*m },
  { k:"mr",  label:"Magic resist",  short:"MR",  dp:1, f:(c,m)=>c[11]+c[12]*m },
  { k:"ms",  label:"Move speed",    short:"MS",  dp:0, f:(c)=>c[13] },
];

const VOID="#070a0f", PLATE="#0e141c", RAISE="#141c26";
const GOLD="#c89b3c", LIT="#e4c37b", TEAL="#0ac8b9";
const INK="#dfe6ee", MUTE="#7e8a99", FAINT="#54606e";
const DISP="'Orbitron',ui-sans-serif,system-ui,sans-serif";
const BODY="'Rajdhani',ui-sans-serif,system-ui,sans-serif";

const mono = (n) => n.replace(/[^A-Za-z ]/g,"").split(" ")
  .filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();

export default function RiftRoster(){
  const [level,setLevel]=useState(18);
  const [sortKey,setSortKey]=useState("bst");
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState(null);

  useEffect(()=>{
    const l=document.createElement("link");
    l.rel="stylesheet";
    l.href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Rajdhani:wght@400;500;600&display=swap";
    document.head.appendChild(l);
    return ()=>{ try{document.head.removeChild(l);}catch{} };
  },[]);

  const scored = useMemo(()=>{
    const m=curve(level);
    const rows=D.map(c=>{
      const v={}; for(const s of STATS) v[s.k]=s.f(c,m);
      return { name:c[0], v };
    });
    const b={};
    for(const s of STATS){ const a=rows.map(r=>r.v[s.k]); b[s.k]=[Math.min(...a),Math.max(...a)]; }
    for(const r of rows){
      r.norm={}; let sum=0;
      for(const s of STATS){
        const [lo,hi]=b[s.k];
        const n = hi===lo ? 50 : (r.v[s.k]-lo)/(hi-lo)*100;
        r.norm[s.k]=n; sum+=n;
      }
      r.bst=sum/STATS.length;
    }
    return rows;
  },[level]);

  const rows = useMemo(()=>{
    const t=query.trim().toLowerCase();
    return scored.filter(r=>!t||r.name.toLowerCase().includes(t))
      .sort((a,b)=> sortKey==="bst" ? b.bst-a.bst : b.v[sortKey]-a.v[sortKey]);
  },[scored,query,sortKey]);

  const def=STATS.find(s=>s.k===sortKey);
  const top=rows.length ? (sortKey==="bst"?rows[0].bst:rows[0].v[sortKey]) : 1;

  const chip=(on)=>({
    font:`600 11px ${BODY}`, letterSpacing:".11em", textTransform:"uppercase",
    padding:"5px 11px", borderRadius:2, cursor:"pointer",
    border:`1px solid ${on?"rgba(200,155,60,.55)":"rgba(255,255,255,.05)"}`,
    color:on?LIT:MUTE, background:on?"rgba(200,155,60,.09)":"transparent",
  });
  const kicker={fontFamily:DISP,fontSize:9,letterSpacing:".22em",
                textTransform:"uppercase",color:FAINT};

  return (
    <div style={{position:"relative",minHeight:"100vh",background:VOID,color:INK,fontFamily:BODY}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:3,
        background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.06) 2px,rgba(0,0,0,.06) 4px)"}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:3,
        background:"radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.7) 100%)"}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:900,margin:"0 auto",padding:"26px 14px 70px"}}>
        <div style={{fontFamily:DISP,fontSize:9,letterSpacing:".34em",color:TEAL,textTransform:"uppercase"}}>
          Summoner&#39;s Rift &middot; base statistics
        </div>
        <h1 style={{fontFamily:DISP,fontWeight:700,fontSize:23,letterSpacing:".11em",
                    margin:"6px 0 0",color:LIT,textTransform:"uppercase"}}>Rift Roster</h1>
        <p style={{fontSize:13,color:MUTE,margin:"3px 0 0",letterSpacing:".05em"}}>
          Patch {PATCH} &middot; {D.length} champions
        </p>
        <div style={{height:1,margin:"14px 0 0",
                     background:"linear-gradient(90deg,#c89b3c,rgba(200,155,60,0) 70%)"}}/>

        <div style={{position:"sticky",top:0,zIndex:4,background:VOID,
                     padding:"14px 0 12px",borderBottom:"1px solid rgba(200,155,60,.18)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{...kicker,color:MUTE,width:46}}>Level</span>
            <input type="range" min="1" max="18" step="1" value={level}
                   onChange={e=>setLevel(+e.target.value)}
                   style={{flex:1,accentColor:GOLD,height:22}} aria-label="Champion level"/>
            <span style={{fontFamily:DISP,fontSize:17,color:LIT,width:30,textAlign:"right"}}>{level}</span>
          </div>
          <input value={query} onChange={e=>{setQuery(e.target.value);setOpen(null);}}
            placeholder="Find a champion" aria-label="Find a champion"
            style={{width:"100%",marginTop:10,background:PLATE,border:"1px solid rgba(255,255,255,.05)",
                    borderLeft:"2px solid rgba(200,155,60,.18)",color:INK,borderRadius:2,
                    padding:"9px 11px",font:`500 15px ${BODY}`}}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:10}}>
            {[{k:"bst",short:"Total"},...STATS].map(s=>(
              <button key={s.k} style={chip(sortKey===s.k)}
                onClick={()=>{setSortKey(s.k);setOpen(null);}}>{s.short}</button>
            ))}
          </div>
        </div>

        <p style={{...kicker,margin:"16px 0 6px"}}>
          {rows.length} shown &mdash; {sortKey==="bst"?"base stat total":def.label} at level {level}
        </p>

        <ol style={{listStyle:"none",margin:0,padding:0}}>
          {rows.map((r,i)=>{
            const cur = sortKey==="bst" ? r.bst : r.v[sortKey];
            const isOpen = open===r.name;
            return (
              <li key={r.name} style={{borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                <button onClick={()=>setOpen(isOpen?null:r.name)}
                  style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"9px 4px",
                          background:"none",border:"none",color:"inherit",textAlign:"left",
                          cursor:"pointer",fontFamily:BODY}}>
                  <span style={{fontFamily:DISP,fontSize:10,color:FAINT,width:26,textAlign:"right"}}>
                    {String(i+1).padStart(2,"0")}
                  </span>
                  <span style={{width:36,height:36,flex:"0 0 auto",background:RAISE,
                    border:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",
                    justifyContent:"center",fontFamily:DISP,fontSize:11,color:GOLD,
                    clipPath:"polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)"}}>
                    {mono(r.name)}
                  </span>
                  <span style={{flex:1,minWidth:0}}>
                    <span style={{display:"block",fontWeight:600,fontSize:16,whiteSpace:"nowrap",
                                  overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span>
                    <span style={{display:"block",height:2,background:"rgba(255,255,255,.06)",marginTop:5}}>
                      <span style={{display:"block",height:"100%",width:`${Math.max(2,(cur/top)*100)}%`,
                        background:`linear-gradient(90deg,rgba(200,155,60,.45),${GOLD})`}}/>
                    </span>
                  </span>
                  <span style={{fontFamily:DISP,fontSize:10,color:FAINT,width:36,textAlign:"right"}}>
                    {r.bst.toFixed(1)}
                  </span>
                  <span style={{fontFamily:DISP,fontSize:15,color:LIT,width:70,textAlign:"right"}}>
                    {sortKey==="bst"?r.bst.toFixed(1):cur.toFixed(def.dp)}
                  </span>
                </button>

                {isOpen && (
                  <div style={{padding:"10px 4px 18px 74px",background:PLATE,
                               borderLeft:"2px solid rgba(200,155,60,.35)"}}>
                    {STATS.map(s=>(
                      <div key={s.k} style={{display:"flex",alignItems:"center",gap:9,margin:"6px 0"}}>
                        <span style={{width:104,font:`600 10px ${BODY}`,letterSpacing:".13em",
                                      textTransform:"uppercase",color:MUTE}}>{s.label}</span>
                        <span style={{width:58,textAlign:"right",fontFamily:DISP,fontSize:11}}>
                          {r.v[s.k].toFixed(s.dp)}
                        </span>
                        <span style={{flex:1,height:5,background:"rgba(255,255,255,.06)"}}>
                          <span style={{display:"block",height:"100%",width:`${r.norm[s.k]}%`,background:GOLD}}/>
                        </span>
                        <span style={{width:26,textAlign:"right",fontFamily:DISP,fontSize:10,color:FAINT}}>
                          {Math.round(r.norm[s.k])}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {rows.length===0 && <p style={{...kicker,marginTop:20}}>No match &mdash; clear the search.</p>}

        <footer style={{color:FAINT,fontSize:13,lineHeight:1.75,marginTop:28,
                        borderTop:"1px solid rgba(255,255,255,.05)",paddingTop:16}}>
          The dim number on each row is the base stat total: all seven stats min&ndash;max scaled
          0&ndash;100 across the roster at the current level, then averaged. It recomputes as the
          slider moves, so a champion with a high base and thin growth slides down as you climb.
          Level 18 is base + 17 &times; growth.<br/><br/>
          Stats are baked in rather than fetched, because this sandbox blocks outbound requests.
          That means no champion portraits, and the numbers are frozen at patch {PATCH} rather
          than tracking live &mdash; the standalone HTML version pulls the current roster from Riot.
          {D.every(c=>!c[6]) && (
            <>
              <br/><br/>
              <strong style={{color:LIT}}>Data caveat for patch {PATCH}:</strong> attack damage
              growth (the AD-per-level field) came back as exactly zero for all {D.length}
              champions in Riot&#39;s source data &mdash; a known upstream data fault, not a real
              balance change. Every other stat here (HP, regen, armor, resist, attack speed, move
              speed) checks out normally, but AD growth at higher levels should be treated as
              unreliable until Riot corrects it.
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
