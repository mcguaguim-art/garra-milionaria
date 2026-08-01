"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type Phase = "idle" | "playing" | "dropping" | "lifting" | "result";
export type GripMode = "none" | "weak" | "firm";
type Props = {
  clawX: number;
  clawDepth: number;
  phase: Phase;
  gripMode: GripMode;
  onTargetAcquired: (target: PhysicalTarget | null) => void;
  onRoundComplete: (delivered: DeliveredPrize | null, physicalOutcome: "collected" | "slipped" | "empty") => void;
};

export type PhysicalTarget = {
  id: number;
  label: string;
  image: string;
  horizontalError: number;
  rotation: number;
  mass: number;
};

export type DeliveredPrize = Pick<PhysicalTarget, "id" | "label" | "image" | "mass">;

type PrizePhysics = {
  image: string;
  label: string;
  width: number;
  height: number;
  mass: number;
  friction: number;
  linearDamping: number;
  angularDamping: number;
  colliderX: number;
  colliderY: number;
  roundness: number;
  shape?: "box" | "bottom-heavy" | "headset" | "drone" | "camera";
  centerY?: number;
};

const PRIZES: PrizePhysics[] = [
  { image: "/prizes/calibrated/iphone14.png", label: "iPhone 14", width: .88, height: 1.18, mass: 1.2, friction: .72, linearDamping: 1.2, angularDamping: 1.5, colliderX: .35, colliderY: .43, roundness: .07 },
  { image: "/prizes/calibrated/playstation5.png", label: "PlayStation 5", width: 1.08, height: 1.40, mass: 2.5, friction: .88, linearDamping: 1.65, angularDamping: 2.5, colliderX: .36, colliderY: .44, roundness: .055, shape: "bottom-heavy", centerY: .04 },
  { image: "/prizes/calibrated/perfume-viking.png", label: "Perfume Viking", width: .90, height: 1.14, mass: 1.7, friction: .68, linearDamping: 1.35, angularDamping: 2, colliderX: .34, colliderY: .43, roundness: .09 },
  { image: "/prizes/calibrated/earbuds.png", label: "Fones Pro", width: .72, height: .63, mass: .65, friction: .76, linearDamping: 1.1, angularDamping: 1.35, colliderX: .36, colliderY: .37, roundness: .12 },
  { image: "/prizes/calibrated/watch.png", label: "Relógio Premium", width: .70, height: .60, mass: .72, friction: .94, linearDamping: 1.25, angularDamping: 1.55, colliderX: .33, colliderY: .32, roundness: .13 },
  { image: "/prizes/calibrated/airfryer.png", label: "AirFryer Premium", width: 1.38, height: 1.38, mass: 3.1, friction: 1.02, linearDamping: 1.95, angularDamping: 3.1, colliderX: .39, colliderY: .42, roundness: .12, shape: "bottom-heavy", centerY: .06 },
  { image: "/prizes/calibrated/dinheiro.png", label: "Bloco de Dinheiro", width: 1.24, height: .80, mass: 1.15, friction: 1.08, linearDamping: 1.6, angularDamping: 2.2, colliderX: .42, colliderY: .35, roundness: .045 },
  { image: "/prizes/calibrated/headphones.png", label: "Headphone Gold", width: 1.12, height: 1.20, mass: 1.05, friction: 1.18, linearDamping: 1.25, angularDamping: 1.5, colliderX: .31, colliderY: .37, roundness: .15, shape: "headset" },
  { image: "/prizes/calibrated/gold-bar.png", label: "Barra de Ouro", width: 1.15, height: .66, mass: 3.2, friction: .62, linearDamping: 1.85, angularDamping: 2.8, colliderX: .41, colliderY: .35, roundness: .035 },
  { image: "/prizes/calibrated/speaker.png", label: "Caixa de Som", width: 1.24, height: .80, mass: 1.9, friction: .92, linearDamping: 1.55, angularDamping: 2.2, colliderX: .40, colliderY: .35, roundness: .15 },
  { image: "/prizes/calibrated/camera.png", label: "Câmera Mirrorless", width: 1.14, height: .86, mass: 2.1, friction: 1.04, linearDamping: 1.7, angularDamping: 2.3, colliderX: .36, colliderY: .36, roundness: .10, shape: "camera", centerY: .04 },
  { image: "/prizes/calibrated/drone.png", label: "Drone Premium", width: 1.26, height: .76, mass: .9, friction: .68, linearDamping: 1.05, angularDamping: 1.2, colliderX: .33, colliderY: .28, roundness: .08, shape: "drone" },
  { image: "/prizes/calibrated/assad.png", label: "Perfume Asad", width: .88, height: 1.10, mass: 1.65, friction: .70, linearDamping: 1.4, angularDamping: 2.05, colliderX: .34, colliderY: .43, roundness: .08 },
  { image: "/prizes/calibrated/macbook.png", label: "MacBook", width: 1.34, height: .82, mass: 2.25, friction: .82, linearDamping: 1.7, angularDamping: 2.45, colliderX: .42, colliderY: .34, roundness: .045 },
  { image: "/prizes/calibrated/phone.png", label: "Smartphone Premium", width: .86, height: 1.16, mass: 1.15, friction: .74, linearDamping: 1.25, angularDamping: 1.55, colliderX: .35, colliderY: .43, roundness: .065 },
];

