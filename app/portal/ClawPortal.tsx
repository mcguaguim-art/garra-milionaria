"use client";

import { FormEvent, useEffect, useState } from "react";
import "./portal.css";

export const SESSION_KEY = "garra-premiada:testador";

type Tester = {
  name: string;
  email: string;
  createdAt: string;
};

const machines = [
  {
    href: "/garra-fisica",
    badge: "EDIÇÃO 2D",
    name: "Garra Milionária 2D",
    description: "A versão 2D com física, mais chances de captura e uma seleção maior de prêmios.",
    image: "/casino-machine-background-v1.png",
    accent: "gold",
  },
  {
    href: "/garra-3d",
    badge: "MODELOS GLB",
    name: "Garra Arena 3D",
    description: "Prêmios tridimensionais, profundidade, peso e captura por contato.",
    image: "/environments/arcade-premium-v1.png",
    accent: "violet",
  },
  {
    href: "/garra-cubos",
    badge: "CUBOS PREMIADOS",
    name: "Garra Box 3D",
    description: "Cubos iguais com imagens reais dos prêmios e física mais previsível.",
    image: "/claw-vault-bg.png",
    accent: "blue",
  },
];

function readTester(): Tester | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Tester) : null;
  } catch {
    return null;
  }
}

export default function ClawPortal() {
  const [ready, setReady] = useState(false);
  const [tester, setTester] = useState<Tester | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setTester(readTester());
    setReady(true);
  }, []);

  function login(event: FormEvent) {
    event.preventDefault();
    const next = {
      name: name.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
    };
    if (!next.name || !next.email) return;
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setTester(next);
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    setTester(null);
  }

  if (!ready) return <main className="portal-loading"><span className="portal-loader" /><b>ABRINDO O SALÃO</b></main>;

  if (!tester) {
    return (
      <main className="login-page">
        <div className="casino-haze" aria-hidden="true" />
        <section className="login-machine">
          <div className="login-led" />
          <div className="login-brand">
            <span>◆ ACESSO AO LABORATÓRIO</span>
            <h1>GARRA<br /><strong>PREMIADA</strong></h1>
            <p>Entre como testador, escolha uma máquina e ajude a evoluir cada versão.</p>
          </div>
          <form onSubmit={login}>
            <label>
              SEU NOME
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como devemos chamar você?" autoComplete="name" required />
            </label>
            <label>
              SEU E-MAIL
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" type="email" autoComplete="email" required />
            </label>
            <button type="submit">ENTRAR E TESTAR <span>→</span></button>
            <small>Ambiente de teste. Seu perfil fica salvo somente neste aparelho.</small>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="portal-page">
      <header className="portal-header">
        <a className="portal-logo" href="/"><span>◆</span><b>GARRA <strong>PREMIADA</strong></b></a>
        <div className="tester">
          <span>{tester.name.slice(0, 1).toUpperCase()}</span>
          <div><small>TESTADOR ATIVO</small><b>{tester.name}</b></div>
          <button onClick={logout}>SAIR</button>
        </div>
      </header>

      <section className="portal-hero">
        <span className="live-label"><i /> LABORATÓRIO ONLINE</span>
        <h1>ESCOLHA SUA<br /><strong>MÁQUINA</strong></h1>
        <p>Três experiências independentes. Teste a física, a precisão e a sensação de captura de cada versão.</p>
      </section>

      <section className="portal-grid" aria-label="Versões disponíveis da Garra Premiada">
        {machines.map((machine, index) => (
          <a href={machine.href} className={`portal-card ${machine.accent}`} key={machine.href}>
            <div className="portal-card-image" style={{ backgroundImage: `url(${machine.image})` }}>
              <span>0{index + 1}</span>
              <em>{machine.badge}</em>
              <div className="mini-claw"><i /><i /><i /></div>
            </div>
            <div className="portal-card-copy">
              <small>VERSÃO DISPONÍVEL</small>
              <h2>{machine.name}</h2>
              <p>{machine.description}</p>
              <button>JOGAR AGORA <span>→</span></button>
            </div>
          </a>
        ))}
      </section>

      <footer className="portal-footer">
        <span><i /> SISTEMAS OPERACIONAIS</span>
        <span>GARRA PREMIADA · TEST BUILD</span>
      </footer>
    </main>
  );
}
