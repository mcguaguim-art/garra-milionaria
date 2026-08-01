"use client";

import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

type Phase = "idle" | "playing" | "dropping" | "lifting" | "result";
type Shape = "box" | "rounded" | "trapezoid" | "headset" | "bottle" | "drone" | "appliance" | "camera";
type Product = { image: string; label: string; w: number; h: number; density: number; friction: number; bounce: number; scale: number; shape?: Shape; air?: number; centerY?: number };
type PieceView = { id: number; x: number; y: number; angle: number; w: number; h: number; scale: number; bodyW: number; bodyH: number; image: string; label: string; hue: number; tone: number; shape: Shape; delivering: boolean };
type ClawView = { x: number; y: number; grip: number; carrying: boolean; swing: number };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const PRODUCTS: Product[] = [
  { image: "/prizes/calibrated/phone.png", label: "Smartphone Pro", w: 56, h: 79, density: .0085, friction: .86, bounce: .018, scale: 1, shape: "rounded", air: .038, centerY: 2 },
  { image: "/prizes/calibrated/console.png", label: "Console Next", w: 82, h: 82, density: .0105, friction: .9, bounce: .012, scale: 1, shape: "rounded", air: .032, centerY: 4 },
  { image: "/prizes/calibrated/headphones.png", label: "Headphone Gold", w: 66, h: 84, density: .0058, friction: .79, bounce: .028, scale: 1, shape: "headset", air: .05, centerY: 7 },
  { image: "/prizes/calibrated/earbuds.png", label: "Fones Pro", w: 60, h: 52, density: .0052, friction: .8, bounce: .025, scale: 1, shape: "rounded", air: .052 },
  { image: "/prizes/calibrated/perfume.png", label: "Perfume Árabe", w: 62, h: 72, density: .0105, friction: .9, bounce: .012, scale: 1, shape: "bottle", air: .032, centerY: 5 },
  { image: "/prizes/calibrated/watch.png", label: "Relógio Premium", w: 60, h: 46, density: .0062, friction: .82, bounce: .025, scale: 1, shape: "rounded", air: .05 },
  { image: "/prizes/calibrated/assad.png", label: "Perfume Asad", w: 48, h: 102, density: .0115, friction: .92, bounce: .008, scale: 1, shape: "bottle", air: .03, centerY: 10 },
  { image: "/prizes/calibrated/club-de-nuit.png", label: "Club de Nuit", w: 55, h: 85, density: .0108, friction: .91, bounce: .01, scale: 1, shape: "bottle", air: .032, centerY: 7 },
  { image: "/prizes/calibrated/speaker.png", label: "Caixa de Som", w: 88, h: 51, density: .0102, friction: .89, bounce: .012, scale: 1, shape: "rounded", air: .036 },
  { image: "/prizes/calibrated/iphone14.png", label: "iPhone 14", w: 56, h: 73, density: .0082, friction: .86, bounce: .016, scale: 1, shape: "rounded", air: .04, centerY: 2 },
  { image: "/prizes/calibrated/playstation5.png", label: "PlayStation 5", w: 58, h: 104, density: .012, friction: .91, bounce: .008, scale: 1, shape: "trapezoid", air: .03, centerY: 8 },
  { image: "/prizes/calibrated/dinheiro.png", label: "Maço de Dinheiro", w: 82, h: 75, density: .0068, friction: .88, bounce: .018, scale: 1, shape: "box", air: .045, centerY: 1 },
  { image: "/prizes/calibrated/perfume-viking.png", label: "Perfume Viking", w: 55, h: 82, density: .0108, friction: .91, bounce: .01, scale: 1, shape: "bottle", air: .032, centerY: 7 },
  { image: "/prizes/calibrated/relogio-inteligente.png", label: "Relógio Inteligente", w: 48, h: 82, density: .0058, friction: .79, bounce: .028, scale: 1, shape: "rounded", air: .052 },
  { image: "/prizes/calibrated/perfume-club-de-nuit.png", label: "Perfume Club de Nuit", w: 54, h: 84, density: .0109, friction: .91, bounce: .01, scale: 1, shape: "bottle", air: .032, centerY: 7 },
  { image: "/prizes/calibrated/macbook.png", label: "MacBook", w: 92, h: 61, density: .012, friction: .93, bounce: .006, scale: 1, shape: "trapezoid", air: .03, centerY: 5 },
  { image: "/prizes/calibrated/airfryer.png", label: "AirFryer Premium", w: 72, h: 93, density: .0135, friction: .93, bounce: .006, scale: 1, shape: "appliance", air: .028, centerY: 9 },
  { image: "/prizes/calibrated/gold-bar.png", label: "Barra de Ouro", w: 76, h: 69, density: .018, friction: .92, bounce: .003, scale: 1, shape: "trapezoid", air: .022, centerY: 5 },
  { image: "/prizes/calibrated/drone.png", label: "Drone Premium", w: 98, h: 53, density: .0062, friction: .78, bounce: .02, scale: 1, shape: "drone", air: .055 },
  { image: "/prizes/calibrated/camera.png", label: "Câmera Mirrorless", w: 82, h: 60, density: .0125, friction: .9, bounce: .008, scale: 1, shape: "camera", air: .032, centerY: 3 },
  { image: "/prizes/calibrated/gift.png", label: "Caixa Surpresa", w: 65, h: 72, density: .0074, friction: .87, bounce: .018, scale: 1, shape: "box", air: .04 },
  { image: "/prizes/calibrated/dinheiro.png", label: "Bloco de Dinheiro", w: 82, h: 75, density: .0068, friction: .88, bounce: .018, scale: 1, shape: "box", air: .045, centerY: 1 },
  { image: "/prizes/calibrated/iphone14.png", label: "iPhone Premium", w: 56, h: 73, density: .0082, friction: .86, bounce: .016, scale: 1, shape: "rounded", air: .04, centerY: 2 },
  { image: "/prizes/calibrated/perfume-viking.png", label: "Perfume Árabe Gold", w: 55, h: 82, density: .0108, friction: .91, bounce: .01, scale: 1, shape: "bottle", air: .032, centerY: 7 },
];

