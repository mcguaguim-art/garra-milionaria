import "../garra/garra.css";
import GameLoading from "../components/GameLoading";

export const metadata = {
  title: "Garra Milionária 2D",
  description: "A versão 2D da Garra Milionária, com física, mais chances de captura e mais prêmios.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <GameLoading label="CARREGANDO GARRA MILIONÁRIA 2D">{children}</GameLoading>;
}
