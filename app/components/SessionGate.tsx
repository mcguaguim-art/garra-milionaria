"use client";

import { useEffect, useState } from "react";
import { SESSION_KEY } from "../portal/ClawPortal";

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(SESSION_KEY)) setAllowed(true);
    else window.location.replace("/");
  }, []);

  if (!allowed) return <main className="portal-loading"><span className="portal-loader" /><b>VALIDANDO ACESSO</b></main>;
  return children;
}
