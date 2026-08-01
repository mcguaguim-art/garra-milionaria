"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhysicsBin from "./PhysicsBin";
import RapierClawMachine, { type DeliveredPrize, type GripMode, type PhysicalTarget } from "./RapierClawMachine";

type Rarity = "Comum" | "Raro" | "Épico" | "Lendário";
type Prize = { id: number; name: string; value: number; rarity: Rarity; icon: string; x: number; y: number; vx: number; vy: number; rotation: number; speed: number; size: number };
type WonPrize = Pick<Prize, "name" | "value" | "rarity" | "icon"> & { wonAt: number; image?: string };
type Phase = "idle" | "playing" | "dropping" | "lifting" | "result";
const DEMO_CAPTURE_MODE = false;
const AUDIO_FILES_READY = false;
type RoundDecision = "win" | "near" | "miss";

const PRIZES = [
  { name: "Gift Card R$ 5", value: 5, rarity: "Comum" as const, icon: "🎫", size: 48 },
  { name: "Cabo USB-C", value: 18, rarity: "Comum" as const, icon: "🔌", size: 50 },
  { name: "Mini speaker", value: 79, rarity: "Raro" as const, icon: "🔊", size: 56 },
  { name: "Smartwatch", value: 249, rarity: "Épico" as const, icon: "⌚", size: 52 },
  { name: "Fone Pro", value: 899, rarity: "Épico" as const, icon: "🎧", size: 64 },
  { name: "Smartphone X", value: 3899, rarity: "Lendário" as const, icon: "📱", size: 59 },
];

const MACHINES = [
  { name: "GARRA PREMIADA", sub: "Premium mix", icon: "♛", price: 4.9, color: "#f5c451" },
  { name: "ESSENCE", sub: "Perfumes", icon: "♢", price: 7.9, color: "#ef7d83" },
  { name: "PLAY ROOM", sub: "Games", icon: "★", price: 9.9, color: "#55c98f" },
  { name: "DIAMOND", sub: "Luxo", icon: "◆", price: 19.9, color: "#b791ff" },
];

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const rarityClass = (r: Rarity) => r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const prizeImageFor = (name: string) => {
  if (/iPhone/i.test(name)) return "/prizes/calibrated/iphone14.png";
  if (/PlayStation/i.test(name)) return "/prizes/calibrated/playstation5.png";
  if (/AirFryer/i.test(name)) return "/prizes/calibrated/airfryer.png";
  if (/MacBook/i.test(name)) return "/prizes/calibrated/macbook.png";
  if (/Headphone/i.test(name)) return "/prizes/calibrated/headphones.png";
  if (/Fones/i.test(name)) return "/prizes/calibrated/earbuds.png";
  if (/Relógio/i.test(name)) return "/prizes/calibrated/watch.png";
  if (/Dinheiro/i.test(name)) return "/prizes/calibrated/dinheiro.png";
  if (/Ouro/i.test(name)) return "/prizes/calibrated/gold-bar.png";
  if (/Som/i.test(name)) return "/prizes/calibrated/speaker.png";
  if (/Câmera/i.test(name)) return "/prizes/calibrated/camera.png";
  if (/Drone/i.test(name)) return "/prizes/calibrated/drone.png";
  if (/Asad/i.test(name)) return "/prizes/calibrated/assad.png";
  if (/Perfume/i.test(name)) return "/prizes/calibrated/perfume-viking.png";
  if (/Smartphone/i.test(name)) return "/prizes/calibrated/phone.png";
  return undefined;
};

function makePrizes(): Prize[] {
  const positions = [12, 24, 36, 48, 60, 72, 84, 31, 55, 76, 19, 66];
  const heights = [0, 3, 0, 4, 0, 2, 0, 55, 58, 52, 54, 108];
  return [0, 1, 2, 0, 3, 1, 4, 0, 5, 2, 1, 0].map((index, id) => ({
    ...PRIZES[index], id, x: positions[id], y: heights[id], vx: 0, vy: 0, rotation: -12 + Math.random() * 24, speed: 0, size: PRIZES[index].size,
  }));
}

