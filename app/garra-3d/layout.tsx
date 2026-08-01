import type { Metadata } from "next";
import GameLoading from "../components/GameLoading";
import "./three-claw.css";
import "./three-controls.css";

export const metadata: Metadata = { title: "Garra Premiada 3D", description: "Protótipo tridimensional da Garra Premiada" };
export default function Layout({ children }: { children: React.ReactNode }) { return <GameLoading label="CARREGANDO MODELOS 3D">{children}</GameLoading>; }