export default function PhysicsBin({ clawX, clawDepth, phase, gripEnabled, onRoundComplete, variant = "rows", debug = false }: { clawX: number; clawDepth: number; phase: Phase; gripEnabled: boolean; onRoundComplete: (deliveredLabel: string | null) => void; variant?: "rows" | "pile"; debug?: boolean }) {
  const [pieces, setPieces] = useState<PieceView[]>([]);
  const [clawView, setClawView] = useState<ClawView>({ x: 400, y: 60, grip: 0, carrying: false, swing: 0 });
  const engineRef = useRef<Matter.Engine | null>(null);
  const clawParts = useRef<Matter.Body[]>([]);
  const phaseRef = useRef(phase);
  const clawXRef = useRef(clawX);
  const clawDepthRef = useRef(clawDepth);
  const motionStart = useRef(0);
  const gripRef = useRef<Matter.Constraint | null>(null);
  const heldBodyRef = useRef<Matter.Body | null>(null);
  const gripEnabledRef = useRef(gripEnabled);
  const completionSentRef = useRef(false);
  const onRoundCompleteRef = useRef(onRoundComplete);

  useEffect(() => { clawXRef.current = clawX; }, [clawX]);
  useEffect(() => { clawDepthRef.current = clawDepth; }, [clawDepth]);
  useEffect(() => { gripEnabledRef.current = gripEnabled; }, [gripEnabled]);
  useEffect(() => { onRoundCompleteRef.current = onRoundComplete; }, [onRoundComplete]);
  useEffect(() => { phaseRef.current = phase; motionStart.current = performance.now(); if (phase === "dropping") completionSentRef.current = false; }, [phase]);

  useEffect(() => {
    const { Engine, Bodies, Body, Composite } = Matter;
    const engine = Engine.create({ gravity: { x: 0, y: variant === "pile" ? 1.38 : 1.05 } });
    engineRef.current = engine;
    const isPile = variant === "pile";
    const shelfLevels = [235, 325, 415, 505];
    const shelfGeometry = [{ x: 350, w: 600 }, { x: 345, w: 630 }, { x: 340, w: 650 }, { x: 334, w: 668 }];
    const rowCategories = [0x0010, 0x0020, 0x0040, 0x0080];
    const shelves = isPile ? [] : shelfLevels.map((y, index) => Bodies.rectangle(shelfGeometry[index].x, y, shelfGeometry[index].w, 18, { isStatic: true, friction: .92, label: `shelf-${index}`, collisionFilter: { category: 0x0002 } }));
    const floor = Bodies.rectangle(isPile ? 400 : 330, isPile ? 526 : 548, isPile ? 800 : 660, isPile ? 38 : 30, { isStatic: true, friction: .9, collisionFilter: { category: 0x0002 } });
    const chuteFloor = Bodies.rectangle(746, 536, 125, 26, { isStatic: true, friction: .65 });
    const left = Bodies.rectangle(-8, 270, 28, 560, { isStatic: true });
    const right = Bodies.rectangle(808, 270, 28, 560, { isStatic: true });
    const chuteCategory = 0x0100;
    const chuteWall = Bodies.rectangle(682, isPile ? 342 : 474, isPile ? 18 : 12, isPile ? 390 : 90, { isStatic: true, angle: isPile ? 0 : -.2, friction: .82, label: "chute-gate", collisionFilter: { category: chuteCategory, mask: 0xffff } });
    const prizeBodies = Array.from({ length: isPile ? 32 : 24 }, (_, id) => {
      const product = PRODUCTS[id % PRODUCTS.length];
      const row = Math.floor(id / 6);
      const geometry = shelfGeometry[Math.min(row, 3)];
      const x = isPile ? 52 + (id % 8) * 94 + Math.random() * 10 : geometry.x - geometry.w / 2 + 55 + (id % 6) * ((geometry.w - 110) / 5) + (Math.random() * 10 - 5);
      const y = isPile ? 120 + Math.floor(id / 8) * 78 + Math.random() * 22 : shelfLevels[row] - product.h * .5 - 18 - Math.random() * 22;
      const bodyW = product.w * product.scale;
      const bodyH = product.h * product.scale;
      const bodyOptions: Matter.IBodyDefinition = {
        restitution: isPile ? Math.min(.035, product.bounce) : product.bounce,
        friction: isPile ? Math.max(.82, product.friction) : product.friction,
        frictionStatic: isPile ? .96 : Math.min(.94, product.friction + .12),
        frictionAir: isPile ? (product.air ?? .032) : .008,
        density: isPile ? Math.max(.0075, product.density * 1.75) : product.density,
        chamfer: { radius: product.shape === "rounded" ? Math.min(11, bodyW * .14) : product.w > 85 ? 8 : 4 }, angle: (Math.random() - .5) * .32,
        label: `prize-${id}`,
        collisionFilter: { category: isPile ? rowCategories[0] : rowCategories[row], mask: 0xffff },
      };
      const partOptions: Matter.IBodyDefinition = { ...bodyOptions, angle: 0 };
      let body: Matter.Body;
      if (product.shape === "trapezoid") body = Bodies.trapezoid(x, y + (product.centerY ?? 0), bodyW, bodyH, .16, bodyOptions);
      else if (product.shape === "headset") {
        const crown = Bodies.rectangle(x, y - bodyH * .22, bodyW * .82, bodyH * .34, partOptions);
        const leftCup = Bodies.rectangle(x - bodyW * .35, y + bodyH * .16, bodyW * .27, bodyH * .55, { ...partOptions, chamfer: { radius: 7 } });
        const rightCup = Bodies.rectangle(x + bodyW * .35, y + bodyH * .16, bodyW * .27, bodyH * .55, { ...partOptions, chamfer: { radius: 7 } });
        body = Body.create({ ...bodyOptions, parts: [crown, leftCup, rightCup], label: `prize-${id}` });
      } else if (product.shape === "bottle") {
        const bottleBase = Bodies.rectangle(x, y + bodyH * .12, bodyW * .82, bodyH * .72, { ...partOptions, chamfer: { radius: 8 } });
        const bottleShoulder = Bodies.trapezoid(x, y - bodyH * .25, bodyW * .62, bodyH * .22, .25, partOptions);
        const bottleCap = Bodies.rectangle(x, y - bodyH * .43, bodyW * .31, bodyH * .18, { ...partOptions, chamfer: { radius: 3 } });
        body = Body.create({ ...bodyOptions, parts: [bottleBase, bottleShoulder, bottleCap], label: `prize-${id}` });
      } else if (product.shape === "drone") {
        const droneCore = Bodies.rectangle(x, y, bodyW * .36, bodyH * .42, { ...partOptions, chamfer: { radius: 6 } });
        const droneArmA = Bodies.rectangle(x, y, bodyW * .9, bodyH * .15, { ...partOptions, angle: .28, chamfer: { radius: 4 } });
        const droneArmB = Bodies.rectangle(x, y, bodyW * .9, bodyH * .15, { ...partOptions, angle: -.28, chamfer: { radius: 4 } });
        body = Body.create({ ...bodyOptions, parts: [droneCore, droneArmA, droneArmB], label: `prize-${id}` });
      } else if (product.shape === "appliance") {
        const applianceBody = Bodies.trapezoid(x, y + bodyH * .05, bodyW * .82, bodyH * .86, -.08, { ...partOptions, chamfer: { radius: 10 } });
        const applianceFoot = Bodies.rectangle(x, y + bodyH * .46, bodyW * .62, bodyH * .1, { ...partOptions, chamfer: { radius: 3 } });
        body = Body.create({ ...bodyOptions, parts: [applianceBody, applianceFoot], label: `prize-${id}` });
      } else if (product.shape === "camera") {
        const cameraBody = Bodies.rectangle(x, y + bodyH * .08, bodyW * .72, bodyH * .62, { ...partOptions, chamfer: { radius: 7 } });
        const cameraGrip = Bodies.rectangle(x + bodyW * .32, y + bodyH * .05, bodyW * .22, bodyH * .54, { ...partOptions, chamfer: { radius: 5 } });
        const cameraLens = Bodies.circle(x - bodyW * .06, y + bodyH * .08, bodyH * .27, partOptions);
        body = Body.create({ ...bodyOptions, parts: [cameraBody, cameraGrip, cameraLens], label: `prize-${id}` });
      } else body = Bodies.rectangle(x, y + (product.centerY ?? 0), bodyW, bodyH, bodyOptions);
      Body.setAngularVelocity(body, (Math.random() - .5) * .012);
      return body;
    });
    const clawFilter = { group: -2, category: 0x0004, mask: isPile ? rowCategories[0] : rowCategories[clawDepthRef.current] };
    const clawMaterial = { isStatic: true, friction: .72, restitution: .01, collisionFilter: clawFilter };
    const hub = Bodies.circle(400, 60, 20, { ...clawMaterial, label: "claw-hub" });
    const armL = Bodies.trapezoid(366, 103, 20, 96, .22, { ...clawMaterial, label: "claw-left", chamfer: { radius: 7 } });
    const armC = Bodies.trapezoid(400, 108, 14, 98, .16, {
      ...clawMaterial,
      isSensor: isPile,
      label: "claw-center",
      chamfer: { radius: 5 },
    });
    const armR = Bodies.trapezoid(434, 103, 20, 96, .22, { ...clawMaterial, label: "claw-right", chamfer: { radius: 7 } });
    clawParts.current = [hub, armL, armC, armR];
    Composite.add(engine.world, isPile ? [floor, left, right, ...prizeBodies, hub, armL, armC, armR] : [floor, ...shelves, chuteFloor, left, right, chuteWall, ...prizeBodies, hub, armL, armC, armR]);
    if (isPile) {
      for (let step = 0; step < 90; step += 1) Engine.update(engine, 1000 / 60);
      prizeBodies.forEach((body) => {
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
      });
    }

    let frame = 0; let last = performance.now();
    let lastViewUpdate = 0;
    let lockedDropY = isPile ? 420 : 340;
    let actualDropY = 60;
    let resistanceMs = 0;
    let lastPhaseSeen: Phase = phaseRef.current;
    let gripCandidate: Matter.Body | null = null;
    const collectedBodies = new Set<Matter.Body>();
    let portalLabel: string | null = null;
    const tick = (now: number) => {
      const delta = Math.min(16.667, now - last); last = now;
      const playerX = clawXRef.current / 100 * 800;
      const maximumDropY = isPile ? ([350, 385, 420, 455][clawDepthRef.current] ?? 420) : ([160, 250, 340, 430][clawDepthRef.current] ?? 340);
      if (phaseRef.current !== lastPhaseSeen) {
        if (phaseRef.current === "dropping") {
          lockedDropY = maximumDropY;
          actualDropY = 60;
          resistanceMs = 0;
          gripCandidate = null;
          armL.isSensor = false;
          armR.isSensor = false;
          armC.isSensor = isPile;
        }
        if (phaseRef.current === "lifting") {
          lockedDropY = actualDropY;
          if (isPile) {
            const jawY = actualDropY + 78;
            gripCandidate = prizeBodies
              .map((body) => {
                const contacts = [armL, armC, armR].filter(
                  (finger) => Matter.Query.collides(finger, [body]).length > 0,
                ).length;
                const overlap = Math.max(
                  0,
                  Math.min(body.bounds.max.x, playerX + 43)
                    - Math.max(body.bounds.min.x, playerX - 43),
                );
                const overlapRatio = overlap / Math.max(1, body.bounds.max.x - body.bounds.min.x);
                const verticalFit = body.bounds.min.y < actualDropY + 126
                  && body.bounds.max.y > actualDropY + 40;
                const score = contacts * 120 + overlapRatio * 70
                  - Math.abs(body.position.x - playerX) * 1.15
                  - Math.abs(body.position.y - jawY) * .32;
                return { body, contacts, overlapRatio, verticalFit, score };
              })
              .filter(({ contacts, overlapRatio, verticalFit }) =>
                verticalFit && contacts >= 1 && overlapRatio >= .28,
              )
              .sort((a, b) => b.score - a.score)[0]?.body ?? null;

            // Once a single prize has been identified, closing the articulated
            // fingers must not sweep or compress all neighboring prizes.
            armL.isSensor = true;
            armR.isSensor = true;
          }
        }
        lastPhaseSeen = phaseRef.current;
      }
      const targetDropY = isPile && (phaseRef.current === "dropping" || phaseRef.current === "lifting") ? lockedDropY : maximumDropY;
      const selectedCategory = isPile ? rowCategories[0] : (rowCategories[clawDepthRef.current] ?? rowCategories[2]);
      const elapsed = now - motionStart.current;
      let targetX = playerX; let clawY = 60; let grip = 0;
      if (phaseRef.current === "dropping") {
        const desiredDropY = 60 + (1 - Math.pow(1 - Math.min(1, elapsed / 900), 3)) * (targetDropY - 60);
        if (isPile) {
          const leftTouches = prizeBodies.filter((body) => Matter.Query.collides(armL, [body]).length > 0);
          const rightTouches = prizeBodies.filter((body) => Matter.Query.collides(armR, [body]).length > 0);
          const centerTouches = prizeBodies.filter((body) => Matter.Query.collides(armC, [body]).length > 0);
          const sideTouches = Array.from(new Set([...leftTouches, ...rightTouches]));
          const allTouches = Array.from(new Set([...sideTouches, ...centerTouches]));
          const contactLoad = sideTouches.reduce(
            (load, body) => load + Math.min(2.2, Math.max(.35, body.mass / 8)),
            0,
          );

          if (allTouches.length === 0) {
            resistanceMs = Math.max(0, resistanceMs - delta * 2);
            actualDropY = Math.min(desiredDropY, actualDropY + Math.max(1.4, delta * .42));
          } else {
            resistanceMs += delta * Math.max(.7, contactLoad);
            const crowded = sideTouches.length >= 2 || contactLoad >= 2.5;
            const contactAdvance = crowded ? .06 : centerTouches.length ? .22 : .38;
            if (resistanceMs < (crowded ? 115 : 230)) {
              actualDropY = Math.min(desiredDropY, actualDropY + delta * contactAdvance);
            }
          }
          clawY = actualDropY;
        } else {
          actualDropY = desiredDropY;
          clawY = desiredDropY;
        }
      }
      if (phaseRef.current === "lifting") {
        const closeProgress = clamp(elapsed / 560, 0, 1);
        const easedGrip = closeProgress * closeProgress * (3 - 2 * closeProgress);
        grip = elapsed < 2820 ? easedGrip : Math.max(0, 1 - (elapsed - 2820) / 300);
        if (elapsed < 560) clawY = targetDropY;
        else if (elapsed < 1740) clawY = targetDropY - (1 - Math.pow(1 - (elapsed - 560) / 1180, 3)) * (targetDropY - 60);
        else { clawY = 60; targetX = playerX + (1 - Math.pow(1 - Math.min(1, (elapsed - 1740) / 1080), 3)) * (748 - playerX); }
        if (!gripRef.current && (!isPile ? gripEnabledRef.current : true) && elapsed > 360 && elapsed < 660) {
          const candidates = isPile
            ? (gripCandidate ? [gripCandidate] : [])
            : prizeBodies.filter((body) => Math.abs(body.position.x - playerX) < 62 && body.bounds.min.y < targetDropY + 122 && body.bounds.max.y > targetDropY + 48);
          const nearest = isPile
            ? candidates[0]
            : candidates.sort((a, b) => Math.hypot(a.position.x - playerX, a.position.y - (targetDropY + 72)) - Math.hypot(b.position.x - playerX, b.position.y - (targetDropY + 72)))[0];
          if (nearest) {
            const fingers = [armL, armC, armR];
            const contactCount = fingers.filter((finger) => Matter.Query.collides(finger, [nearest]).length > 0).length;
            const insideJaw = nearest.bounds.min.x < playerX + 36 && nearest.bounds.max.x > playerX - 36
              && nearest.position.y > targetDropY + 34 && nearest.position.y < targetDropY + 116;
            if (contactCount >= 2 || (contactCount >= 1 && insideJaw)) {
              const offsetX = clamp((playerX - nearest.position.x) * .18, -8, 8);
              const firmGrip = gripEnabledRef.current;
              gripRef.current = Matter.Constraint.create({ bodyA: hub, bodyB: nearest, pointA: { x: 0, y: 76 }, pointB: { x: offsetX, y: 0 }, length: firmGrip ? 4 : 12, stiffness: firmGrip ? .42 : .16, damping: firmGrip ? .3 : .12 });
              heldBodyRef.current = nearest;
              Composite.add(engine.world, gripRef.current);
            }
          }
        }
        if (isPile && !gripEnabledRef.current && gripRef.current && heldBodyRef.current && elapsed > 760) {
          const held = heldBodyRef.current;
          const slip = clamp((elapsed - 760) / 760, 0, 1);
          gripRef.current.stiffness = .16 - slip * .13;
          gripRef.current.damping = .12 - slip * .07;
          gripRef.current.length = 12 + slip * 28;
          const escapeDirection = held.position.x < playerX ? -1 : 1;
          Body.applyForce(held, held.position, {
            x: escapeDirection * held.mass * (.000035 + slip * .000055),
            y: held.mass * (.000018 + slip * .000032),
          });
          Body.setAngularVelocity(held, held.angularVelocity + escapeDirection * .0007);
          if (slip >= 1) {
            Composite.remove(engine.world, gripRef.current); gripRef.current = null;
            heldBodyRef.current = null;
          }
        }
        if (elapsed > 2820 && gripRef.current) {
          const held = heldBodyRef.current;
          if (isPile && held && gripEnabledRef.current) {
            collectedBodies.add(held);
            portalLabel = PRODUCTS[Number(held.label.replace("prize-", "")) % PRODUCTS.length].label;
            Composite.remove(engine.world, held);
          }
          Composite.remove(engine.world, gripRef.current); gripRef.current = null;
          if (!isPile && heldBodyRef.current) heldBodyRef.current.collisionFilter.mask = 0xffff;
          heldBodyRef.current = null;
        }
        if (elapsed > 3300 && !completionSentRef.current) {
          completionSentRef.current = true;
          const held = heldBodyRef.current;
          const delivered = isPile ? portalLabel : (held && held.position.x > 680 && held.position.y > 420 ? PRODUCTS[Number(held.label.replace("prize-", "")) % PRODUCTS.length].label : null);
          onRoundCompleteRef.current(delivered);
          heldBodyRef.current = null;
        }
      }
      Body.setPosition(hub, { x: targetX, y: clawY });
      hub.collisionFilter.mask = selectedCategory;
      armL.collisionFilter.mask = selectedCategory;
      armC.collisionFilter.mask = selectedCategory;
      armR.collisionFilter.mask = selectedCategory;
      const armAngle = (48 - grip * 64) * Math.PI / 180;
      const armHalf = 48;
      const rootY = clawY + 31;
      const leftRootX = targetX - 23;
      const rightRootX = targetX + 23;
      Body.setPosition(armL, { x: leftRootX - Math.sin(armAngle) * armHalf, y: rootY + Math.cos(armAngle) * armHalf });
      Body.setPosition(armR, { x: rightRootX + Math.sin(armAngle) * armHalf, y: rootY + Math.cos(armAngle) * armHalf });
      Body.setPosition(armC, { x: targetX, y: rootY + 49 });
      Body.setAngle(armL, armAngle); Body.setAngle(armC, (5 - grip * 5) * Math.PI / 180); Body.setAngle(armR, -armAngle);
      Engine.update(engine, delta);
      if (isPile) prizeBodies.forEach((body) => {
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed > 7) Body.setVelocity(body, { x: body.velocity.x * 7 / speed, y: body.velocity.y * 7 / speed });
        if (Math.abs(body.angularVelocity) > .085) Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * .085);
      });
      if (now - lastViewUpdate >= 30) {
        lastViewUpdate = now;
        const swing = heldBodyRef.current ? clamp(heldBodyRef.current.velocity.x * 1.8, -12, 12) : 0;
        setClawView({ x: targetX, y: clawY, grip, carrying: Boolean(gripRef.current), swing });
        setPieces(prizeBodies.filter((body) => !collectedBodies.has(body)).map((body) => {
          const id = Number(body.label.replace("prize-", ""));
          const p = PRODUCTS[id % PRODUCTS.length];
          return { id, x: body.position.x, y: body.position.y - (p.centerY ?? 0), angle: body.angle, w: p.w, h: p.h, scale: p.scale, bodyW: p.w * p.scale, bodyH: p.h * p.scale, image: p.image, label: `${p.label} ${1 + Math.floor(id / PRODUCTS.length)}`, hue: (id % 4) * 8 - 12, tone: 1.16 + (id % 3) * .07, shape: p.shape ?? "box", delivering: body === heldBodyRef.current && body.position.x > 660 };
        }));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); Composite.clear(engine.world, false); Engine.clear(engine); engineRef.current = null; };
  }, [variant]);

  return <div className={`matter-bin ${variant === "pile" ? "pile-bin" : ""}`} aria-label={variant === "pile" ? "Caixa funda com prêmios amontoados e gravidade real" : "Caixa de prêmios com física real"}>
    <div className="bin-back" />
    {variant === "rows" && [0, 1, 2, 3].map((row) => <div className={`prize-shelf shelf-${row} ${clawDepth === row ? "active" : ""}`} key={row}><i /><i /><i /><i /><i /><i /><i /><i /></div>)}
    {pieces.map((p) => <div className={`physics-piece ${p.delivering ? "delivering" : ""}`} key={p.id} style={{ left: `${p.x / 8}%`, top: `${p.y / 5.2}%`, width: `${p.w / 8}%`, height: `${p.h / 5.2}%`, transform: `translate(-50%,-50%) rotate(${p.angle}rad)` }}><img src={p.image} alt={p.label} draggable={false} data-physics-x={p.x.toFixed(1)} style={{ transform: `scale(${p.scale * 1.02})`, filter: `hue-rotate(${p.hue}deg) brightness(${p.tone}) saturate(1.12) drop-shadow(0 8px 8px #02030aaa)` }} />{debug && <span className={`physics-outline shape-${p.shape}`} style={{ width: `${p.bodyW / p.w * 100}%`, height: `${p.bodyH / p.h * 100}%` }}><i /></span>}</div>)}
    {variant === "rows" ? <div className="prize-chute"><b>SAÍDA</b><span>▼</span></div> : <div className="delivery-portal"><i /><b>ENTREGA</b><span>→</span></div>}
    <div className={`matter-claw ${clawView.grip > .5 ? "closed" : "open"} ${clawView.carrying ? "holding" : ""}`} style={{ left: `${clawView.x / 8}%`, top: `${clawView.y / 5.2}%`, "--left-angle": `${48 - clawView.grip * 64}deg`, "--right-angle": `${-48 + clawView.grip * 64}deg`, "--center-angle": `${5 - clawView.grip * 5}deg`, "--swing": `${clawView.swing}deg`, "--cable-extra": `${Math.max(0, clawView.y - 60)}px` } as React.CSSProperties}><div className="matter-cable" /><div className="matter-spring" /><div className="claw-yoke"><i /><i /></div><div className="matter-hub"><span className="claw-coupler" /></div><i className="finger left" /><i className="finger center" /><i className="finger right" /></div>
    <div className="bin-glass" />
  </div>;
}
