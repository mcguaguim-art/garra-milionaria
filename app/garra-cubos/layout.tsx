import type { Metadata } from "next";
import GameLoading from "../components/GameLoading";
import "../garra-3d/three-claw.css";
import "../garra-3d/three-controls.css";
export const metadata:Metadata={title:"Garra Box 3D",description:"Máquina de garra 3D com cubos físicos ilustrados"};
export default function Layout({children}:{children:React.ReactNode}){return <GameLoading label="CARREGANDO CUBOS PREMIADOS">{children}</GameLoading>;}