export default function RapierClawMachine({ clawX, clawDepth, phase, gripMode, onTargetAcquired, onRoundComplete }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const xRef = useRef(clawX);
  const depthRef = useRef(clawDepth);
  const gripRef = useRef(gripMode);
  const targetRef = useRef(onTargetAcquired);
  const completeRef = useRef(onRoundComplete);
  const phaseStarted = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; phaseStarted.current = performance.now(); }, [phase]);
  useEffect(() => { xRef.current = clawX; }, [clawX]);
  useEffect(() => { depthRef.current = clawDepth; }, [clawDepth]);
  useEffect(() => { gripRef.current = gripMode; }, [gripMode]);
  useEffect(() => { targetRef.current = onTargetAcquired; }, [onTargetAcquired]);
  useEffect(() => { completeRef.current = onRoundComplete; }, [onRoundComplete]);
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) hiddenAt.current = performance.now();
      else if (hiddenAt.current !== null) {
        phaseStarted.current += performance.now() - hiddenAt.current;
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let animation = 0;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      const PIXI = await import("pixi.js");
      const RAPIER = await import("@dimforge/rapier2d-compat");
      await RAPIER.init();
      if (cancelled) return;

      const viewportWidth = Math.max(320, host.clientWidth);
      const viewportHeight = Math.max(480, host.clientHeight);
      const navigatorProfile = navigator as Navigator & { deviceMemory?: number };
      const lowPowerDevice = (navigatorProfile.deviceMemory ?? 4) <= 2 || (navigator.hardwareConcurrency ?? 4) <= 4;
      const renderScale = viewportWidth / 8;
      const worldHeight = viewportHeight / renderScale;
      // The playable floor sits above the decorative cabinet base so the pile
      // reads as a deep prize well instead of disappearing under the controls.
      const floorY = worldHeight - 1.48;
      const homeY = 1.04;
      const app = new PIXI.Application();
      await app.init({ width: viewportWidth, height: viewportHeight, antialias: !lowPowerDevice, backgroundAlpha: 0, resolution: lowPowerDevice ? 1 : Math.min(1.5, window.devicePixelRatio || 1), autoDensity: true, powerPreference: lowPowerDevice ? "low-power" : "high-performance" });
      if (cancelled) { app.destroy(true); return; }
      app.canvas.className = "rapier-canvas";
      host.appendChild(app.canvas);

      const world = new RAPIER.World({ x: 0, y: 13.5 });
      world.integrationParameters.dt = 1 / 60;
      world.integrationParameters.numSolverIterations = lowPowerDevice ? 8 : 12;

      const makeWall = (x: number, y: number, w: number, h: number) => {
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
        world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2).setFriction(.88), body);
      };
      makeWall(4, floorY, 8, .32);
      makeWall(-.12, worldHeight / 2, .24, worldHeight);
      makeWall(8.12, worldHeight / 2, .24, worldHeight);

      const leftRamp = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(.28, floorY - .18).setRotation(-.42));
      world.createCollider(RAPIER.ColliderDesc.cuboid(.48, .12).setFriction(1.05), leftRamp);
      const rightRamp = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(7.72, floorY - .18).setRotation(.42));
      world.createCollider(RAPIER.ColliderDesc.cuboid(.48, .12).setFriction(1.05), rightRamp);

      const interiorLayer = new PIXI.Container();
      const lightLayer = new PIXI.Container();
      const rearClawLayer = new PIXI.Container();
      const shadowLayer = new PIXI.Container();
      const prizeLayer = new PIXI.Container();
      const impactLayer = new PIXI.Container();
      const clawLayer = new PIXI.Container();
      app.stage.addChild(interiorLayer, lightLayer, rearClawLayer, shadowLayer, prizeLayer, impactLayer, clawLayer);

      const floorShadow = new PIXI.Graphics();
      floorShadow.poly([
        0, (floorY - 1.18) * renderScale,
        8 * renderScale, (floorY - 1.18) * renderScale,
        8 * renderScale, worldHeight * renderScale,
        0, worldHeight * renderScale,
      ]).fill({ color: 0x070914, alpha: .44 });
      floorShadow.poly([
        .16 * renderScale, (floorY - .48) * renderScale,
        7.84 * renderScale, (floorY - .48) * renderScale,
        8 * renderScale, (floorY + .10) * renderScale,
        0, (floorY + .10) * renderScale,
      ]).fill({ color: 0x161927, alpha: .96 }).stroke({ color: 0xc18a38, width: Math.max(1, renderScale * .035), alpha: .75 });
      for (let line = 1; line < 6; line += 1) {
        const y = floorY - .45 + line * .105;
        floorShadow.moveTo(.12 * renderScale, y * renderScale).lineTo(7.88 * renderScale, y * renderScale)
          .stroke({ color: line % 2 ? 0x34384a : 0x202434, width: 1, alpha: .58 });
      }
      interiorLayer.addChild(floorShadow);
      const spotlight = new PIXI.Graphics();
      const deliveryGlow = new PIXI.Graphics();
      lightLayer.addChild(spotlight);
      impactLayer.addChild(deliveryGlow);
      const impactParticles: Array<{ dot: InstanceType<typeof PIXI.Graphics>; x: number; y: number; vx: number; vy: number; life: number }> = [];
      let impactShakeUntil = 0;
      const prizeBodies: Array<{ id: number; body: InstanceType<typeof RAPIER.RigidBody>; colliders: Array<InstanceType<typeof RAPIER.Collider>>; sprite: InstanceType<typeof PIXI.Sprite>; shadow: InstanceType<typeof PIXI.Graphics>; image: string; label: string; width: number; height: number; mass: number; lastVy: number; impactCooldown: number }> = [];

      const clawSheet = await PIXI.Assets.load("/claw-v2/parts-sheet.png") as InstanceType<typeof PIXI.Texture>;
      await PIXI.Assets.load(Array.from(new Set(PRIZES.map(({ image }) => image))));
      if (cancelled) { app.destroy(true); return; }

      const sheetTexture = (x: number, y: number, width: number, height: number) => new PIXI.Texture({
        source: clawSheet.source,
        frame: new PIXI.Rectangle(x, y, width, height),
      });
      const motorTexture = sheetTexture(455, 36, 345, 430);
      const pistonTexture = sheetTexture(555, 510, 145, 492);
      const rodTexture = sheetTexture(196, 592, 98, 592);
      const fingerTexture = sheetTexture(895, 552, 205, 684);
      const boltTexture = sheetTexture(556, 1068, 132, 145);

      for (let i = 0; i < 18; i += 1) {
        const basePrize = PRIZES[i % PRIZES.length];
        const prize = {
          ...basePrize,
          width: basePrize.width * 1.14,
          height: basePrize.height * 1.14,
          mass: basePrize.mass * 1.08,
        };
        const row = Math.floor(i / 6);
        const x = .55 + (i % 6) * 1.38 + (row % 2) * .12;
        const y = floorY - 3.48 - row * 1.04 - (i % 3) * .08;
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y)
            .setRotation(((i * 19) % 25 - 12) * Math.PI / 180)
            .setLinearDamping(prize.linearDamping)
            .setAngularDamping(prize.angularDamping)
            .setCcdEnabled(true),
        );
        const colliders: Array<InstanceType<typeof RAPIER.Collider>> = [];
        const material = (collider: InstanceType<typeof RAPIER.ColliderDesc>, mass: number) => collider
          .setMass(mass)
          .setFriction(prize.friction)
          .setRestitution(prize.mass > 2 ? .006 : .014);
        const addRoundedBox = (halfW: number, halfH: number, radius: number, x = 0, y = prize.centerY ?? 0, mass = prize.mass, rotation = 0) => {
          const desc = material(RAPIER.ColliderDesc.roundCuboid(halfW, halfH, radius), mass)
            .setTranslation(x, y)
            .setRotation(rotation);
          colliders.push(world.createCollider(desc, body));
        };
        if (prize.shape === "headset") {
          addRoundedBox(prize.width * .29, prize.height * .10, .09, 0, -prize.height * .25, prize.mass * .28);
          addRoundedBox(prize.width * .115, prize.height * .22, .10, -prize.width * .28, prize.height * .12, prize.mass * .36, -.08);
          addRoundedBox(prize.width * .115, prize.height * .22, .10, prize.width * .28, prize.height * .12, prize.mass * .36, .08);
        } else if (prize.shape === "drone") {
          addRoundedBox(prize.width * .18, prize.height * .18, .07, 0, 0, prize.mass * .44);
          addRoundedBox(prize.width * .35, prize.height * .055, .045, 0, 0, prize.mass * .28, .34);
          addRoundedBox(prize.width * .35, prize.height * .055, .045, 0, 0, prize.mass * .28, -.34);
        } else if (prize.shape === "camera") {
          addRoundedBox(prize.width * .37, prize.height * .30, .08, -.04, .05, prize.mass * .78);
          const lens = material(RAPIER.ColliderDesc.ball(prize.height * .19), prize.mass * .22).setTranslation(prize.width * .24, .05);
          colliders.push(world.createCollider(lens, body));
        } else if (prize.shape === "bottom-heavy") {
          addRoundedBox(prize.width * prize.colliderX, prize.height * .33, prize.roundness, 0, -prize.height * .07, prize.mass * .58);
          addRoundedBox(prize.width * Math.min(.43, prize.colliderX + .03), prize.height * .12, Math.min(.08, prize.roundness), 0, prize.height * .31, prize.mass * .42);
        } else {
          addRoundedBox(prize.width * prize.colliderX, prize.height * prize.colliderY, prize.roundness);
        }
        const sprite = PIXI.Sprite.from(prize.image);
        sprite.anchor.set(.5);
        sprite.width = prize.width * renderScale;
        sprite.height = prize.height * renderScale;
        const shadow = new PIXI.Graphics();
        shadow.ellipse(0, 0, prize.width * renderScale * .39, Math.max(3, prize.height * renderScale * .105)).fill({ color: 0x010207, alpha: .44 });
        shadowLayer.addChild(shadow);
        prizeLayer.addChild(sprite);
        prizeBodies.push({ id: i, body, colliders, sprite, shadow, image: prize.image, label: prize.label, width: prize.width, height: prize.height, mass: prize.mass, lastVy: 0, impactCooldown: 0 });
      }

      // Settle the initial pile before displaying the first playable frame.
      for (let i = 0; i < (lowPowerDevice ? 210 : 300); i += 1) world.step();
      prizeBodies.forEach(({ body }) => { body.setLinvel({ x: 0, y: 0 }, false); body.setAngvel(0, false); });

      const hub = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(4, homeY));
      const hubCollider = world.createCollider(RAPIER.ColliderDesc.ball(.20), hub);
      // The central ram is a visual/mechanical housing, not a crushing jaw.
      // Keeping it as a sensor prevents the piston from spearing or launching prizes.
      hubCollider.setSensor(true);

      const leftFinger = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(3.62, homeY + .32).setRotation(1.08).setAngularDamping(5));
      const rightFinger = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(4.38, homeY + .32).setRotation(-1.08).setAngularDamping(5));
      const rearFinger = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(4, homeY + .30).setRotation(.24).setAngularDamping(5.5));
      const addCurvedFinger = (body: InstanceType<typeof RAPIER.RigidBody>, side: -1 | 0 | 1, rear = false) => {
        // Spider-leg geometry: the knee opens outward and the lower hook returns inward.
        return [
          world.createCollider(RAPIER.ColliderDesc.cuboid(rear ? .06 : .082, .25).setTranslation(side * .06, -.18).setRotation(side * -.22).setDensity(2.8).setFriction(.76).setRestitution(0), body),
          world.createCollider(RAPIER.ColliderDesc.cuboid(rear ? .055 : .078, .28).setTranslation(side * .08, .26).setRotation(side * .38).setDensity(2.35).setFriction(.92).setRestitution(0), body),
          // Small high-friction rubber pad. Only this collider counts as a
          // supporting fingertip when deciding whether a prize is seated.
          world.createCollider(RAPIER.ColliderDesc.ball(rear ? .075 : .095).setTranslation(side * -.015, .54).setDensity(1.35).setFriction(2.15).setRestitution(0), body),
        ];
      };
      const fingerColliderGroups = [
        addCurvedFinger(leftFinger, -1),
        addCurvedFinger(rightFinger, 1),
        addCurvedFinger(rearFinger, 0, true),
      ];
      const fingertipColliders = fingerColliderGroups.map((colliders) => colliders[2]);

      const leftJoint = world.createImpulseJoint(RAPIER.JointData.revolute({ x: -.27, y: .12 }, { x: 0, y: -.44 }), hub, leftFinger, true) as InstanceType<typeof RAPIER.RevoluteImpulseJoint>;
      const rightJoint = world.createImpulseJoint(RAPIER.JointData.revolute({ x: .27, y: .12 }, { x: 0, y: -.44 }), hub, rightFinger, true) as InstanceType<typeof RAPIER.RevoluteImpulseJoint>;
      const rearJoint = world.createImpulseJoint(RAPIER.JointData.revolute({ x: 0, y: .08 }, { x: 0, y: -.44 }), hub, rearFinger, true) as InstanceType<typeof RAPIER.RevoluteImpulseJoint>;
      leftJoint.setLimits(.03, 1.16);
      rightJoint.setLimits(-1.16, -.03);
      rearJoint.setLimits(-.10, .45);
      leftJoint.setContactsEnabled(false);
      rightJoint.setContactsEnabled(false);
      rearJoint.setContactsEnabled(false);

      const hubVisual = new PIXI.Sprite(motorTexture);
      hubVisual.anchor.set(.5, .79); hubVisual.width = 1.00 * renderScale; hubVisual.height = 1.22 * renderScale;
      const pistonVisual = new PIXI.Sprite(pistonTexture);
      pistonVisual.anchor.set(.5, .18); pistonVisual.width = .36 * renderScale; pistonVisual.height = 1.18 * renderScale;
      const leftVisual = new PIXI.Sprite(fingerTexture);
      leftVisual.anchor.set(.24, .09); leftVisual.width = .64 * renderScale; leftVisual.height = 1.48 * renderScale; leftVisual.scale.x *= -1;
      const rightVisual = new PIXI.Sprite(fingerTexture);
      rightVisual.anchor.set(.24, .09); rightVisual.width = .64 * renderScale; rightVisual.height = 1.48 * renderScale;
      const rearVisual = new PIXI.Sprite(fingerTexture);
      rearVisual.anchor.set(.24, .09); rearVisual.width = .50 * renderScale; rearVisual.height = 1.30 * renderScale; rearVisual.alpha = .64; rearVisual.tint = 0x929ba5;
      const leftRod = new PIXI.Sprite(rodTexture); leftRod.anchor.set(.5, .08); leftRod.width = .17 * renderScale;
      const rightRod = new PIXI.Sprite(rodTexture); rightRod.anchor.set(.5, .08); rightRod.width = .17 * renderScale;
      const rearRod = new PIXI.Sprite(rodTexture); rearRod.anchor.set(.5, .08); rearRod.width = .13 * renderScale; rearRod.alpha = .62;
      const leftBolt = new PIXI.Sprite(boltTexture); leftBolt.anchor.set(.5); leftBolt.width = .23 * renderScale; leftBolt.height = .23 * renderScale;
      const rightBolt = new PIXI.Sprite(boltTexture); rightBolt.anchor.set(.5); rightBolt.width = .23 * renderScale; rightBolt.height = .23 * renderScale;
      const rearBolt = new PIXI.Sprite(boltTexture); rearBolt.anchor.set(.5); rearBolt.width = .19 * renderScale; rearBolt.height = .19 * renderScale; rearBolt.alpha = .7;
      const cable = new PIXI.Graphics();
      rearClawLayer.addChild(rearRod, rearVisual, rearBolt);
      clawLayer.addChild(cable, leftRod, rightRod, leftVisual, rightVisual, pistonVisual, hubVisual, leftBolt, rightBolt);

      let lastPhase: Phase = phaseRef.current;
      let completed = false;
      let lockedBottomY = floorY - 2.35;
      let descentContactY: number | null = null;
      let capturedPrize: (typeof prizeBodies)[number] | null = null;
      let alignedCandidate: (typeof prizeBodies)[number] | null = null;
      let releasedPrize: (typeof prizeBodies)[number] | null = null;
      let collectedPrize: (typeof prizeBodies)[number] | null = null;
      let collectedAt: number | null = null;
      let collectedBodyRemoved = false;
      let everCaptured = false;
      let gripJoint: InstanceType<typeof RAPIER.ImpulseJoint> | null = null;
      let weakReleased = false;
      let releaseBurstCreated = false;
      let supportFrames = 0;
      let lostSupportFrames = 0;
      let strongestContact = 0;
      let gripVisualState: "open" | "contact" | "locked" | "slipping" = "open";
      let leftVisualRotation = 1.08;
      let rightVisualRotation = -1.08;
      let rearVisualRotation = .24;
      const fingerTipPosition = (finger: InstanceType<typeof RAPIER.RigidBody>, localX: number) => {
        const p = finger.translation();
        const angle = finger.rotation();
        return {
          x: p.x + Math.cos(angle) * localX - Math.sin(angle) * .47,
          y: p.y + Math.sin(angle) * localX + Math.cos(angle) * .47,
        };
      };
      const tick = () => {
        if (cancelled) return;
        const now = performance.now();
        const currentPhase = phaseRef.current;
        if (currentPhase !== lastPhase) {
          lastPhase = currentPhase;
          if (currentPhase === "dropping") {
            completed = false;
            capturedPrize = null;
            alignedCandidate = null;
            releasedPrize = null;
            collectedPrize = null;
            collectedAt = null;
            collectedBodyRemoved = false;
            everCaptured = false;
            if (gripJoint) world.removeImpulseJoint(gripJoint, true);
            gripJoint = null;
            weakReleased = false;
            releaseBurstCreated = false;
            supportFrames = 0;
            lostSupportFrames = 0;
            strongestContact = 0;
            gripVisualState = "open";
            descentContactY = null;
            fingerColliderGroups.flat().forEach((collider) => collider.setSensor(false));
            const aimX = .45 + xRef.current / 100 * 7.1;
            const nearby = prizeBodies
              .filter(({ body, width }) => Math.abs(body.translation().x - aimX) < Math.max(.92, width * .72))
              .map((prize) => ({ prize, surfaceY: prize.body.translation().y - prize.height * .34 }))
              .sort((a, b) => a.surfaceY - b.surfaceY);
            // Reserve the prize directly below the claw. In capture-test mode this
            // lets the visual physics complete the grab even when the fingers stop
            // a few pixels above an irregular pile.
            alignedCandidate = nearby[0]?.prize ?? null;
            targetRef.current(alignedCandidate ? {
              id: alignedCandidate.id,
              label: alignedCandidate.label,
              image: alignedCandidate.image,
              horizontalError: Math.abs(alignedCandidate.body.translation().x - aimX) / 7.1 * 100,
              rotation: alignedCandidate.body.rotation(),
              mass: alignedCandidate.mass,
            } : null);
            const penetration = [.10, .27, .44, .61][depthRef.current] ?? .44;
            // The hub enters the top layer instead of stopping above it. The
            // fingers can then wrap around a prize while neighboring bodies
            // provide real resistance, as in a packed arcade machine.
            const adaptiveTarget = nearby.length ? nearby[0].surfaceY - .48 + penetration : floorY - 1.95;
            lockedBottomY = Math.max(floorY - 3.10, Math.min(floorY - 1.22, adaptiveTarget));
          }
        }
        const elapsed = now - phaseStarted.current;
        const targetX = .45 + xRef.current / 100 * 7.1;
        const bottomY = descentContactY ?? lockedBottomY;
        let targetY = homeY;
        let movingX = targetX;
        let closed = false;
        if (currentPhase === "dropping") {
          const descent = Math.min(1, elapsed / 1680);
          const approachStart = .72;
          if (descent < approachStart) {
            const travel = descent / approachStart;
            const easedTravel = travel * travel * (3 - 2 * travel);
            targetY = homeY + (bottomY - homeY) * easedTravel * .86;
          } else {
            const approach = (descent - approachStart) / (1 - approachStart);
            const easedApproach = approach * approach * (3 - 2 * approach);
            targetY = homeY + (bottomY - homeY) * (.86 + easedApproach * .14);
          }
        }
        if (currentPhase === "lifting") {
          // Empty attempts return with the claw closed; only a confirmed prize opens at the delivery edge.
          // At the delivery edge the fingers open first while the pivot still
          // holds the prize. The body is released only after this opening pause.
          closed = !(gripRef.current === "firm" && elapsed >= 3040);
          if (elapsed < 650) {
            const closingRelief = Math.min(1, elapsed / 650);
            targetY = bottomY - closingRelief * .09;
          }
          else if (elapsed < 1900) targetY = bottomY - (bottomY - homeY) * (1 - Math.pow(1 - (elapsed - 650) / 1250, 3));
          else if (elapsed < 3600) {
            targetY = homeY;
            const transport = Math.min(1, (elapsed - 1900) / 1250);
            const smoothTransport = transport * transport * (3 - 2 * transport);
            movingX = targetX + (7.28 - targetX) * smoothTransport;
          } else {
            // After releasing the prize, the carriage visibly returns to its
            // neutral position before the result screen is shown.
            targetY = homeY;
            const returnProgress = Math.min(1, (elapsed - 3600) / 950);
            const smoothReturn = returnProgress * returnProgress * (3 - 2 * returnProgress);
            movingX = 7.28 + (4 - 7.28) * smoothReturn;
          }
        }
        if (currentPhase === "result") {
          targetY = homeY;
          movingX = 4;
        }
        const carrying = currentPhase === "lifting" && elapsed > 700 && elapsed < 3040;
        const transportSway = carrying ? Math.sin(elapsed / 155) * .032 : 0;
        const transportBob = carrying ? Math.sin(elapsed / 210) * .012 : 0;
        hub.setNextKinematicTranslation({ x: movingX + transportSway, y: targetY + transportBob });
        const rawClosure = closed ? Math.min(1, elapsed / 620) : 0;
        const closure = rawClosure * rawClosure * (3 - 2 * rawClosure);
        // A real arcade claw keeps the fingers slightly wrapped around the
        // prize. Perfectly vertical fingers read as three loose rods and leave
        // no visible cradle for the carried body.
        const capturedWidth = capturedPrize?.width ?? .82;
        const wrappedAngle = Math.min(.24, .11 + capturedWidth * .075);
        const leftTarget = 1.10 + (wrappedAngle - 1.10) * closure;
        const rightTarget = -1.10 + (-wrappedAngle + 1.10) * closure;
        const rearTarget = .26 + (.02 - .26) * closure;
        const tipDistance = (finger: InstanceType<typeof RAPIER.RigidBody>, localX: number) => {
          const tip = fingerTipPosition(finger, localX);
          return prizeBodies.reduce((nearest, prize) => {
            const item = prize.body.translation();
            return Math.min(nearest, Math.hypot(item.x - tip.x, item.y - tip.y));
          }, Number.POSITIVE_INFINITY);
        };
        const resistance = (distance: number) => distance < .26 ? .52 : distance < .42 ? .72 : 1;
        const holdFade = currentPhase === "lifting" && elapsed > 900
          ? gripRef.current === "firm"
            ? Math.max(.82, 1 - (elapsed - 900) / 12000)
            : Math.max(.24, 1 - (elapsed - 900) / (gripRef.current === "weak" ? 1250 : 1750))
          : 1;
        const closingStrength = gripRef.current === "firm" ? 58 : gripRef.current === "weak" ? 17 : 11;
        // Torque rises with the closing travel instead of hitting the pile at
        // full power on the first frame.
        const progressiveForce = .24 + closure * .76;
        const strength = (closed ? closingStrength * progressiveForce : 6.5) * holdFade;
        // Contact reduces torque per finger; one arm can stop while the others keep wrapping around the prize.
        const firmLock = capturedPrize && gripRef.current === "firm" ? 1 : null;
        leftJoint.configureMotorPosition(leftTarget, strength * (firmLock ?? resistance(tipDistance(leftFinger, -.01))), gripRef.current === "firm" ? 8.5 : 2.2);
        rightJoint.configureMotorPosition(rightTarget, strength * .96 * (firmLock ?? resistance(tipDistance(rightFinger, .01))), gripRef.current === "firm" ? 8.5 : 2.2);
        rearJoint.configureMotorPosition(rearTarget, strength * .68 * (firmLock ?? resistance(tipDistance(rearFinger, 0))), gripRef.current === "firm" ? 7.2 : 2);
        world.step();

        // Stop the downward carriage at the first real rubber-tip contact.
        // The fingers may continue articulating around the object, but the
        // central housing can no longer drive through the pile.
        if (currentPhase === "dropping" && elapsed > 520 && descentContactY === null) {
          const touchedPrize = fingertipColliders.some((tipCollider) => prizeBodies.some((prize) => prize.colliders.some((prizeCollider) => {
            let touching = false;
            world.contactPair(tipCollider, prizeCollider, (manifold) => { if (manifold.numSolverContacts() > 0) touching = true; });
            return touching;
          })));
          if (touchedPrize) descentContactY = hub.translation().y;
        }

        if (currentPhase === "lifting" && elapsed > 180 && elapsed < 3180) {
          const tips = [fingerTipPosition(leftFinger, -.01), fingerTipPosition(rightFinger, .01), fingerTipPosition(rearFinger, 0)];
          const fingerContacts = (prize: (typeof prizeBodies)[number]) => fingertipColliders.map((fingerCollider, index) => {
              let touching = false;
              prize.colliders.forEach((prizeCollider) => world.contactPair(fingerCollider, prizeCollider, (manifold) => {
                if (manifold.numSolverContacts() > 0) touching = true;
              }));
              return touching ? index : -1;
            }).filter((index) => index >= 0);
          const assessments = prizeBodies
            .map((prize) => {
              const item = prize.body.translation();
              const radiusX = Math.max(.28, prize.width * .46);
              const radiusY = Math.max(.28, prize.height * .46);
              const nearbyTips = tips.filter((tip) => {
                const nx = (tip.x - item.x) / radiusX;
                const ny = (tip.y - item.y) / radiusY;
                return nx * nx + ny * ny < 1.38;
              }).length;
              const contactIndices = fingerContacts(prize);
              const supports = contactIndices.length;
              const centerDistance = Math.hypot(item.x - hub.translation().x, item.y - (hub.translation().y + .58));
              const insideGrip = prize === alignedCandidate
                && Math.abs(item.x - hub.translation().x) < Math.max(.46, prize.width * .48)
                && item.y > hub.translation().y + .18
                && item.y < hub.translation().y + 1.42;
              const bilateralContact = contactIndices.includes(0) && contactIndices.includes(1);
              const leftTip = tips[0];
              const rightTip = tips[1];
              const geometricCradle = insideGrip
                && leftTip.x < item.x - Math.min(.08, prize.width * .08)
                && rightTip.x > item.x + Math.min(.08, prize.width * .08)
                && nearbyTips >= 2;
              return { prize, supports, nearbyTips, centerDistance, insideGrip, bilateralContact, geometricCradle };
            });
          const supported = assessments
            .filter(({ supports, bilateralContact, geometricCradle, centerDistance }) => (bilateralContact || supports >= 2 || geometricCradle) && centerDistance < 1.08)
            .sort((a, b) => b.supports - a.supports || b.nearbyTips - a.nearbyTips || a.centerDistance - b.centerDistance);
          const best = weakReleased ? null : supported[0]?.prize ?? null;
          strongestContact = Math.max(strongestContact, ...assessments.map(({ supports, nearbyTips }) => supports * 10 + nearbyTips));
          const hasSingleContact = assessments.some(({ supports, nearbyTips, centerDistance }) => (supports === 1 || nearbyTips >= 1) && centerDistance < 1.12);

          if (!capturedPrize) {
            if (best) supportFrames += 1;
            else supportFrames = Math.max(0, supportFrames - 2);
            const framesToLock = gripRef.current === "firm" ? 5 : 8;
            if (best && supportFrames >= framesToLock) {
              capturedPrize = best;
              everCaptured = true;
              if (!gripJoint && gripRef.current !== "none") {
                const stiffness = 42;
                const damping = 10;
                // A firm capture uses a real pivot: translation is locked to
                // the cradle while rotation remains free, so the prize can
                // swing naturally without lagging behind the rising claw. Weak
                // captures keep the elastic joint and can still slip.
                const itemPosition = best.body.translation();
                const itemAngle = best.body.rotation();
                const gripOffset = Math.min(.30, best.height * .24);
                const worldGripPoint = { x: itemPosition.x, y: itemPosition.y - gripOffset };
                const hubPosition = hub.translation();
                const hubGripAnchor = { x: worldGripPoint.x - hubPosition.x, y: worldGripPoint.y - hubPosition.y };
                const upperGripAnchor = {
                  x: -Math.sin(itemAngle) * -gripOffset,
                  y: Math.cos(itemAngle) * -gripOffset,
                };
                const gripJointData = gripRef.current === "firm"
                  ? RAPIER.JointData.revolute(hubGripAnchor, upperGripAnchor)
                  : RAPIER.JointData.spring(.12, stiffness, damping, hubGripAnchor, upperGripAnchor);
                gripJoint = world.createImpulseJoint(
                  gripJointData,
                  hub,
                  best.body,
                  true,
                );
              }
            }
            gripVisualState = best || hasSingleContact ? "contact" : "open";
          } else {
            const assistedSupport = assessments.some(({ prize, supports, bilateralContact, geometricCradle, centerDistance }) => prize === capturedPrize
              && (bilateralContact || supports >= 2 || geometricCradle)
              && centerDistance < 1.18);
            // Once a firm capture has been established by real contact, the
            // mechanical lock remains authoritative during transport. Contact
            // manifolds naturally disappear for a few frames as the pile falls
            // away, but that must not visually open the fingers or mark a win as
            // slipping.
            const firmTransportLock = gripRef.current === "firm" && Boolean(gripJoint);
            const stillSupported = firmTransportLock || supported.some(({ prize }) => prize === capturedPrize) || assistedSupport;
            lostSupportFrames = stillSupported ? 0 : lostSupportFrames + 1;
            gripVisualState = stillSupported ? "locked" : "slipping";
            if (lostSupportFrames > (gripRef.current === "firm" ? 60 : 8)) {
              capturedPrize = null;
              supportFrames = 0;
              lostSupportFrames = 0;
              gripVisualState = "open";
            }
          }
        } else if (currentPhase !== "lifting") {
          gripVisualState = "open";
        }
        host.dataset.gripState = gripVisualState;
        host.dataset.target = alignedCandidate?.label ?? "none";
        host.dataset.contactScore = String(strongestContact);
        host.dataset.supportFrames = String(supportFrames);

        const activeAssist = !gripJoint && ((gripRef.current === "firm" && elapsed < 420) || (gripRef.current === "weak" && elapsed < 720));
        if (currentPhase === "lifting" && capturedPrize && activeAssist && elapsed > 140 && elapsed < 3260) {
          const item = capturedPrize.body.translation();
          const velocity = capturedPrize.body.linvel();
          const holdPoint = { x: hub.translation().x, y: hub.translation().y + .70 };
          const assistStrength = gripRef.current === "firm" ? (elapsed < 900 ? 3.4 : 2.1) : 1.65;
          const desiredX = (holdPoint.x - item.x) * assistStrength;
          const desiredY = (holdPoint.y - item.y) * assistStrength;
          const maxAssistSpeed = gripRef.current === "firm" ? (elapsed < 900 ? 1.75 : 1.25) : 1.15;
          capturedPrize.body.setLinvel({
            x: velocity.x * .62 + Math.max(-maxAssistSpeed, Math.min(maxAssistSpeed, desiredX)),
            y: velocity.y * .62 + Math.max(-maxAssistSpeed, Math.min(maxAssistSpeed, desiredY)),
          }, true);
          const naturalSwing = elapsed > 760 ? Math.sin(elapsed / 260) * .075 : 0;
          capturedPrize.body.setAngvel(capturedPrize.body.angvel() * .76 + naturalSwing, true);
        }

        if (currentPhase === "lifting" && gripRef.current === "weak" && elapsed >= 980 && gripJoint) {
          world.removeImpulseJoint(gripJoint, true);
          gripJoint = null;
          weakReleased = true;
          gripVisualState = "slipping";
          if (capturedPrize) {
            capturedPrize.body.setLinvel({ x: capturedPrize.body.linvel().x * .72, y: .48 }, true);
            capturedPrize.body.setAngvel(capturedPrize.body.rotation() >= 0 ? .85 : -.85, true);
          }
          capturedPrize = null;
        }

        if (currentPhase === "lifting" && elapsed >= 3400 && gripRef.current === "firm" && !releasedPrize) {
          releasedPrize = capturedPrize;
          if (releasedPrize) {
            if (gripJoint) world.removeImpulseJoint(gripJoint, true);
            gripJoint = null;
            // Open directly over the collection column. Gravity now performs
            // the delivery; no lateral throw or timed disappearance is used.
            // Once the arms are visibly clear, their colliders become sensors
            // for the short drop so the prize cannot remain wedged between the
            // rubber tips. Gravity and a small downward release impulse finish
            // the movement into the collector.
            fingerColliderGroups.flat().forEach((collider) => collider.setSensor(true));
            releasedPrize.body.setLinvel({ x: 0, y: .72 }, true);
            releasedPrize.body.applyImpulse({ x: 0, y: releasedPrize.mass * .36 }, true);
            releasedPrize.body.setAngvel(releasedPrize.body.rotation() > 0 ? .42 : -.42, true);
            gripVisualState = "locked";
            // Ownership transfers from the claw to the collection flow. This
            // prevents later rendering code from reading a body after the gate
            // has removed it from Rapier.
            capturedPrize = null;
          }
        }

        if (currentPhase === "lifting" && releasedPrize && !collectedPrize) {
          const releasedPosition = releasedPrize.body.translation();
          const crossedCollectionGate = releasedPosition.x >= 6.62
            && releasedPosition.x <= 7.96
            && releasedPosition.y >= 2.72;
          if (crossedCollectionGate) {
            collectedPrize = releasedPrize;
            collectedAt = now;
            host.dataset.collection = collectedPrize.label;
          }
        }

        // Let the player see the prize fall into the illuminated compartment,
        // then remove its body below the opening so it cannot rejoin the pile.
        if (collectedPrize && collectedAt !== null && !collectedBodyRemoved && now - collectedAt > 380) {
          collectedBodyRemoved = true;
          collectedPrize.sprite.visible = false;
          collectedPrize.shadow.visible = false;
          const collectedIndex = prizeBodies.indexOf(collectedPrize);
          if (collectedIndex >= 0) prizeBodies.splice(collectedIndex, 1);
          world.removeRigidBody(collectedPrize.body);
        }

        const hp = hub.translation();
        spotlight.clear()
          .poly([
            (hp.x - .34) * renderScale, 0,
            (hp.x + .34) * renderScale, 0,
            (hp.x + 1.42) * renderScale, Math.min(floorY, hp.y + 5.1) * renderScale,
            (hp.x - 1.42) * renderScale, Math.min(floorY, hp.y + 5.1) * renderScale,
          ]).fill({ color: 0xffe2a0, alpha: currentPhase === "dropping" || currentPhase === "lifting" ? .050 : .028 })
          .ellipse(hp.x * renderScale, Math.min(floorY - .28, hp.y + 4.2) * renderScale, 1.18 * renderScale, .25 * renderScale)
          .fill({ color: 0xffd77a, alpha: currentPhase === "dropping" ? .09 : .045 });
        deliveryGlow.clear();
        if (currentPhase === "lifting" && elapsed > 2940 && releasedPrize) {
          const releasePulse = 1 + Math.sin(now / 75) * .12;
          deliveryGlow.circle(7.30 * renderScale, 3.05 * renderScale, .68 * renderScale * releasePulse)
            .stroke({ color: 0xffd96a, width: Math.max(2, renderScale * .055), alpha: .72 })
            .circle(7.30 * renderScale, 3.05 * renderScale, .46 * renderScale * releasePulse)
            .fill({ color: 0xffc84a, alpha: .075 });
          if (!releaseBurstCreated) {
            releaseBurstCreated = true;
            for (let spark = 0; spark < 9; spark += 1) {
              const angle = spark / 9 * Math.PI * 2;
              const dot = new PIXI.Graphics();
              dot.circle(0, 0, Math.max(1.2, renderScale * .032)).fill({ color: spark % 2 ? 0xffefaa : 0xffbf43, alpha: .82 });
              impactLayer.addChild(dot);
              impactParticles.push({ dot, x: 7.30 * renderScale, y: 3.05 * renderScale, vx: Math.cos(angle) * renderScale * .035, vy: Math.sin(angle) * renderScale * .035, life: 1 });
            }
          }
        }

        prizeBodies.forEach((entry) => {
          const { body, sprite, shadow, mass, height } = entry;
          const velocity = body.linvel();
          const maxLinear = mass > 2.4 ? 3.2 : mass > 1.4 ? 4.2 : 5.2;
          if (Math.abs(velocity.x) > maxLinear || Math.abs(velocity.y) > maxLinear) {
            body.setLinvel({ x: Math.max(-maxLinear, Math.min(maxLinear, velocity.x)), y: Math.max(-maxLinear, Math.min(maxLinear, velocity.y)) }, true);
          }
          const angular = body.angvel();
          const maxAngular = mass > 2.4 ? 1.65 : mass > 1.4 ? 2.25 : 3.1;
          if (Math.abs(angular) > maxAngular) body.setAngvel(Math.sign(angular) * maxAngular, true);
          const p = body.translation();
          sprite.position.set(p.x * renderScale, p.y * renderScale);
          sprite.rotation = body.rotation();
          const depth = Math.max(0, Math.min(1, (p.y - (floorY - 4.3)) / 4.3));
          const lightDistance = Math.abs(p.x - hp.x);
          const clawLight = Math.max(0, 1 - lightDistance / 1.55) * (currentPhase === "dropping" || currentPhase === "lifting" ? .12 : .045);
          const tone = Math.max(190, Math.min(255, Math.round(205 + depth * 43 + clawLight * 255)));
          sprite.tint = (tone << 16) | (tone << 8) | tone;
          shadow.position.set((p.x + .055) * renderScale, (p.y + height * .37) * renderScale);
          shadow.scale.x = .82 + Math.abs(Math.cos(body.rotation())) * .18;
          shadow.alpha = .26 + depth * .34;

          if (entry.lastVy > 1.25 && Math.abs(velocity.y) < .38 && p.y > floorY - 3.2 && now > entry.impactCooldown) {
            entry.impactCooldown = now + 520;
            impactShakeUntil = now + Math.min(135, 68 + entry.lastVy * 18);
            const particleCount = lowPowerDevice ? 1 : mass > 2 ? 4 : 3;
            for (let spark = 0; spark < particleCount; spark += 1) {
              const dot = new PIXI.Graphics();
              dot.circle(0, 0, Math.max(1, renderScale * .025)).fill({ color: spark % 2 ? 0xd9b36a : 0x9a7c55, alpha: .48 });
              impactLayer.addChild(dot);
              impactParticles.push({ dot, x: p.x * renderScale, y: (p.y + height * .34) * renderScale, vx: (spark - (particleCount - 1) / 2) * renderScale * .018, vy: -renderScale * (.018 + spark * .003), life: 1 });
            }
          }
          entry.lastVy = velocity.y;
        });
        if (now < impactShakeUntil) {
          const remaining = (impactShakeUntil - now) / 135;
          app.stage.position.set(Math.sin(now * .42) * 1.25 * remaining, Math.cos(now * .31) * .7 * remaining);
        } else if (app.stage.x || app.stage.y) {
          app.stage.position.set(0, 0);
        }
        for (let particle = impactParticles.length - 1; particle >= 0; particle -= 1) {
          const mote = impactParticles[particle];
          mote.life -= .035;
          mote.x += mote.vx;
          mote.y += mote.vy;
          mote.vy += renderScale * .0012;
          mote.dot.position.set(mote.x, mote.y);
          mote.dot.alpha = Math.max(0, mote.life * .55);
          if (mote.life <= 0) {
            impactLayer.removeChild(mote.dot);
            mote.dot.destroy();
            impactParticles.splice(particle, 1);
          }
        }
        hubVisual.position.set(hp.x * renderScale, hp.y * renderScale);
        const leftPivot = { x: (hp.x - .27) * renderScale, y: (hp.y + .12) * renderScale };
        const rightPivot = { x: (hp.x + .27) * renderScale, y: (hp.y + .12) * renderScale };
        const rearPivot = { x: hp.x * renderScale, y: (hp.y + .08) * renderScale };
        // The visible fingers are mounted at the same hinge used by Rapier.
        // Drawing them at each rigid body's centre left a visible gap between
        // the bolt and the arm, making the tips look detached during lifting.
        const visuallyLocked = gripVisualState === "locked" && currentPhase === "lifting" && elapsed < 3040;
        const visualLeftTarget = visuallyLocked ? leftTarget : leftFinger.rotation();
        const visualRightTarget = visuallyLocked ? rightTarget : rightFinger.rotation();
        const visualRearTarget = visuallyLocked ? rearTarget : rearFinger.rotation();
        const rotationFollow = visuallyLocked ? .34 : .42;
        leftVisualRotation += (visualLeftTarget - leftVisualRotation) * rotationFollow;
        rightVisualRotation += (visualRightTarget - rightVisualRotation) * rotationFollow;
        rearVisualRotation += (visualRearTarget - rearVisualRotation) * rotationFollow;
        leftVisual.position.set(leftPivot.x, leftPivot.y); leftVisual.rotation = leftVisualRotation;
        rightVisual.position.set(rightPivot.x, rightPivot.y); rightVisual.rotation = rightVisualRotation;
        rearVisual.position.set(rearPivot.x, rearPivot.y); rearVisual.rotation = rearVisualRotation;
        // Retract the centre ram when the fingers close. It now ends above the
        // prize cradle instead of visually piercing the captured object.
        pistonVisual.height = (closed ? .68 : 1.04) * renderScale;
        pistonVisual.position.set(hp.x * renderScale, (hp.y + (closed ? .10 : .17)) * renderScale);
        const pistonLeft = { x: (hp.x - .10) * renderScale, y: (hp.y + (closed ? .66 : .48)) * renderScale };
        const pistonRight = { x: (hp.x + .10) * renderScale, y: (hp.y + (closed ? .66 : .48)) * renderScale };
        const placeRod = (sprite: InstanceType<typeof PIXI.Sprite>, start: { x: number; y: number }, end: { x: number; y: number }) => {
          const dx = end.x - start.x; const dy = end.y - start.y;
          sprite.position.set(start.x, start.y); sprite.height = Math.hypot(dx, dy); sprite.rotation = Math.atan2(dy, dx) - Math.PI / 2;
        };
        placeRod(leftRod, pistonLeft, leftPivot); placeRod(rightRod, pistonRight, rightPivot);
        placeRod(rearRod, { x: hp.x * renderScale, y: (hp.y + (closed ? .59 : .43)) * renderScale }, rearPivot);
        leftBolt.position.set(leftPivot.x, leftPivot.y); rightBolt.position.set(rightPivot.x, rightPivot.y); rearBolt.position.set(rearPivot.x, rearPivot.y);
        const slipShake = gripVisualState === "slipping" ? Math.sin(now / 34) * 1.5 : 0;
        clawLayer.x = slipShake;
        rearClawLayer.x = slipShake;
        cable.clear()
          .moveTo(hp.x * renderScale, 0).lineTo(hp.x * renderScale, hp.y * renderScale - .48 * renderScale).stroke({ color: 0x171b21, width: .12 * renderScale })
          .moveTo(hp.x * renderScale, 0).lineTo(hp.x * renderScale, hp.y * renderScale - .48 * renderScale).stroke({ color: 0xbfc7cc, width: .05 * renderScale });

        const collectionFinished = collectedPrize && collectedAt !== null && now - collectedAt > 720;
        const failedRoundFinished = gripRef.current !== "firm" && elapsed > 4550;
        const collectionTimedOut = gripRef.current === "firm" && elapsed > 5400 && !collectedPrize;
        if (currentPhase === "lifting" && (collectionFinished || failedRoundFinished || collectionTimedOut) && !completed) {
          completed = true;
          // Only crossing the physical collection gate authorizes a prize.
          const delivered = collectedPrize;
          if (delivered && gripRef.current === "firm" && !collectedBodyRemoved) {
            if (gripJoint) world.removeImpulseJoint(gripJoint, true);
            gripJoint = null;
            delivered.sprite.visible = false;
            delivered.shadow.visible = false;
            const deliveredIndex = prizeBodies.indexOf(delivered);
            if (deliveredIndex >= 0) prizeBodies.splice(deliveredIndex, 1);
            world.removeRigidBody(delivered.body);
          }
          host.dataset.delivered = delivered && gripRef.current === "firm" ? delivered.label : "none";
          const physicalOutcome = delivered && gripRef.current === "firm"
            ? "collected"
            : weakReleased && everCaptured
              ? "slipped"
              : "empty";
          completeRef.current(delivered && gripRef.current === "firm" ? {
            id: delivered.id,
            label: delivered.label,
            image: delivered.image,
            mass: delivered.mass,
          } : null, physicalOutcome);
          capturedPrize = null;
          alignedCandidate = null;
          releasedPrize = null;
          collectedPrize = null;
          collectedAt = null;
        }
        animation = requestAnimationFrame(tick);
      };
      animation = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animation);
      host.replaceChildren();
    };
  }, []);

  const ambienceStyle = { "--claw-parallax": `${(clawX - 50) / 50}` } as CSSProperties;
  return <div className="matter-bin pile-bin rapier-bin" ref={hostRef} style={ambienceStyle} aria-label="Máquina Garra Milionária 2D">
    <div className="casino-ambience" aria-hidden="true">
      <span className="casino-chandelier"><i /><i /><i /></span>
      <span className="casino-slots left"><i /><i /><i /></span>
      <span className="casino-slots right"><i /><i /><i /></span>
      <span className="casino-crowd"><i /><i /><i /><i /><i /></span>
    </div>
    <div className="delivery-portal"><i /><b>ENTREGA</b><span>→</span></div>
    <div className="glass-sticker" aria-hidden="true"><small>♛</small><span>GARRA</span><b>MILIONÁRIA</b><i>EDIÇÃO 2D · MAIS PRÊMIOS</i></div>
    <div className="claw-reflection" aria-hidden="true" />
    <div className="bin-glass" />
  </div>;
}
