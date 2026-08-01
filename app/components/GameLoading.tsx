"use client";

import { useEffect, useState } from "react";
import "./game-loading.css";

export default function GameLoading({ children, label="CARREGANDO A MÁQUINA" }: { children: React.ReactNode; label?: string }) {
  const [ready,setReady]=useState(false); const [progress,setProgress]=useState(8);
  useEffect(()=>{ const started=performance.now(); const timer=window.setInterval(()=>{ const elapsed=performance.now()-started; setProgress(Math.min(96,8+elapsed/13)); },45); const finish=window.setTimeout(()=>setReady(true),1450); return()=>{clearInterval(timer);clearTimeout(finish);}; },[]);
  return <>{children}<div className={`game-loading ${ready?"is-ready":""}`} aria-hidden={ready}><div className="loading-claw">♜</div><b>GARRA PREMIADA</b><span>{label}</span><div><i style={{width:`${progress}%`}} /></div><small>PREPARANDO ITENS · FÍSICA · ILUMINAÇÃO</small></div></>;
}
