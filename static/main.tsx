import React from "react";
import { createRoot } from "react-dom/client";
import ClawPortal from "../app/portal/ClawPortal";
import Garra from "../app/garra/page";
import Garra3D from "../app/garra-3d/ThreeClawMachine";
import GameLoading from "../app/components/GameLoading";
import SessionGate from "../app/components/SessionGate";
import "../app/globals.css";
import "../app/garra/garra.css";
import "../app/garra-3d/three-claw.css";
import "../app/portal/portal.css";

const isCube = window.location.pathname.startsWith("/garra-cubos");
const isGarra3D = window.location.pathname.startsWith("/garra-3d");
const isRapier = window.location.pathname.startsWith("/garra-fisica");
const isGame = isCube || isGarra3D || isRapier;
document.title = isRapier ? "Garra Milionária 2D" : isCube ? "Garra Box 3D" : isGarra3D ? "Garra Arena 3D" : "Garra Milionária";

const game = isCube ? <Garra3D prizeMode="cubes" /> : isGarra3D ? <Garra3D /> : <Garra variant="pile" engine="rapier" />;
const loadingLabel = isCube ? "CARREGANDO CUBOS PREMIADOS" : isGarra3D ? "CARREGANDO MODELOS 3D" : isRapier ? "CARREGANDO GARRA MILIONÁRIA 2D" : "CARREGANDO A EXPERIÊNCIA";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isGame ? <SessionGate><GameLoading label={loadingLabel}>{game}</GameLoading></SessionGate> : <ClawPortal />}
  </React.StrictMode>,
);
