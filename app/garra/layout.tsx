import "./garra.css";
import GameLoading from "../components/GameLoading";

export const metadata = {
  title: "Garra Premiada",
  description: "Uma máquina de garra física com prêmios premium.",
};

export default function GarraLayout({ children }: { children: React.ReactNode }) {
  return <GameLoading label="CARREGANDO GARRA CLÁSSICA">{children}</GameLoading>;
}