export default function GarraPage({ variant = "rows", engine = "matter" }: { variant?: "rows" | "pile"; engine?: "matter" | "rapier" } = {}) {
  const [balance, setBalance] = useState(50);
  const [phase, setPhase] = useState<Phase>("idle");
  const [clawX, setClawX] = useState(50);
  const [clawDepth, setClawDepth] = useState(2);
  const [time, setTime] = useState(15);
  const [prizes, setPrizes] = useState<Prize[]>(makePrizes);
  const [inventory, setInventory] = useState<WonPrize[]>([]);
  const [result, setResult] = useState<WonPrize | null | false>(false);
  const [missKind, setMissKind] = useState<"empty" | "slip">("empty");
  const [sound, setSound] = useState(false);
  const [vibration, setVibration] = useState(true);
  const [sensoryMenu, setSensoryMenu] = useState(false);
  const [resumeSignal, setResumeSignal] = useState(0);
  const [attemptsSinceWin, setAttemptsSinceWin] = useState(0);
  const [physicalGrip, setPhysicalGrip] = useState(false);
  const [gripMode, setGripMode] = useState<GripMode>("none");
  const [debugPhysics, setDebugPhysics] = useState(false);
  const [joyDirection, setJoyDirection] = useState<"left" | "right" | "up" | "down" | null>(null);
  const [joyVector, setJoyVector] = useState({ x: 0, y: 0 });
  const [joyActive, setJoyActive] = useState(false);
  const arenaRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>(phase);
  const clawRef = useRef(clawX);
  const prizesRef = useRef(prizes);
  const pendingPrizeRef = useRef<Prize | undefined>(undefined);
  const pendingPhysicalRef = useRef<PhysicalTarget | null>(null);
  const pendingDecisionRef = useRef<RoundDecision>("miss");
  const keys = useRef({ left: false, right: false });
  const roundTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const joyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analogVector = useRef({ x: 0, y: 0 });
  const analogOrigin = useRef<{ x: number; y: number } | null>(null);
  const verticalLatch = useRef(false);
  const lastMoveCue = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const ambientSourcesRef = useRef<AudioScheduledSourceNode[]>([]);
  const ambientGainRef = useRef<GainNode | null>(null);
  const ambientTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef(sound);
  const vibrationRef = useRef(vibration);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { clawRef.current = clawX; }, [clawX]);
  useEffect(() => { prizesRef.current = prizes; }, [prizes]);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { vibrationRef.current = vibration; }, [vibration]);
  useEffect(() => { try { const saved = localStorage.getItem("garra-premiada:inventory"); if (saved) setInventory(JSON.parse(saved)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("garra-premiada:inventory", JSON.stringify(inventory)); } catch {} }, [inventory]);
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && roundTimer.current) clearInterval(roundTimer.current);
      if (!document.hidden) setResumeSignal((signal) => signal + 1);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const sensoryEffect = useCallback((kind: "button" | "move" | "drop" | "close" | "carry" | "win" | "miss" | "casino") => {
    const vibrationPatterns = { button: 5, move: 8, drop: 18, close: 28, carry: 12, win: [20, 35, 35, 35, 65], miss: [22, 45, 16], casino: 0 } as const;
    if (kind !== "casino" && vibrationRef.current && "vibrate" in navigator) navigator.vibrate(vibrationPatterns[kind] as VibratePattern);
    // Synthetic audio is intentionally disabled until the final recorded files arrive.
    if (!AUDIO_FILES_READY || !soundRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioRef.current ?? new AudioContextClass();
      audioRef.current = context;
      void context.resume();
      const now = context.currentTime;
      const profiles = {
        button: [240, 155, .055, .032], move: [92, 74, .045, .022], drop: [118, 58, .42, .055], close: [170, 92, .12, .075], carry: [72, 88, .28, .035], win: [330, 660, .62, .09], miss: [145, 76, .36, .055], casino: [620, 880, .16, .018],
      } as const;
      const [from, to, duration, volume] = profiles[kind];
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "win" ? "triangle" : kind === "close" ? "square" : "sine";
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now); oscillator.stop(now + duration + .02);
    } catch {}
  }, []);

  const stopAmbience = useCallback(() => {
    if (ambientTimerRef.current) window.clearInterval(ambientTimerRef.current);
    ambientTimerRef.current = null;
    ambientGainRef.current?.gain.setTargetAtTime(.0001, audioRef.current?.currentTime ?? 0, .08);
    ambientSourcesRef.current.forEach((source) => { try { source.stop(); } catch {} });
    ambientSourcesRef.current = [];
    ambientGainRef.current = null;
  }, []);

  const startAmbience = useCallback(() => {
    if (!AUDIO_FILES_READY || !soundRef.current || ambientGainRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioRef.current ?? new AudioContextClass();
      audioRef.current = context; void context.resume();
      const master = context.createGain(); master.gain.value = .0001; master.connect(context.destination);
      master.gain.exponentialRampToValueAtTime(.036, context.currentTime + 1.4); ambientGainRef.current = master;
      const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (.45 + Math.sin(index / 900) * .15);
      const crowd = context.createBufferSource(); crowd.buffer = noiseBuffer; crowd.loop = true;
      const crowdFilter = context.createBiquadFilter(); crowdFilter.type = "bandpass"; crowdFilter.frequency.value = 420; crowdFilter.Q.value = .45;
      const crowdGain = context.createGain(); crowdGain.gain.value = .16; crowd.connect(crowdFilter).connect(crowdGain).connect(master); crowd.start();
      const musicGain = context.createGain(); musicGain.gain.value = .055; musicGain.connect(master);
      const notes = [110, 164.81, 220];
      const sources: AudioScheduledSourceNode[] = [crowd];
      notes.forEach((frequency, index) => {
        const tone = context.createOscillator(); tone.type = index === 1 ? "triangle" : "sine"; tone.frequency.value = frequency;
        const toneGain = context.createGain(); toneGain.gain.value = index === 0 ? .7 : .32;
        const lfo = context.createOscillator(); const lfoGain = context.createGain(); lfo.frequency.value = .07 + index * .025; lfoGain.gain.value = .09;
        lfo.connect(lfoGain).connect(toneGain.gain); tone.connect(toneGain).connect(musicGain); tone.start(); lfo.start(); sources.push(tone, lfo);
      });
      ambientSourcesRef.current = sources;
      ambientTimerRef.current = window.setInterval(() => sensoryEffect("casino"), 5200);
    } catch {}
  }, [sensoryEffect]);

  useEffect(() => {
    if (!sound) stopAmbience();
    else if (audioRef.current) startAmbience();
    return () => undefined;
  }, [sound, startAmbience, stopAmbience]);
  useEffect(() => () => stopAmbience(), [stopAmbience]);

  useEffect(() => {
    if (phase === "dropping") sensoryEffect("drop");
    if (phase === "lifting") {
      sensoryEffect("close");
      const carryCue = window.setTimeout(() => sensoryEffect(physicalGrip ? "carry" : "miss"), 720);
      return () => window.clearTimeout(carryCue);
    }
    if (phase === "result") sensoryEffect(result ? "win" : "miss");
  }, [phase, physicalGrip, result, sensoryEffect]);

  const move = useCallback((delta: number) => {
    if (phaseRef.current !== "playing") return;
    setClawX((x) => clamp(x + delta, 4, 96));
    const now = Date.now();
    if (now - lastMoveCue.current > 130) { lastMoveCue.current = now; sensoryEffect("move"); }
  }, [sensoryEffect]);
  const moveDepth = useCallback((delta: number) => {
    if (phaseRef.current !== "playing") return;
    setClawDepth((row) => clamp(row + delta, 0, 3));
  }, []);
  const releaseJoystick = useCallback(() => {
    keys.current.left = false;
    keys.current.right = false;
    analogVector.current = { x: 0, y: 0 };
    analogOrigin.current = null;
    verticalLatch.current = false;
    setJoyVector({ x: 0, y: 0 });
    setJoyActive(false);
    setJoyDirection(null);
  }, []);
  const pressHorizontal = useCallback((direction: "left" | "right") => {
    if (phaseRef.current !== "playing") return;
    keys.current.left = direction === "left";
    keys.current.right = direction === "right";
    setJoyDirection(direction);
    move(direction === "left" ? -1.1 : 1.1);
  }, [move]);
  const pulseVertical = useCallback((direction: "up" | "down") => {
    if (phaseRef.current !== "playing") return;
    if (joyTimer.current) clearTimeout(joyTimer.current);
    setJoyDirection(direction);
    moveDepth(direction === "up" ? -1 : 1);
    sensoryEffect("button");
    joyTimer.current = window.setTimeout(() => setJoyDirection(null), 190);
  }, [moveDepth, sensoryEffect]);

  const updateAnalogJoystick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const origin = analogOrigin.current ?? { x: event.clientX, y: event.clientY };
    const radius = Math.max(26, Math.min(rect.width, rect.height) * .38);
    let x = clamp((event.clientX - origin.x) / radius, -1, 1);
    let y = clamp((event.clientY - origin.y) / radius, -1, 1);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    if (length < .18) { x = 0; y = 0; }
    analogVector.current = { x, y };
    setJoyVector({ x, y });
    setJoyDirection(x === 0 && y === 0 ? null : Math.abs(x) > Math.abs(y) ? x < 0 ? "left" : "right" : y < 0 ? "up" : "down");
    if (Math.abs(y) < .32) verticalLatch.current = false;
    if (Math.abs(y) > .68 && !verticalLatch.current) {
      verticalLatch.current = true;
      moveDepth(y < 0 ? -1 : 1);
      sensoryEffect("button");
    }
  }, [moveDepth, sensoryEffect]);

  const beginAnalogJoystick = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    analogOrigin.current = { x: event.clientX, y: event.clientY };
    setJoyActive(true);
    updateAnalogJoystick(event);
  }, [updateAnalogJoystick]);

  useEffect(() => {
    const release = () => releaseJoystick();
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [releaseJoystick]);

  const finishRound = useCallback((target: Prize | undefined, accuracy: number) => {
    const rarityPenalty = target?.rarity === "Lendário" ? .12 : target?.rarity === "Épico" ? .28 : target?.rarity === "Raro" ? .48 : .68;
    const precision = clamp(1 - accuracy / 9, 0, 1);
    const progressiveGrip = [.28, .38, .58, .82, 1][Math.min(attemptsSinceWin, 4)];
    const stability = target ? clamp(1 - Math.abs(target.rotation) / 70 - target.y / 420, .48, 1) : 0;
    const winChance = target ? clamp((rarityPenalty * (.35 + precision * .65) + progressiveGrip - .28) * stability, .08, attemptsSinceWin >= 4 ? 1 : .9) : 0;
    const roll = Math.random();
    const directWin = Boolean(target && roll < winChance);
    const nearby = prizesRef.current.filter((p) => p.id !== target?.id && p.rarity !== "Lendário").sort((a, b) => Math.abs(a.x - clawRef.current) - Math.abs(b.x - clawRef.current))[0];
    const decision: RoundDecision = directWin ? "win" : target && roll < winChance + .22 ? "near" : "miss";
    const captured = decision === "win" ? (target ?? nearby) : decision === "near" ? target : undefined;
    pendingDecisionRef.current = decision;
    pendingPrizeRef.current = captured;
    setPhysicalGrip(decision === "win" && Boolean(captured));
    window.setTimeout(() => {
      setPhase("lifting");
    }, 1780);
  }, [attemptsSinceWin]);

  const acquirePhysicalTarget = useCallback((target: PhysicalTarget | null) => {
    pendingPhysicalRef.current = target;
    const premium = target && /iPhone|PlayStation|MacBook|Barra de Ouro/i.test(target.label);
    const mid = target && /Caixa de Som|Relógio|Headphone|AirFryer|Drone|Câmera/i.test(target.label);
    const rarityPenalty = premium ? .12 : mid ? .30 : target ? .56 : 0;
    const precision = target ? clamp(1 - target.horizontalError / 9, 0, 1) : 0;
    const progressiveGrip = [.28, .38, .58, .82, 1][Math.min(attemptsSinceWin, 4)];
    const stability = target ? clamp(1 - Math.abs(target.rotation) / Math.PI * .36 - Math.max(0, target.mass - 1) * .035, .45, 1) : 0;
    const winChance = target ? clamp((rarityPenalty * (.35 + precision * .65) + progressiveGrip - .28) * stability, .08, attemptsSinceWin >= 4 ? 1 : .9) : 0;
    const roll = Math.random();
    const decision: RoundDecision = target && roll < winChance ? "win" : target && roll < winChance + .22 ? "near" : "miss";
    pendingDecisionRef.current = decision;
    const nextGripMode: GripMode = decision === "win" ? "firm" : decision === "near" ? "weak" : "none";
    setGripMode(nextGripMode);
    setPhysicalGrip(nextGripMode === "firm");
    window.setTimeout(() => setPhase("lifting"), 1780);
  }, [attemptsSinceWin]);

  const completePhysicalRound = useCallback((delivered: DeliveredPrize | null, physicalOutcome: "collected" | "slipped" | "empty" = delivered ? "collected" : "empty") => {
    const physicalTarget = pendingPhysicalRef.current;
    const decision: RoundDecision = physicalOutcome === "collected" ? "win" : physicalOutcome === "slipped" ? "near" : "miss";
    // The result follows the body that physically remained in the fingers.
    // A neighboring prize may legitimately roll into the grip during closure.
    if (decision === "win" && delivered && physicalTarget) {
      const deliveredLabel = delivered.label;
      const premium = /iPhone|PlayStation|MacBook|Barra de Ouro/i.test(deliveredLabel);
      const mid = /Caixa de Som|Relógio|Headphone|AirFryer|Drone|Câmera/i.test(deliveredLabel);
      const prize: WonPrize = {
        name: deliveredLabel,
        value: premium ? 3899 : mid ? 699 : /Perfume/i.test(deliveredLabel) ? 399 : delivered.mass > 1.5 ? 249 : 99,
        rarity: premium ? "Lendário" : mid ? "Épico" : /Perfume/i.test(deliveredLabel) ? "Raro" : "Comum",
        icon: premium ? "◆" : mid ? "★" : /Perfume/i.test(deliveredLabel) ? "♢" : "●",
        wonAt: Date.now(),
        image: delivered.image || prizeImageFor(deliveredLabel),
      };
      setInventory((items) => [prize, ...items]); setResult(prize); setAttemptsSinceWin(0);
    } else {
      setMissKind(decision === "near" ? "slip" : "empty");
      setResult(null); setAttemptsSinceWin((n) => n + 1);
    }
    pendingPrizeRef.current = undefined;
    pendingPhysicalRef.current = null;
    pendingDecisionRef.current = "miss";
    setPhysicalGrip(false);
    setGripMode("none");
    setPhase("result");
  }, []);

  const completeLegacyRound = useCallback((deliveredLabel: string | null) => {
    const captured = pendingPrizeRef.current;
    if (deliveredLabel && captured) {
      const legacyTarget: PhysicalTarget = {
        id: captured.id,
        label: deliveredLabel,
        image: prizeImageFor(deliveredLabel) ?? "",
        horizontalError: 0,
        rotation: captured.rotation * Math.PI / 180,
        mass: 1,
      };
      pendingPhysicalRef.current = legacyTarget;
      completePhysicalRound({ id: legacyTarget.id, label: legacyTarget.label, image: legacyTarget.image, mass: legacyTarget.mass });
      return;
    }
    completePhysicalRound(null);
  }, [completePhysicalRound]);

  const drop = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "dropping"; setPhase("dropping");
    if (roundTimer.current) clearInterval(roundTimer.current);
    if (engine === "rapier") return;
    const arena = arenaRef.current?.getBoundingClientRect();
    const px = arena ? clawRef.current / 100 * arena.width : 0;
    let target: Prize | undefined; let best = Infinity;
    prizesRef.current.forEach((p) => { const d = Math.abs(p.x / 100 * (arena?.width || 1) - px); if (d < best) { best = d; target = p; } });
    const accuracy = arena ? best / arena.width * 100 : 100;
    setPrizes((items) => items.map((p) => {
      const distance = Math.abs(p.x - clawRef.current);
      if (distance > 18) return p;
      const direction = p.x < clawRef.current ? -1 : 1;
      return { ...p, vx: direction * (1.2 + (18 - distance) * .12), vy: 2.8 + (18 - distance) * .08, rotation: p.rotation + direction * (12 + Math.random() * 18) };
    }));
    finishRound(DEMO_CAPTURE_MODE ? target : accuracy < 9 ? target : undefined, accuracy);
  }, [engine, finishRound]);

  const start = () => {
    if (balance < 4.9 || phase === "dropping" || phase === "lifting") return;
    setSensoryMenu(false);
    if (!DEMO_CAPTURE_MODE) setBalance((b) => +(b - 4.9).toFixed(2));
    setTime(15); setResult(false); setPhysicalGrip(false); setGripMode("none"); setPhase("playing"); phaseRef.current = "playing";
    sensoryEffect("move");
    startAmbience();
    if (prizes.length < 5) setPrizes(makePrizes());
  };

  useEffect(() => {
    if (phase !== "playing") return;
    roundTimer.current = setInterval(() => setTime((t) => { if (t <= 1) { window.setTimeout(drop, 0); return 0; } return t - 1; }), 1000);
    return () => { if (roundTimer.current) clearInterval(roundTimer.current); };
  }, [phase, drop, resumeSignal]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (phaseRef.current === "playing") {
        if (keys.current.left) move(-.34);
        if (keys.current.right) move(.34);
        if (Math.abs(analogVector.current.x) > .18) move(analogVector.current.x * .42);
      }
      setPrizes((items) => items.map((p) => {
        const moving = Math.abs(p.vx) > .02 || Math.abs(p.vy) > .02 || p.y > 0;
        if (!moving) return p;
        const nextY = Math.max(0, p.y + p.vy);
        return { ...p, x: clamp(p.x + p.vx, 6, 94), y: nextY, vx: p.vx * .92, vy: nextY === 0 ? 0 : p.vy - .24, rotation: p.rotation + p.vx * 1.8 };
      }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [move]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"].includes(e.key)) e.preventDefault(); if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") { keys.current.left = true; setJoyDirection("left"); } if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") { keys.current.right = true; setJoyDirection("right"); } if (!e.repeat && (e.key === "ArrowUp" || e.key.toLowerCase() === "w")) pulseVertical("up"); if (!e.repeat && (e.key === "ArrowDown" || e.key.toLowerCase() === "s")) pulseVertical("down"); if (e.key === " " || e.key === "Enter") drop(); };
    const up = (e: KeyboardEvent) => { if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") { keys.current.left = false; setJoyDirection(keys.current.right ? "right" : null); } if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") { keys.current.right = false; setJoyDirection(keys.current.left ? "left" : null); } };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [drop, pulseVertical]);

  const pointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "playing" || !arenaRef.current) return;
    if (e.pointerType !== "mouse" || e.buttons === 1) { const r = arenaRef.current.getBoundingClientRect(); setClawX(clamp((e.clientX - r.left) / r.width * 100, 4, 96)); }
  };

  const resetResult = () => {
    clawRef.current = 50;
    setClawX(50);
    setPhase("idle");
    phaseRef.current = "idle";
    setResult(false);
  };

  const pileMode = variant === "pile";

  const outcomeClass = phase === "result" ? result ? " outcome-win" : missKind === "slip" ? " outcome-near" : " outcome-miss" : "";

  return <main className={`${pileMode ? "pile-mode" : "rows-mode"}${outcomeClass}`}>
    <header>
      <a className="brand" href="#top"><span>G</span><div>GARRA<b>PREMIADA</b></div></a>
      <nav><a className="active" href="#play">JOGAR</a><a href="#machines">SALÃO</a><a href="#inventory">INVENTÁRIO <i>{inventory.length}</i></a></nav>
      <div className="wallet"><small>SALDO DEMO</small><strong>{money(balance)}</strong><button onClick={() => setBalance((b) => b + 25)}>+ CRÉDITOS</button></div>
    </header>

    <section className="machine-picker" id="machines">
      <div className="picker-title"><small>♛ GARRA PREMIADA</small><h1>UMA GARRA. <em>PRÊMIOS INCRÍVEIS.</em></h1><p>Precisão, física e emoção de salão.</p></div>
      <div className="machine-list">{MACHINES.map((m, i) => <button key={m.name} className={i === 0 ? "selected" : ""} style={{ "--machine": m.color } as React.CSSProperties}>
        <span className="machine-icon">{m.icon}</span><span><b>{m.name}</b><small>{m.sub}</small></span><em>{money(m.price)}</em>{i > 0 && <i>EM BREVE</i>}
      </button>)}</div>
    </section>

    <section className="play-layout" id="play">
      <aside className="info-panel">
        <div className="live"><i /> MÁQUINA AO VIVO</div><h2>GARRA<br /><em>PREMIADA</em></h2><p>{pileMode ? "Uma caixa funda onde todos os itens caem, se amontoam, colidem e mudam a cada jogada." : "Uma caixa física cheia de itens premium que tombam, colidem e escapam como em uma garra real."}</p>
        <div className="price"><span>JOGADA</span><strong>{money(4.9)}</strong></div>
        <dl><div><dt>TEMPO</dt><dd>15 SEG</dd></div><div><dt>ITENS</dt><dd>{pileMode ? "15 PREMIUM" : "24 NA CAIXA"}</dd></div><div><dt>FORÇA</dt><dd>{["BAIXA", "MÉDIA", "ALTA", "MÁXIMA", "GARANTIDA"][Math.min(attemptsSinceWin, 4)]}</dd></div></dl>
        <div className="legend"><span>RARIDADES</span>{["Comum", "Raro", "Épico", "Lendário"].map((r) => <i className={rarityClass(r as Rarity)} key={r}>{r}</i>)}</div>
        <button className="sound" onClick={() => setSound(!sound)}>{sound ? "♪ SOM ATIVO" : "♪ SOM DESATIVADO"}</button>
      </aside>

      <div className={`cabinet phase-${phase}`}>
        <div className="orientation-notice"><i>↻</i><b>GIRE O CELULAR</b><small>A máquina foi projetada para jogar na vertical</small></div>
        <div className="cabinet-top"><button className="top-back" aria-label="Voltar" onClick={() => { sensoryEffect("button"); window.location.href="/maquinas"; }}>←</button><b>{pileMode ? <>GARRA <em>MILIONÁRIA</em><small>2D</small></> : <>GARRA <em>PREMIADA</em></>}</b><div className="top-balance"><span>◆</span><b>{balance.toFixed(0)}</b><button onClick={() => { sensoryEffect("button"); setBalance((value) => value + 25); }}>+</button></div><button className="top-menu" aria-label="Abrir controles da experiência" onClick={() => { sensoryEffect("button"); setSensoryMenu((open) => !open); }}>☰</button></div>
        {sensoryMenu && <div className="sensory-menu">
          <span>EXPERIÊNCIA</span>
          <button className={vibration ? "active" : ""} onClick={() => { sensoryEffect("button"); setVibration((enabled) => !enabled); }}><i>≈</i><b>VIBRAÇÃO</b><small>{vibration ? "ATIVA" : "DESLIGADA"}</small></button>
        </div>}
        <div className={`arena vault-arena light-${phase}`} ref={arenaRef} onPointerMove={pointerMove} onPointerDown={pointerMove}>
          <div className="led-frame" aria-hidden="true"><i /><i /><i /><i /></div>
          {engine === "rapier"
            ? <RapierClawMachine clawX={clawX} clawDepth={clawDepth} phase={phase} gripMode={gripMode} onTargetAcquired={acquirePhysicalTarget} onRoundComplete={completePhysicalRound} />
            : <PhysicsBin clawX={clawX} clawDepth={clawDepth} phase={phase} gripEnabled={physicalGrip} onRoundComplete={completeLegacyRound} variant={variant} debug={debugPhysics} />}
          <div className="rail"><i /></div>
          {pileMode && engine === "matter" && <button className={`physics-debug ${debugPhysics ? "active" : ""}`} onClick={() => setDebugPhysics((value) => !value)}>◎ FÍSICA</button>}
          <div className="vault-tip"><span>♛</span><b>MIRE ENTRE OS OBJETOS</b><small>A posição e o contato alteram toda a pilha</small></div>
          {phase === "idle" && !pileMode && <div className="ready"><small>RODADA DISPONÍVEL</small><h3>SUA VEZ NA GARRA</h3><button onClick={start}>INICIAR POR {money(4.9)} <span>→</span></button><p>Créditos demonstrativos · sem valor real</p></div>}
        </div>
        <div className="console">
          <div className={`joystick-control${joyDirection ? ` is-${joyDirection}` : ""}${joyActive ? " is-analog" : ""}`} role="application" aria-label="Joystick analógico para mover a garra" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} onPointerDown={beginAnalogJoystick} onPointerMove={(event) => { if (analogOrigin.current) { event.preventDefault(); updateAnalogJoystick(event); } }} onPointerUp={releaseJoystick} onPointerCancel={releaseJoystick} onLostPointerCapture={releaseJoystick}>
            <button className="joy-up" aria-label="Mover para cima" disabled={phase !== "playing" || clawDepth === 0} onPointerDown={(event) => { event.stopPropagation(); pulseVertical("up"); }}>▲</button>
            <button className="joy-left" aria-label="Mover para esquerda" disabled={phase !== "playing"} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); pressHorizontal("left"); }}>◀</button>
            <i className="joy-knob" style={joyActive ? { transform: `translate(${(joyVector.x * 13).toFixed(1)}px, ${(joyVector.y * 11).toFixed(1)}px) rotate(${(joyVector.x * 13).toFixed(1)}deg)` } : undefined} />
            <button className="joy-right" aria-label="Mover para direita" disabled={phase !== "playing"} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); pressHorizontal("right"); }}>▶</button>
            <button className="joy-down" aria-label="Mover para baixo" disabled={phase !== "playing" || clawDepth === 3} onPointerDown={(event) => { event.stopPropagation(); pulseVertical("down"); }}>▼</button>
            <small>{pileMode ? "ALTURA" : "NÍVEL"} {clawDepth + 1}</small>
          </div>
          <div className="control-hint"><span>←</span><span>→</span><p><b>MOVER GARRA</b><small>A/D · ARRASTE</small></p></div>
          {pileMode && <div className={`machine-display${phase === "playing" && time <= 5 ? " is-urgent" : ""}`} aria-live="polite">
            <span>{phase === "playing" ? "TEMPO" : phase === "dropping" || phase === "lifting" ? "GARRA" : "JOGADAS"}</span>
            <b>{phase === "playing" ? String(time).padStart(2, "0") : phase === "dropping" || phase === "lifting" ? "--" : String(Math.max(0, Math.floor(balance / 4.9))).padStart(2, "0")}</b>
            <small>{phase === "playing" ? "SEG" : phase === "dropping" || phase === "lifting" ? "EM CURSO" : "CRÉDITOS"}</small>
          </div>}
          <button
            className={`drop-button action-${phase}`}
            disabled={phase === "dropping" || phase === "lifting"}
            onClick={phase === "idle" ? start : phase === "playing" ? drop : phase === "result" ? resetResult : undefined}
          ><i>{phase === "idle" ? "▶" : phase === "playing" ? "▼" : phase === "result" ? "↻" : "•"}</i><span>{phase === "idle" ? "JOGAR" : phase === "playing" ? "PEGAR" : phase === "result" ? "DE NOVO" : "AGUARDE"}<small>{phase === "idle" ? money(4.9) : phase === "playing" ? "DESCER GARRA" : "MÁQUINA EM MOVIMENTO"}</small></span></button>
          <div className="round-status"><i className={phase === "playing" ? "on" : ""} /><span>{phase === "playing" ? "RODADA EM CURSO" : phase === "dropping" || phase === "lifting" ? "GARRA EM MOVIMENTO" : "AGUARDANDO JOGADA"}</span></div>
        </div>
        <nav className="game-nav"><a className="active" href="#play"><span>♛</span>MÁQUINA</a><a href="#inventory"><span>♜</span>PRÊMIOS</a><button><span>↻</span>HISTÓRICO</button><button><span>●</span>PERFIL</button></nav>
      </div>
    </section>

    <section className="how"><span>COMO FUNCIONA</span><div><b>01</b><h3>POSICIONE</h3><p>Use as setas, A/D, mouse ou toque para alinhar a garra.</p></div><div><b>02</b><h3>DESÇA</h3><p>Escolha a abertura certa e acione a garra no momento preciso.</p></div><div><b>03</b><h3>ACOMPANHE</h3><p>Os itens colidem, tombam, escapam ou seguem até a saída.</p></div></section>
    <section className="inventory" id="inventory"><div><small>◆ SUA COLEÇÃO</small><h2>MEU INVENTÁRIO</h2><p>Os itens ganhos ficam salvos neste dispositivo.</p></div><div className="inventory-grid">{inventory.length ? inventory.map((item, i) => <article className={rarityClass(item.rarity)} key={item.wonAt + i}><span>{item.icon}</span><small>{item.rarity}</small><b>{item.name}</b><em>{money(item.value)}</em></article>) : <div className="empty"><span>◇</span><b>NENHUM ITEM AINDA</b><p>Seu próximo prêmio está na caixa da garra.</p></div>}</div></section>
    <footer><div className="brand"><span>G</span><div>GARRA<b>PREMIADA</b></div></div><p>PROTÓTIPO DEMONSTRATIVO · SEM PAGAMENTOS OU PRÊMIOS REAIS</p><p>JOGUE COM RESPONSABILIDADE · +18</p></footer>

    {phase === "result" && <div className={`modal ${result ? "modal-win" : missKind === "slip" ? "modal-near" : "modal-miss"}`} role="dialog" aria-modal="true"><div className={`result ${result ? rarityClass(result.rarity) : "miss"}`}>
      {result && <div className="result-sparks" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>}
      <button className="modal-close" onClick={resetResult}>×</button>{result ? <><small>♛ CAPTURA CONFIRMADA</small><div className="burst">{result.image ? <img src={result.image} alt="" /> : <span>{result.icon}</span>}</div><em>{result.rarity}</em><h2>{result.name}</h2><p>Valor estimado <b>{money(result.value)}</b></p><button onClick={resetResult}>GUARDAR E JOGAR NOVAMENTE</button></> : missKind === "slip" ? <><small>POR UM TRIZ!</small><div className="burst near-burst"><span>✦</span></div><h2>ESCAPOU NA SUBIDA</h2><p>O prêmio chegou a encaixar, mas perdeu apoio durante o transporte.</p><button onClick={resetResult}>TENTAR NOVAMENTE</button></> : <><small>NÃO ENCAIXOU</small><div className="burst miss-burst"><span>⌁</span></div><h2>A GARRA VOLTOU VAZIA</h2><p>Mude um pouco a posição e procure um objeto com espaço nas laterais.</p><button onClick={resetResult}>TENTAR NOVAMENTE</button></>}
    </div></div>}
  </main>;
}
