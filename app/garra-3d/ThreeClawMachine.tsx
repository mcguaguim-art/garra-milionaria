"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./three-controls.css";

type Phase = "ready" | "aim" | "drop" | "grip" | "lift" | "deliver" | "result";
type CaptureOutcome = "firm" | "near" | "miss";
type Controls = { left: boolean; right: boolean; forward: boolean; back: boolean };

const PRODUCTS = ["IPHONE", "PS5", "PERFUME", "AIRFRYER", "WATCH", "DINHEIRO", "SPEAKER", "SMARTPHONE", "TV", "BICICLETA", "TABLET", "PC GAMER", "UMIDIFICADOR"];
const COLORS = [0xd9dce5, 0xf2f0e9, 0x17131f, 0x27232c, 0x16161c, 0x78a681, 0x20242b, 0x8992a8, 0x20232b, 0x8c9aa6, 0x4d596d, 0x322447, 0xe6e9ee];
const MODEL_ASSETS: Partial<Record<string,string>> = { IPHONE:"iphone.glb", PS5:"ps5.glb", PERFUME:"perfume.glb", AIRFRYER:"airfryer.glb", WATCH:"watch.glb", DINHEIRO:"money.glb", SPEAKER:"jbl-speaker.glb", SMARTPHONE:"tablet.glb", TV:"tv.glb", BICICLETA:"bicycle.glb", TABLET:"tablet.glb", "PC GAMER":"pc-gamer.glb", UMIDIFICADOR:"humidifier.glb" };
const CUBE_IMAGES: Record<string,string> = { IPHONE:"/prizes/calibrated/iphone14.png", PS5:"/prizes/calibrated/playstation5.png", PERFUME:"/prizes/calibrated/perfume-viking.png", AIRFRYER:"/prizes/calibrated/airfryer.png", WATCH:"/prizes/calibrated/watch.png", DINHEIRO:"/prizes/calibrated/dinheiro.png", SPEAKER:"/prizes/calibrated/speaker.png", SMARTPHONE:"/prizes/calibrated/phone.png", TV:"/prizes/calibrated/macbook.png", BICICLETA:"/prizes/calibrated/drone.png", TABLET:"/prizes/calibrated/phone.png", "PC GAMER":"/prizes/calibrated/console.png", UMIDIFICADOR:"/prizes/calibrated/gift.png" };
const PRIZE_SIZE: Record<string,[number,number,number]> = {
  IPHONE:[.82,1.08,.25], PS5:[.92,1.2,.54], PERFUME:[.84,1.02,.66], AIRFRYER:[1.12,1.15,.9],
  WATCH:[.82,.98,.34], DINHEIRO:[1.02,.48,.7], SPEAKER:[1.12,.68,.66], SMARTPHONE:[.86,1.08,.24],
  TV:[1.38,.88,.25], BICICLETA:[1.42,.92,.3], TABLET:[1.12,.82,.2], "PC GAMER":[1.2,1.14,.72], UMIDIFICADOR:[.92,1.02,.82]
};
const GRIP_PROFILE: Record<string,{ height:number; radius:number; hold:number }> = {
  IPHONE:{height:.12,radius:.78,hold:.96}, PS5:{height:.18,radius:.9,hold:1.04}, PERFUME:{height:.34,radius:.76,hold:.98},
  AIRFRYER:{height:.12,radius:.9,hold:1.08}, WATCH:{height:.04,radius:.72,hold:.94}, DINHEIRO:{height:.02,radius:.86,hold:.94},
  SPEAKER:{height:.08,radius:.9,hold:1}, SMARTPHONE:{height:.1,radius:.78,hold:.96}, TV:{height:.06,radius:.9,hold:1.08},
  BICICLETA:{height:.08,radius:.82,hold:1.02}, TABLET:{height:.08,radius:.82,hold:.98}, "PC GAMER":{height:.16,radius:.92,hold:1.08},
  UMIDIFICADOR:{height:.2,radius:.86,hold:1.02}
};

export default function ThreeClawMachine({ prizeMode="models" }: { prizeMode?: "models" | "cubes" } = {}) {
  const host = useRef<HTMLDivElement>(null);
  const controlRef = useRef<Controls>({ left: false, right: false, forward: false, back: false });
  const phaseRef = useRef<Phase>("ready");
  const commandRef = useRef<"drop" | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [status, setStatus] = useState("PROTÓTIPO 3D PRONTO");
  const [plays, setPlays] = useState(10);
  const [won, setWon] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CaptureOutcome | null>(null);
  const [stick, setStick] = useState<keyof Controls | "center">("center");
  const padOrigin = useRef<{ x: number; y: number } | null>(null);

  const updatePhase = (next: Phase, label: string) => { phaseRef.current = next; setPhase(next); setStatus(label); };
  const start = () => { setWon(null); setOutcome(null); updatePhase("aim", "POSICIONE EM X E PROFUNDIDADE"); };
  const drop = () => { if (phaseRef.current !== "aim") return; commandRef.current = "drop"; setPlays((value) => Math.max(0, value - 1)); };
  const hold = (key: keyof Controls, active: boolean) => { controlRef.current[key] = active; setStick(active ? key : "center"); };
  const releasePad = () => {
    controlRef.current = { left: false, right: false, forward: false, back: false };
    padOrigin.current = null;
    setStick("center");
  };
  const movePad = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!padOrigin.current || phaseRef.current !== "aim") return;
    event.preventDefault();
    const dx = event.clientX - padOrigin.current.x;
    const dy = event.clientY - padOrigin.current.y;
    const deadZone = 7;
    controlRef.current.left = dx < -deadZone;
    controlRef.current.right = dx > deadZone;
    controlRef.current.forward = dy < -deadZone;
    controlRef.current.back = dy > deadZone;
    setStick(Math.abs(dx) > Math.abs(dy) ? dx < -deadZone ? "left" : dx > deadZone ? "right" : "center" : dy < -deadZone ? "forward" : dy > deadZone ? "back" : "center");
  };
  const beginPad = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "aim") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    padOrigin.current = { x: event.clientX, y: event.clientY };
  };

  useEffect(() => {
    window.addEventListener("pointerup", releasePad);
    window.addEventListener("pointercancel", releasePad);
    window.addEventListener("blur", releasePad);
    return () => {
      window.removeEventListener("pointerup", releasePad);
      window.removeEventListener("pointercancel", releasePad);
      window.removeEventListener("blur", releasePad);
    };
  }, []);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let cancelled = false;
    let frame = 0;
    let cleanup = () => {};
    void (async () => {
      const RAPIER = await import("@dimforge/rapier3d-compat");
      await RAPIER.init();
      if (cancelled) return;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x080612);
      scene.fog = new THREE.FogExp2(0x080612, .045);
      const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, .1, 80);
      camera.position.set(0, 7.15, 12.2); camera.lookAt(0, 2.45, 0);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(1.6, devicePixelRatio)); renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
      container.appendChild(renderer.domElement);
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js"); const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(),.035).texture; pmrem.dispose();
      scene.add(new THREE.AmbientLight(0xe9edff,.48));
      scene.add(new THREE.HemisphereLight(0x766dff, 0x160b09, 1.45));
      const key = new THREE.SpotLight(0xffd77e, 56, 28, .7, .7, 1.1); key.position.set(-3, 10, 7); key.castShadow = true; scene.add(key);
      const frontFill = new THREE.SpotLight(0xfff3df,35,22,.82,.7,1.1); frontFill.position.set(0,5.8,8); frontFill.target.position.set(0,1.05,0); scene.add(frontFill,frontFill.target);
      const prizeFillLeft = new THREE.PointLight(0xffd28a,7,7,1.5); prizeFillLeft.position.set(-2.35,1.55,2.35); scene.add(prizeFillLeft);
      const prizeFillRight = new THREE.PointLight(0x9ebaff,8.5,7,1.5); prizeFillRight.position.set(2.35,1.45,2.1); scene.add(prizeFillRight);
      const blue = new THREE.PointLight(0x526dff, 28, 16); blue.position.set(4, 5, -3); scene.add(blue);
      const magenta = new THREE.PointLight(0xd64aff, 18, 12); magenta.position.set(-4, 4, 2); scene.add(magenta);
      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const rigidMeshes: Array<{ body: InstanceType<typeof RAPIER.RigidBody>; mesh: THREE.Object3D; name: string; halfHeight: number; gripHeight: number; gripRadius: number; holdOffset: number; gripDifficulty: number }> = [];
      const addFixedBox = (size: [number, number, number], position: [number, number, number], material: THREE.Material, visible = true) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); mesh.receiveShadow = true; mesh.visible = visible; scene.add(mesh);
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...position)); world.createCollider(RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setFriction(.9), body);
      };
      const metal = new THREE.MeshStandardMaterial({ color: 0x21172b, metalness: .82, roughness: .28 });
      addFixedBox([5.56, .45, 4.32], [0, -.22, 0], metal);
      addFixedBox([.35, 6.3, 6.8], [-4.16, 2.85, 0], metal, false);
      addFixedBox([.35, 6.3, 6.8], [4.16, 2.85, 0], metal, false);
      addFixedBox([8.2, 6.3, .3], [0, 2.85, -3.5], metal, false);
      const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fc9ff, transparent: true, opacity: .075, roughness: .08, metalness: 0, transmission: .86, thickness: .18 });
      const binGlass = new THREE.MeshPhysicalMaterial({ color: 0xa7d8ff, transparent: true, opacity: .16, roughness: .1, transmission: .76, thickness: .22, side: THREE.DoubleSide });
      const frontBinGlass=binGlass.clone(); frontBinGlass.opacity=.04; frontBinGlass.transmission=.94;
      addFixedBox([.12,6.08,4.15],[-2.7,3.02,0],binGlass); addFixedBox([.12,6.08,4.15],[2.7,3.02,0],binGlass);
      addFixedBox([5.5,6.08,.12],[0,3.02,-2.1],binGlass); addFixedBox([5.5,6.08,.08],[0,3.02,2.1],frontBinGlass);
      const binRimMaterial=new THREE.MeshStandardMaterial({color:0x9a74a8,emissive:0x59306f,emissiveIntensity:1.2,metalness:.84,roughness:.2});
      [[.1,6.18,.1,-2.76,3.07,-2.16],[.1,6.18,.1,2.76,3.07,-2.16],[.1,6.18,.1,-2.76,3.07,2.16],[.1,6.18,.1,2.76,3.07,2.16],[5.64,.1,.1,0,6.14,-2.16],[5.64,.1,.1,0,6.14,2.16],[.1,.1,4.32,-2.76,6.14,0],[.1,.1,4.32,2.76,6.14,0],[5.64,.1,.1,0,.04,2.16],[.1,.1,4.32,-2.76,.04,0],[.1,.1,4.32,2.76,.04,0]].forEach(([w,h,d,x,y,z])=>{ const rail=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),binRimMaterial); rail.position.set(x,y,z); rail.castShadow=true; scene.add(rail); });
      const sideGlassGeometry = new THREE.BoxGeometry(.07, 5.85, 6.55);
      const leftGlass = new THREE.Mesh(sideGlassGeometry, glass); leftGlass.position.set(-3.95, 2.85, 0); scene.add(leftGlass);
      const rightGlass = leftGlass.clone(); rightGlass.position.x = 3.95; scene.add(rightGlass);
      const wearCanvas=document.createElement("canvas"); wearCanvas.width=512; wearCanvas.height=512; const wearCtx=wearCanvas.getContext("2d")!; wearCtx.clearRect(0,0,512,512);
      for(let index=0;index<18;index+=1){ const x=34+(index*83)%450; const y=28+(index*137)%458; const radius=10+(index%5)*7; const gradient=wearCtx.createRadialGradient(x,y,1,x,y,radius); gradient.addColorStop(0,"rgba(220,235,255,.16)"); gradient.addColorStop(1,"rgba(220,235,255,0)"); wearCtx.fillStyle=gradient; wearCtx.beginPath(); wearCtx.arc(x,y,radius,0,Math.PI*2); wearCtx.fill(); }
      wearCtx.strokeStyle="rgba(220,235,255,.1)"; wearCtx.lineWidth=.7; for(let index=0;index<9;index+=1){ wearCtx.beginPath(); wearCtx.moveTo(25+index*57,80+(index%3)*128); wearCtx.lineTo(88+index*49,95+(index%3)*128); wearCtx.stroke(); }
      const wearTexture=new THREE.CanvasTexture(wearCanvas); const glassWear=new THREE.Mesh(new THREE.PlaneGeometry(7.88,5.55),new THREE.MeshBasicMaterial({map:wearTexture,transparent:true,opacity:.32,depthWrite:false,blending:THREE.AdditiveBlending})); glassWear.position.set(0,3.18,3.345); glassWear.renderOrder=8; scene.add(glassWear);
      const clawGlassReflection=new THREE.Mesh(new THREE.PlaneGeometry(.38,1.95),new THREE.MeshBasicMaterial({color:0xdbe7ff,transparent:true,opacity:.035,depthWrite:false,blending:THREE.AdditiveBlending})); clawGlassReflection.position.set(0,4.5,3.355); clawGlassReflection.rotation.z=-.08; clawGlassReflection.renderOrder=9; scene.add(clawGlassReflection);
      const edgeGlass: THREE.Mesh[]=[]; for(const side of [-1,1]){ const edge=new THREE.Mesh(new THREE.PlaneGeometry(.22,5.55),new THREE.MeshBasicMaterial({color:side<0?0x7fc6ff:0xffa4df,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending})); edge.position.set(side*3.78,3.18,3.35); edge.renderOrder=9; scene.add(edge); edgeGlass.push(edge); }
      const glassReflections: THREE.Mesh[] = [];
      for (let index = 0; index < 3; index += 1) {
        const reflection = new THREE.Mesh(new THREE.PlaneGeometry(.32 + index * .09, 6.2), new THREE.MeshBasicMaterial({ color: index === 1 ? 0xffb8ee : 0xb8dcff, transparent: true, opacity: .055, depthWrite: false, blending: THREE.AdditiveBlending }));
        reflection.position.set(-3.4 + index * 2.6, 2.65, 3.36); reflection.rotation.z = -.36; reflection.visible=true; scene.add(reflection); glassReflections.push(reflection);
      }
      const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x9b49dc, emissive: 0x6a20b7, emissiveIntensity: 2.2, metalness: .55, roughness: .22 });
      [[8.1,.09,.09,0,.42,3.36],[8.1,.09,.09,0,6.02,3.36],[.09,5.68,.09,-4.02,3.22,3.36],[.09,5.68,.09,4.02,3.22,3.36]].forEach(([w,h,d,x,y,z]) => { const rim = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), rimMaterial); rim.position.set(x,y,z); scene.add(rim); });
      const frameMetal = new THREE.MeshStandardMaterial({ color: 0x241a2c, metalness: .92, roughness: .2 });
      [[.3,5.8,.34,-4.04,3.05,3.45],[.3,5.8,.34,4.04,3.05,3.45],[8.35,.3,.34,0,6.42,3.45]].forEach(([w,h,d,x,y,z]) => { const post = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),frameMetal); post.position.set(x,y,z); post.castShadow=true; scene.add(post); });
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(5.82,.34,4.5),frameMetal); ceiling.position.set(0,6.62,0); ceiling.receiveShadow=true; ceiling.castShadow=true; scene.add(ceiling);
      const arcadeTexture = await new THREE.TextureLoader().loadAsync("/environments/arcade-premium-v1.png");
      arcadeTexture.colorSpace=THREE.SRGBColorSpace; arcadeTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const arcadeBackdrop=new THREE.Mesh(new THREE.PlaneGeometry(9.2,9.7),new THREE.MeshBasicMaterial({map:arcadeTexture,color:0xb9c8ff,toneMapped:true})); arcadeBackdrop.position.set(0,3.45,-3.31); scene.add(arcadeBackdrop);
      const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(8.4,6.5),new THREE.MeshBasicMaterial({color:0x10184d,transparent:true,opacity:.2,depthWrite:false})); backGlow.position.set(0,3.05,-3.25); scene.add(backGlow);
      const arcadeScreens: THREE.Mesh[]=[];
      for(const side of [-1,1]) for(let row=0;row<4;row+=1){
        const cabinet=new THREE.Mesh(new THREE.BoxGeometry(.52,1.42,.82),new THREE.MeshStandardMaterial({color:0x100d18,metalness:.72,roughness:.28})); cabinet.position.set(side*4.28,1.04,-2.2+row*1.35); cabinet.rotation.y=side*.08; scene.add(cabinet);
        const screenMaterial=new THREE.MeshStandardMaterial({color:row%2?0x381053:0x0d2455,emissive:row%2?0xb13cff:0x3978ff,emissiveIntensity:1.25,roughness:.18});
        const screen=new THREE.Mesh(new THREE.PlaneGeometry(.68,.72),screenMaterial); screen.position.set(side*3.995,1.22,-2.2+row*1.35); screen.rotation.y=side*Math.PI/2; scene.add(screen); arcadeScreens.push(screen);
        const crown=new THREE.Mesh(new THREE.BoxGeometry(.1,.08,.7),new THREE.MeshBasicMaterial({color:row%2?0xe28cff:0x69a2ff})); crown.position.set(side*3.97,1.82,-2.2+row*1.35); scene.add(crown);
      }
      const outerLeftGlow=new THREE.PointLight(0x7d5cff,7,5,1.7); outerLeftGlow.position.set(-3.8,2.4,-.9); scene.add(outerLeftGlow);
      const outerRightGlow=new THREE.PointLight(0xffa341,6,5,1.7); outerRightGlow.position.set(3.8,2.1,-1.1); scene.add(outerRightGlow);
      const casinoDots: THREE.Mesh[] = [];
      for(let index=0;index<16;index+=1){ const dot=new THREE.Mesh(new THREE.CircleGeometry(.045+(index%4)*.018,12),new THREE.MeshBasicMaterial({color:index%3===0?0xffc44d:index%3===1?0xb44dff:0x4c7dff,transparent:true,opacity:.18+(index%5)*.035,blending:THREE.AdditiveBlending,depthWrite:false})); dot.position.set(-3.35+(index%8)*.95,1.05+Math.floor(index/8)*1.7,-3.08); scene.add(dot); casinoDots.push(dot); }
      const silhouettes: THREE.Group[] = [];
      for(let index=0;index<5;index+=1){ const person=new THREE.Group(); const shadow=new THREE.MeshStandardMaterial({color:0x100d1a,roughness:.9,transparent:true,opacity:.55}); const head=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),shadow); head.position.y=.42; person.add(head); const bodyMesh=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.38,5,8),shadow); person.add(bodyMesh); person.position.set(-4+index*1.9,.68,-3.02-index*.035); person.scale.setScalar(.82+index*.07); scene.add(person); silhouettes.push(person); }
      const floorGrid = new THREE.GridHelper(5.35, 12, 0xb476ff, 0x302343); floorGrid.scale.z=.78; floorGrid.position.y = .015; const floorMaterials=Array.isArray(floorGrid.material)?floorGrid.material:[floorGrid.material]; floorMaterials.forEach((material)=>{ material.transparent=true; material.opacity=.16; }); scene.add(floorGrid);

      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const modelLoader = new GLTFLoader(); const loadedPrizeModels = new Map<string,THREE.Object3D>(); const modelRequests = new Map<string,Promise<THREE.Object3D|null>>();
      const requestModel=(file:string)=>{ const existing=modelRequests.get(file); if(existing)return existing; const request=modelLoader.loadAsync(`/models/prizes/${file}`).then((gltf)=>{ gltf.scene.traverse((child)=>{ if(child instanceof THREE.Mesh){ child.castShadow=true; child.receiveShadow=true; const materials=(Array.isArray(child.material)?child.material:[child.material]).map((source)=>{ const material=source.clone(); if(material instanceof THREE.MeshStandardMaterial){ material.envMapIntensity=1.35; if(material.color.getHSL({h:0,s:0,l:0}).l<.12){ material.roughness=Math.min(material.roughness,.48); } } return material; }); child.material=Array.isArray(child.material)?materials:materials[0]; } }); return gltf.scene; }).catch(()=>null); modelRequests.set(file,request); return request; };
      if(prizeMode==="models") await Promise.all(Object.entries(MODEL_ASSETS).map(async ([name,file])=>{ const model=await requestModel(file); if(model)loadedPrizeModels.set(name,model); }));
      const cubeTextures=new Map<string,THREE.Texture>();
      if(prizeMode==="cubes") await Promise.all(Object.entries(CUBE_IMAGES).map(async ([name,path])=>{
        const source=await new THREE.TextureLoader().loadAsync(path); const image=source.image as HTMLImageElement; const canvas=document.createElement("canvas"); canvas.width=512; canvas.height=512; const ctx=canvas.getContext("2d")!;
        const color=COLORS[Math.max(0,PRODUCTS.indexOf(name))]??0x362243; const hex=`#${color.toString(16).padStart(6,"0")}`; const gradient=ctx.createLinearGradient(0,0,512,512); gradient.addColorStop(0,"#ffffff"); gradient.addColorStop(.48,hex); gradient.addColorStop(1,"#17101f"); ctx.fillStyle=gradient; ctx.fillRect(0,0,512,512);
        ctx.fillStyle="rgba(11,7,17,.28)"; ctx.fillRect(18,18,476,476); ctx.strokeStyle="#ffe08a"; ctx.lineWidth=10; ctx.strokeRect(18,18,476,476); ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.lineWidth=2; ctx.strokeRect(34,34,444,444);
        const width=image.naturalWidth||image.width||1; const height=image.naturalHeight||image.height||1; const scale=Math.min(390/width,350/height); const drawWidth=width*scale; const drawHeight=height*scale; ctx.shadowColor="rgba(0,0,0,.62)"; ctx.shadowBlur=20; ctx.drawImage(image,(512-drawWidth)/2,42+(350-drawHeight)/2,drawWidth,drawHeight); ctx.shadowBlur=0;
        ctx.fillStyle="rgba(12,7,18,.9)"; ctx.fillRect(34,404,444,74); ctx.fillStyle="#ffe28a"; ctx.textAlign="center"; ctx.font="700 30px Arial"; ctx.fillText(name,256,447); ctx.fillStyle="#c9a9d5"; ctx.font="700 12px monospace"; ctx.fillText("GARRA PREMIADA · BOX",256,468);
        const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); texture.needsUpdate=true; cubeTextures.set(name,texture); source.dispose();
      }));

      const makeLabel = (name: string, color: number) => {
        const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128; const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = color > 0x888888 ? "#15121a" : "#f7e7b2"; ctx.font = "bold 25px Arial"; ctx.textAlign = "center"; ctx.fillText(name, 128, 72);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
      };
      const makeProductObject = (name: string, width: number, height: number, depth: number, color: number) => {
        const group = new THREE.Group();
        if(prizeMode==="cubes"){
          const edge=.86; const image=cubeTextures.get(name); const imageMaterial=new THREE.MeshStandardMaterial({color:0xffffff,map:image,transparent:false,metalness:.16,roughness:.28,envMapIntensity:1.15});
          const cube=new THREE.Mesh(new THREE.BoxGeometry(edge,edge,edge),imageMaterial); cube.castShadow=true; cube.receiveShadow=true; group.add(cube);
          const border=new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry),new THREE.LineBasicMaterial({color:0xffd66f,transparent:true,opacity:.82})); cube.add(border); return group;
        }
        const loadedModel = loadedPrizeModels.get(name);
        if(loadedModel){ const model=loadedModel.clone(true); model.updateMatrixWorld(true); const bounds=new THREE.Box3().setFromObject(model); const size=bounds.getSize(new THREE.Vector3()); const center=bounds.getCenter(new THREE.Vector3()); const sourceMax=Math.max(size.x,size.y,size.z,.001); const targetMax=Math.max(width,height,depth); const fit=targetMax/sourceMax*.92; model.scale.setScalar(fit); model.position.copy(center).multiplyScalar(-fit); group.add(model); return group; }
        const isGlass = name === "PERFUME";
        const isPaper = name === "DINHEIRO" || name === "PRESENTE";
        const base = isGlass ? new THREE.MeshPhysicalMaterial({ color: 0x4d7791, metalness: .08, roughness: .12, transmission: .48, transparent: true, opacity: .8, thickness: .22 }) : new THREE.MeshStandardMaterial({ color, metalness: name === "OURO" || name === "WATCH" ? .78 : isPaper ? .02 : .2, roughness: isPaper ? .68 : .3 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x15131a, metalness: .48, roughness: .3 });
        const gold = new THREE.MeshStandardMaterial({ color: 0xd8a42c, metalness: .82, roughness: .22 });
        const chrome = new THREE.MeshStandardMaterial({ color: 0xdde2eb, metalness: .94, roughness: .12 });
        const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x101b35, emissive: 0x132d6b, emissiveIntensity: 1.15, metalness: .38, roughness: .16 });
        const add = (geometry: THREE.BufferGeometry, material = base, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x,y,z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh; };
        if (name === "IPHONE" || name === "SMARTPHONE") {
          add(new THREE.BoxGeometry(width * .66,height*1.03,depth * .38),chrome); add(new THREE.BoxGeometry(width * .62,height,depth * .34),base);
          add(new THREE.PlaneGeometry(width * .53,height * .86),screenMaterial,0,0,depth * .18 + .01);
          for(let lens=0;lens<3;lens+=1) add(new THREE.CylinderGeometry(.055,.055,.03,14),dark,-width*.19+(lens%2)*.12,height*.34-Math.floor(lens/2)*.12,depth*.2).rotation.x = Math.PI/2;
        } else if (name === "PS5") {
          add(new THREE.BoxGeometry(width*.46,height*.92,depth*.62),dark);
          const left = add(new THREE.BoxGeometry(width*.22,height,depth*.72),base,-width*.28,0,0); left.rotation.z = -.055;
          const right = add(new THREE.BoxGeometry(width*.22,height,depth*.72),base,width*.28,0,0); right.rotation.z = .055;
          add(new THREE.BoxGeometry(.025,height*.78,depth*.65),new THREE.MeshStandardMaterial({color:0x315eff,emissive:0x1745ff,emissiveIntensity:2}),-width*.14,0,0);
        } else if (name === "AIRPODS") {
          add(new THREE.CapsuleGeometry(width*.34,height*.22,6,12),base).rotation.z = Math.PI/2;
          add(new THREE.BoxGeometry(width*.64,.018,depth*.3),chrome,0,height*.02,depth*.05);
          add(new THREE.CapsuleGeometry(.055,height*.48,5,8),base,-width*.16,-height*.35,depth*.1); add(new THREE.CapsuleGeometry(.055,height*.48,5,8),base,width*.16,-height*.35,depth*.1);
        } else if (name === "PERFUME") {
          add(new THREE.BoxGeometry(width*.72,height*.68,depth*.72),base,0,-height*.12,0);
          add(new THREE.BoxGeometry(width*.48,height*.28,depth*.02),gold,0,-height*.13,depth*.37); add(new THREE.CylinderGeometry(width*.19,width*.23,height*.2,12),gold,0,height*.34,0); add(new THREE.CylinderGeometry(width*.13,width*.13,height*.15,12),dark,0,height*.49,0);
        } else if (name === "AIRFRYER") {
          add(new THREE.CylinderGeometry(width*.43,width*.5,height*.88,18),dark).scale.z=.82;
          add(new THREE.BoxGeometry(width*.42,height*.17,depth*.16),chrome,0,-height*.1,depth*.42); add(new THREE.BoxGeometry(width*.28,.08,.1),screenMaterial,0,height*.2,depth*.43); add(new THREE.BoxGeometry(width*.18,height*.45,.1),dark,0,-height*.25,depth*.48);
        } else if (name === "HEADSET") {
          const band = add(new THREE.TorusGeometry(width*.34,.07,8,20,Math.PI),base); band.rotation.z = Math.PI; band.position.y = height*.1;
          add(new THREE.CapsuleGeometry(width*.12,height*.25,5,8),dark,-width*.34,-height*.18,0); add(new THREE.CapsuleGeometry(width*.12,height*.25,5,8),dark,width*.34,-height*.18,0);
        } else if (name === "WATCH") {
          add(new THREE.BoxGeometry(width*.42,height*.42,depth*.45),dark);
          add(new THREE.BoxGeometry(width*.2,height*.92,depth*.18),base); const face = add(new THREE.PlaneGeometry(width*.32,height*.32),screenMaterial,0,0,depth*.24); face.rotation.z=.18; add(new THREE.TorusGeometry(width*.19,.025,6,18),gold,0,0,depth*.25);
        } else if (name === "DINHEIRO") {
          for(let layer=0;layer<4;layer+=1) add(new THREE.BoxGeometry(width,height*.19,depth),new THREE.MeshStandardMaterial({color:0x638f6a,roughness:.7}),0,-height*.3+layer*height*.19,0);
          add(new THREE.BoxGeometry(width*.13,height*.78,depth*1.02),gold);
        } else if (name === "OURO") {
          const bar = add(new THREE.CylinderGeometry(width*.34,width*.48,height*.52,4),gold); bar.rotation.y=Math.PI/4; bar.scale.z=depth/width*1.4;
        } else if (name === "SPEAKER") {
          const speaker = add(new THREE.CapsuleGeometry(height*.32,width*.55,7,12),dark); speaker.rotation.z=Math.PI/2;
          add(new THREE.CylinderGeometry(height*.22,height*.22,.025,18),gold,-width*.24,0,depth*.48).rotation.x=Math.PI/2; for(let ring=0;ring<3;ring+=1) add(new THREE.TorusGeometry(height*(.08+ring*.045),.012,5,18),chrome,-width*.24,0,depth*.5).rotation.x=Math.PI/2;
        } else if (name === "DRONE") {
          add(new THREE.BoxGeometry(width*.34,height*.24,depth*.42),base);
          for(const sx of [-1,1]) for(const sz of [-1,1]) { const arm=add(new THREE.BoxGeometry(width*.48,.06,.07),dark,sx*width*.25,0,sz*depth*.22); arm.rotation.y=sz*sx*.48; add(new THREE.TorusGeometry(width*.13,.025,6,14),base,sx*width*.42,.05,sz*depth*.38).rotation.x=Math.PI/2; }
        } else if (name === "CÂMERA") {
          add(new THREE.BoxGeometry(width,height*.66,depth*.68),dark,0,-height*.05,0); add(new THREE.CylinderGeometry(height*.22,height*.26,depth*.42,16),base,width*.15,-height*.05,depth*.45).rotation.x=Math.PI/2; add(new THREE.BoxGeometry(width*.3,height*.2,depth*.4),base,-width*.2,height*.35,0);
        } else if (name === "CONSOLE") {
          add(new THREE.BoxGeometry(width,height*.5,depth*.72),base); add(new THREE.CylinderGeometry(.07,.07,.04,12),gold,-width*.22,0,depth*.38).rotation.x=Math.PI/2; add(new THREE.CylinderGeometry(.07,.07,.04,12),gold,width*.22,0,depth*.38).rotation.x=Math.PI/2;
        } else if (name === "PRESENTE") {
          add(new THREE.BoxGeometry(width,height*.72,depth),new THREE.MeshStandardMaterial({color:0xb52129,roughness:.48}),0,-height*.08,0); add(new THREE.BoxGeometry(width*.15,height*.78,depth*1.03),gold); add(new THREE.BoxGeometry(width*1.03,height*.13,depth*1.03),gold,0,height*.12,0);
        } else add(new THREE.BoxGeometry(width,height,depth),base);
        const label = new THREE.Mesh(new THREE.PlaneGeometry(width*.68,Math.min(.2,height*.24)),new THREE.MeshBasicMaterial({map:makeLabel(name,color),transparent:false})); label.position.set(0,-height*.22,depth*.52); group.add(label);
        return group;
      };
      const activeProducts=prizeMode==="cubes"?PRODUCTS:PRODUCTS.filter((name)=>loadedPrizeModels.has(name));
      const colliderPoints = new Map<string,Float32Array>();
      Array.from({ length: 38 }, (_, index) => activeProducts[index % activeProducts.length]).forEach((name, index) => {
        const productIndex = PRODUCTS.indexOf(name);
        const [width,height,depth] = PRIZE_SIZE[name] ?? [.95,.9,.62];
        const layer=prizeMode==="cubes"?Math.floor(index/24):Math.floor(index/7); const column=prizeMode==="cubes"?index%6:index%7; const lane=prizeMode==="cubes"?Math.floor(index/6)%4:(index*4+layer*3)%6;
        const x=prizeMode==="cubes"?-2.1+column*.84:-2.06+column*.685+Math.sin(index*2.37)*.105; const y=prizeMode==="cubes"?.52+layer*.92:.46+layer*.57+Math.abs(Math.sin(index*1.61))*.09; const z=prizeMode==="cubes"?-1.28+lane*.85:-1.43+lane*.565+Math.cos(index*1.83)*.085;
        const mesh = makeProductObject(name,width,height,depth,COLORS[productIndex]); scene.add(mesh);
        mesh.updateMatrixWorld(true); const visualBounds=new THREE.Box3().setFromObject(mesh); const visualSize=visualBounds.getSize(new THREE.Vector3());
        const initialEuler = prizeMode==="cubes"?new THREE.Euler(Math.sin(index*.77)*.035,Math.sin(index*.83)*.18,Math.cos(index*.61)*.04):name === "TV" ? new THREE.Euler(-.11+Math.sin(index)*.08,Math.sin(index*.73)*.72,index%2?.24:-.24) : name === "TABLET" || name === "SMARTPHONE" || name === "IPHONE" ? new THREE.Euler(.12+Math.cos(index)*.08,Math.sin(index*.81)*.62,index%2?.58:-.58) : name === "BICICLETA" ? new THREE.Euler(Math.sin(index)*.08,Math.sin(index)*1.25,index%2?.16:-.16) : name === "PERFUME" ? new THREE.Euler(.06,Math.sin(index*.91)*.62,index%2?.18:-.18) : new THREE.Euler(Math.sin(index*.77)*.18,Math.cos(index*.63)*.32,Math.cos(index*.89)*.2); const initialRotation=new THREE.Quaternion().setFromEuler(initialEuler);
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setRotation({ x: initialRotation.x, y: initialRotation.y, z: initialRotation.z, w: initialRotation.w }).setLinearDamping(.42).setAngularDamping(.68).setCcdEnabled(true).setCanSleep(true));
        const density = name === "AIRFRYER" ? 2.15 : name === "PC GAMER" ? 1.95 : name === "PERFUME" ? 1.35 : name === "DINHEIRO" ? .68 : name === "TV" ? .82 : name === "BICICLETA" ? .62 : 1.05;
        let points=colliderPoints.get(name); if(!points){ const collected:number[]=[]; const rootInverse=new THREE.Matrix4().copy(mesh.matrixWorld).invert(); mesh.traverse((child)=>{ if(!(child instanceof THREE.Mesh)||!child.geometry.attributes.position)return; const position=child.geometry.attributes.position; const step=Math.max(1,Math.floor(position.count/90)); const localMatrix=new THREE.Matrix4().multiplyMatrices(rootInverse,child.matrixWorld); for(let vertex=0;vertex<position.count;vertex+=step){ const point=new THREE.Vector3().fromBufferAttribute(position,vertex).applyMatrix4(localMatrix); collected.push(point.x,point.y,point.z); } }); points=new Float32Array(collected); colliderPoints.set(name,points); }
        const friction=name === "DINHEIRO" ? .99 : name === "BICICLETA" ? .72 : .82; const restitution=name === "DINHEIRO" ? 0 : .018;
        if(prizeMode==="cubes"){
          world.createCollider(RAPIER.ColliderDesc.roundCuboid(visualSize.x/2,visualSize.y/2,visualSize.z/2,.035).setDensity(.92).setFriction(.88).setRestitution(.012),body);
        } else if(name === "BICICLETA"){
          const wheelRadius=Math.max(.12,Math.min(visualSize.y*.34,visualSize.x*.2)); const wheelX=visualSize.x*.31;
          world.createCollider(RAPIER.ColliderDesc.ball(wheelRadius).setTranslation(-wheelX,-visualSize.y*.16,0).setDensity(density).setFriction(friction).setRestitution(0),body);
          world.createCollider(RAPIER.ColliderDesc.ball(wheelRadius).setTranslation(wheelX,-visualSize.y*.16,0).setDensity(density).setFriction(friction).setRestitution(0),body);
          world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(.12,visualSize.x*.25),.055).setRotation({x:0,y:0,z:.58,w:.815}).setDensity(density).setFriction(friction).setRestitution(0),body);
        } else if(name === "SPEAKER"){
          const radius=Math.max(.12,Math.min(visualSize.y,visualSize.z)*.42); const halfLength=Math.max(.1,visualSize.x/2-radius);
          world.createCollider(RAPIER.ColliderDesc.capsule(halfLength,radius).setRotation({x:0,y:0,z:.7071,w:.7071}).setDensity(density).setFriction(.9).setRestitution(.01),body);
        } else if(name === "WATCH"){
          const faceRadius=Math.max(.13,Math.min(visualSize.x,visualSize.y)*.3);
          world.createCollider(RAPIER.ColliderDesc.ball(faceRadius).setDensity(density*1.35).setFriction(.88).setRestitution(0),body);
          world.createCollider(RAPIER.ColliderDesc.roundCuboid(Math.max(.08,visualSize.x*.18),Math.max(.1,visualSize.y*.42),Math.max(.035,visualSize.z*.2),.018).setDensity(density*.55).setFriction(.94).setRestitution(0),body);
        } else {
          const isThin=name === "TV" || name === "TABLET" || name === "SMARTPHONE" || name === "IPHONE" || name === "DINHEIRO";
          const collider = isThin ? RAPIER.ColliderDesc.roundCuboid(Math.max(.04,visualSize.x/2),Math.max(.04,visualSize.y/2),Math.max(.025,visualSize.z/2),.018) : points.length>=12 ? RAPIER.ColliderDesc.convexHull(points) ?? RAPIER.ColliderDesc.roundCuboid(Math.max(.04,visualSize.x/2),Math.max(.04,visualSize.y/2),Math.max(.04,visualSize.z/2),.025) : RAPIER.ColliderDesc.roundCuboid(Math.max(.04,visualSize.x/2),Math.max(.04,visualSize.y/2),Math.max(.04,visualSize.z/2),.025);
          world.createCollider(collider.setDensity(density).setFriction(friction).setRestitution(restitution), body);
          if(name === "PERFUME") world.createCollider(RAPIER.ColliderDesc.ball(Math.max(.06,Math.min(visualSize.x,visualSize.z)*.2)).setTranslation(0,-visualSize.y*.3,0).setDensity(3.2).setFriction(.88).setRestitution(0),body);
        }
        const halfHeight=Math.max(.06,visualSize.y/2); const profile=prizeMode==="cubes"?{height:.08,radius:1,hold:.92}:GRIP_PROFILE[name] ?? {height:.12,radius:.86,hold:1};
        const gripDifficulty = prizeMode==="cubes"?.94:name === "AIRFRYER" ? 1.3 : name === "PC GAMER" ? 1.24 : name === "BICICLETA" ? 1.18 : name === "TV" ? 1.12 : name === "DINHEIRO" ? .86 : name === "IPHONE" || name === "TABLET" || name === "SMARTPHONE" ? .94 : 1;
        rigidMeshes.push({ body, mesh, name, halfHeight, gripHeight:halfHeight*profile.height, gripRadius:THREE.MathUtils.clamp(Math.max(visualSize.x,visualSize.z)/2*profile.radius,.24,.62), holdOffset:profile.hold+halfHeight*.32, gripDifficulty });
      });
      for (let i = 0; i < 520; i += 1) world.step();
      rigidMeshes.forEach(({body})=>{ const speed=body.linvel(); const spin=body.angvel(); if(Math.hypot(speed.x,speed.y,speed.z)<.08&&Math.hypot(spin.x,spin.y,spin.z)<.1)body.sleep(); });

      const carriage = new THREE.Group(); scene.add(carriage); carriage.position.set(0, 6.15, .4);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(5.5, .16, .22), new THREE.MeshStandardMaterial({ color: 0x7d6b86, metalness: .9, roughness: .2 })); rail.position.set(0, 6.48, .4); scene.add(rail);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(.48, .56, .72, 20), new THREE.MeshStandardMaterial({ color: 0xb7bac0, metalness: .92, roughness: .2 })); motor.rotation.x = Math.PI / 2; motor.castShadow = true; carriage.add(motor);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1, 8), new THREE.MeshStandardMaterial({ color: 0x131318, metalness: .7, roughness: .3 })); carriage.add(cable);
      const REST_CLAW_Y = -1.45;
      const DELIVERY_CLAW_Y = -.28;
      const FLOOR_SAFE_CLAW_Y = -4.15;
      const TIP_OFFSET = 1.76;
      const claw = new THREE.Group(); claw.position.y = REST_CLAW_Y; carriage.add(claw);
      const updateCable = () => { const top = -.38; const bottom = claw.position.y + .24; const length = Math.max(.2, top - bottom); cable.scale.y = length; cable.position.y = (top + bottom) / 2; };
      updateCable();
      const polishedSteel=new THREE.MeshStandardMaterial({color:0xb9bec6,metalness:.98,roughness:.15}); const darkSteel=new THREE.MeshStandardMaterial({color:0x4d535c,metalness:1,roughness:.13});
      const makeClawBeam=(from:THREE.Vector3,to:THREE.Vector3,width:number,depth:number,material:THREE.Material)=>{ const direction=new THREE.Vector3().subVectors(to,from); const beam=new THREE.Mesh(new THREE.BoxGeometry(width,direction.length(),depth),material); beam.position.copy(from).add(to).multiplyScalar(.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize()); beam.castShadow=true; return beam; };
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.34, .4, .5, 12), darkSteel); hub.castShadow = true; claw.add(hub);
      const upperCollar = new THREE.Mesh(new THREE.CylinderGeometry(.25,.31,.3,12),new THREE.MeshStandardMaterial({color:0x767b83,metalness:.98,roughness:.12})); upperCollar.position.y=.38; claw.add(upperCollar);
      const lowerRing = new THREE.Mesh(new THREE.TorusGeometry(.4,.07,8,20),new THREE.MeshStandardMaterial({color:0xe3e6eb,metalness:1,roughness:.1})); lowerRing.rotation.x=Math.PI/2; lowerRing.position.y=-.18; claw.add(lowerRing);
      const fingers: THREE.Group[] = [];
      const fingerKnees: THREE.Mesh[]=[]; const fingerLinkages: THREE.Mesh[]=[]; const fingerTips: THREE.Mesh[]=[]; const fingerTipMaterials: THREE.MeshStandardMaterial[]=[]; const fingerPressure=[0,0,0];
      const gripContacts: Array<{ node: THREE.Object3D; body: InstanceType<typeof RAPIER.RigidBody>; collider: InstanceType<typeof RAPIER.Collider>; finger: number }> = [];
      for (let i = 0; i < 3; i += 1) {
        const pivot = new THREE.Group(); pivot.rotation.y = i * Math.PI * 2 / 3; claw.add(pivot);
        const upperArm=makeClawBeam(new THREE.Vector3(.13,-.12,0),new THREE.Vector3(.62,-.78,0),.18,.13,polishedSteel); pivot.add(upperArm);
        const lowerArm=makeClawBeam(new THREE.Vector3(.62,-.78,0),new THREE.Vector3(.48,-1.42,0),.16,.12,darkSteel); pivot.add(lowerArm);
        const innerHook=makeClawBeam(new THREE.Vector3(.48,-1.42,0),new THREE.Vector3(.24,-1.72,0),.17,.13,polishedSteel); pivot.add(innerHook);
        const linkage=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(.18,-.2,.055),new THREE.Vector3(.52,-.72,.055)),8,.038,6,false),darkSteel); pivot.add(linkage); fingerLinkages.push(linkage);
        const knee = new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.13,14),polishedSteel); knee.position.set(.62,-.78,0); knee.rotation.x=Math.PI/2; pivot.add(knee); fingerKnees.push(knee);
        const hingePlate=new THREE.Mesh(new THREE.BoxGeometry(.22,.34,.14),darkSteel); hingePlate.position.set(.18,-.23,0); hingePlate.rotation.z=-.42; pivot.add(hingePlate);
        const gripMaterial=new THREE.MeshStandardMaterial({ color: 0x9b7022, emissive: 0x4b2803, emissiveIntensity: .32, metalness: .18, roughness: .58 });
        const grip = new THREE.Mesh(new THREE.BoxGeometry(.13,.22,.16),gripMaterial); grip.position.set(.18,-1.76,0); grip.rotation.z = .58; pivot.add(grip); fingerTips.push(grip); fingerTipMaterials.push(gripMaterial);
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.12,12),polishedSteel); bolt.position.set(.12,-.12,0); bolt.rotation.x=Math.PI/2; pivot.add(bolt); fingers.push(pivot);
        [[.48,-.62,.085],[.52,-1.18,.095],[.18,-1.76,.11]].forEach(([contactX,contactY,radius]) => {
          const node = new THREE.Object3D(); node.position.set(contactX,contactY,0); pivot.add(node);
          const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,8,0));
          const collider=world.createCollider(RAPIER.ColliderDesc.ball(radius).setFriction(1.08).setRestitution(0),body); gripContacts.push({node,body,collider,finger:i});
        });
      }
      const clawLight = new THREE.PointLight(0xffd56e, 7, 5); clawLight.position.y = -.7; claw.add(clawLight);
      const deliveryHaloMaterial=new THREE.MeshBasicMaterial({color:0xffd76a,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
      const deliveryHalo=new THREE.Mesh(new THREE.TorusGeometry(.72,.035,8,36),deliveryHaloMaterial); deliveryHalo.rotation.x=Math.PI/2; deliveryHalo.position.y=-.78; deliveryHalo.visible=false; claw.add(deliveryHalo);
      const celebrationParticles:THREE.Mesh[]=[];
      for(let index=0;index<14;index+=1){ const particle=new THREE.Mesh(new THREE.OctahedronGeometry(.035+(index%3)*.012),new THREE.MeshBasicMaterial({color:index%3===0?0xfff1a1:index%3===1?0xffbd3d:0xe995ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending})); particle.visible=false; claw.add(particle); celebrationParticles.push(particle); }
      let localPhase: Phase = "ready"; let phaseAt = performance.now(); let captured: typeof rigidMeshes[number] | null = null; let attemptedPrize: typeof rigidMeshes[number] | null = null; let captureOutcome: CaptureOutcome = "miss"; let escapeStarted = false; let escapeAt = 0; let dropTargetY = FLOOR_SAFE_CLAW_Y; let closedFingerAngle = -.16;
      const gripContactHistory = new Map<(typeof rigidMeshes)[number],Set<number>>();
      const itemByBodyHandle = new Map(rigidMeshes.map((item)=>[item.body.handle,item]));
      const findGripCandidates = () => {
        const point = new THREE.Vector3(); claw.getWorldPosition(point);
        const tipY = point.y - TIP_OFFSET;
        return rigidMeshes.map((item) => {
          const p = item.body.translation();
          const horizontal = Math.hypot(p.x - point.x, p.z - point.z);
          const gripDistance = Math.abs((p.y + item.gripHeight) - tipY);
          const alignment = horizontal / (item.gripRadius + .32);
          return { item, horizontal, gripDistance, alignment, score: alignment + gripDistance * .72 };
        }).filter(({ item, horizontal, gripDistance }) => horizontal < item.gripRadius + .46 && gripDistance < .68).sort((a, b) => a.score - b.score);
      };
      const keys = (event: KeyboardEvent, active: boolean) => { if (event.key === "ArrowLeft" || event.key === "a") controlRef.current.left = active; if (event.key === "ArrowRight" || event.key === "d") controlRef.current.right = active; if (event.key === "ArrowUp" || event.key === "w") controlRef.current.forward = active; if (event.key === "ArrowDown" || event.key === "s") controlRef.current.back = active; if (active && event.code === "Space") drop(); };
      const keydown = (event: KeyboardEvent) => keys(event, true); const keyup = (event: KeyboardEvent) => keys(event, false); window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup);
      const clock = new THREE.Clock();
      const animate = () => {
        if (cancelled) return; frame = requestAnimationFrame(animate); const dt = Math.min(.033, clock.getDelta());
        if (commandRef.current === "drop") {
          commandRef.current = null; localPhase = "drop"; phaseAt = performance.now();
          const nearbyTops = rigidMeshes.map((item) => { const p = item.body.translation(); return { item, distance: Math.hypot(p.x - carriage.position.x, p.z - carriage.position.z), gripY: p.y + item.gripHeight, top:p.y+item.halfHeight }; }).filter(({ item, distance }) => distance < item.gripRadius + .42).sort((a, b) => b.top - a.top);
          const contactTipY = nearbyTops[0] ? nearbyTops[0].gripY : .2;
          dropTargetY = THREE.MathUtils.clamp(contactTipY + TIP_OFFSET - carriage.position.y, FLOOR_SAFE_CLAW_Y, REST_CLAW_Y - .38);
          updatePhase("drop", nearbyTops[0] ? "DESCENDO ATÉ O PRIMEIRO CONTATO" : "DESCENDO COM LIMITE DE PISO");
        }
        if ((localPhase === "ready" || localPhase === "result") && phaseRef.current === "aim") { localPhase = "aim"; captured=null; attemptedPrize=null; captureOutcome="miss"; escapeStarted=false; escapeAt=0; claw.position.y=REST_CLAW_Y; fingers.forEach((finger,index)=>{ finger.rotation.z=.05; fingerKnees[index].rotation.z=0; fingerLinkages[index].rotation.z=0; fingerTips[index].scale.set(1,1,1); }); updateCable(); }
        if (localPhase === "aim") {
          const controls = controlRef.current; const velocityX=((controls.right ? 1 : 0) - (controls.left ? 1 : 0)) * 2.4; const velocityZ=((controls.back ? 1 : 0) - (controls.forward ? 1 : 0)) * 2.1; carriage.position.x = THREE.MathUtils.clamp(carriage.position.x + velocityX * dt, -2.25, 2.25);
          carriage.position.z = THREE.MathUtils.clamp(carriage.position.z + velocityZ * dt, -1.65, 1.65); claw.rotation.z += (-velocityX*.035-claw.rotation.z)*.09; claw.rotation.x += (velocityZ*.035-claw.rotation.x)*.09; claw.rotation.y += (velocityX*.025-claw.rotation.y)*.06;
        }
        const elapsed = (performance.now() - phaseAt) / 1000;
        if (localPhase === "drop") {
          const progress = Math.min(1, elapsed / 2.05); const eased = 1 - Math.pow(1 - progress, 3); claw.position.y = THREE.MathUtils.lerp(REST_CLAW_Y, dropTargetY, eased); updateCable();
          fingers.forEach((finger,index) => { const mechanicalProgress=THREE.MathUtils.clamp(progress*1.82-index*.055,0,1); finger.rotation.z=THREE.MathUtils.lerp(.05,.34,mechanicalProgress); fingerKnees[index].rotation.z=mechanicalProgress*.12; fingerLinkages[index].rotation.z=-mechanicalProgress*.075; });
          if (progress >= 1) {
            attemptedPrize = findGripCandidates()[0]?.item ?? null;
            closedFingerAngle = attemptedPrize ? THREE.MathUtils.lerp(-.2, .06, THREE.MathUtils.clamp((attemptedPrize.gripRadius - .34) / .28, 0, 1)) : -.2;
            gripContactHistory.clear(); localPhase = "grip"; phaseAt = performance.now(); updatePhase("grip", attemptedPrize ? "GARRA ACOMODANDO O PRÊMIO" : "GARRA FECHANDO");
          }
        } else if (localPhase === "grip") {
          const closeProgress = Math.min(1, elapsed / 1.08);
          fingers.forEach((finger,index) => { const delayed=THREE.MathUtils.clamp((closeProgress-index*.07)*1.15,0,1); const mechanicalClose=1-Math.pow(1-delayed,3); const pressure=fingerPressure[index]; finger.rotation.z=THREE.MathUtils.lerp(.34,closedFingerAngle,mechanicalClose)-pressure*.025; fingerKnees[index].rotation.z=THREE.MathUtils.lerp(.12,-.055,mechanicalClose)-pressure*.018; fingerLinkages[index].rotation.z=THREE.MathUtils.lerp(-.075,.045,mechanicalClose)+pressure*.012; fingerTips[index].scale.set(1+pressure*.1,THREE.MathUtils.lerp(1,.965,mechanicalClose)-pressure*.13,1+pressure*.06); fingerTipMaterials[index].emissiveIntensity=.32+pressure*.72; });
          claw.position.y = dropTargetY + Math.sin(Math.min(1,closeProgress)*Math.PI)*-.035; updateCable();
          if (closeProgress >= 1) {
            const bestCandidate = findGripCandidates()[0]; attemptedPrize = bestCandidate?.item ?? attemptedPrize;
            const contactedFingers=bestCandidate ? gripContactHistory.get(bestCandidate.item)?.size ?? 0 : 0;
            captureOutcome = !bestCandidate ? "miss" : contactedFingers >= 2 && bestCandidate.alignment <= .62 && bestCandidate.gripDistance <= .56 ? "firm" : contactedFingers >= 1 && bestCandidate.alignment <= 1 ? "near" : "miss";
            captured = captureOutcome === "miss" ? null : attemptedPrize; escapeStarted = false;
            if(captured) captured.body.setLinearDamping(.72);
            localPhase = "lift"; phaseAt = performance.now(); updatePhase("lift", captureOutcome === "firm" ? "ENCAIXE FIRME · SUBINDO" : captureOutcome === "near" ? "ENCAIXE INSTÁVEL · ATENÇÃO" : "GARRA FECHOU VAZIA");
          }
        } else if (localPhase === "lift") {
          const progress = Math.min(1, elapsed / 2.65); const activeCloseAngle = escapeStarted ? closedFingerAngle + .13 : closedFingerAngle; fingers.forEach((finger,index) => { const pressure=fingerPressure[index]; finger.rotation.z=activeCloseAngle-pressure*.018; fingerKnees[index].rotation.z=-.055-pressure*.012; fingerLinkages[index].rotation.z=.045+pressure*.01; const compression=captured?.92:.98; fingerTips[index].scale.set(1+pressure*.08,compression-pressure*.1,1+pressure*.05); fingerTipMaterials[index].emissiveIntensity=.32+pressure*.55; }); claw.position.y = THREE.MathUtils.lerp(dropTargetY, REST_CLAW_Y, 1 - Math.cos(progress * Math.PI / 2)); updateCable();
          if (captured && elapsed > .12 && !escapeStarted) { const point = new THREE.Vector3(); claw.getWorldPosition(point); const p = captured.body.translation(); const swayX = Math.sin(elapsed * 5.2) * .075 * captured.gripDifficulty * (1 - progress); const target = { x: point.x + swayX, y: point.y - captured.holdOffset, z: point.z }; const baseStrength = captureOutcome === "near" ? THREE.MathUtils.lerp(5.4, 6.8, 1 - captured.gripRadius) : THREE.MathUtils.lerp(7.2, 9.1, 1 - captured.gripRadius); const strength=baseStrength/captured.gripDifficulty; captured.body.setGravityScale((captureOutcome === "near" ? .48 : .22)*captured.gripDifficulty, true); captured.body.setLinvel({ x: (target.x - p.x) * strength, y: (target.y - p.y) * strength, z: (target.z - p.z) * strength }, true); captured.body.setAngvel({ x: 0, y: Math.sin(elapsed * 3.1) * .18*captured.gripDifficulty, z: Math.cos(elapsed * 2.7) * .12*captured.gripDifficulty }, true); }
          if (captureOutcome === "near" && captured && progress > .38 && !escapeStarted) { escapeStarted = true; escapeAt=elapsed; captured.body.setGravityScale(.58, true); captured.body.setLinvel({ x: Math.sin(elapsed * 4) * .12, y: -.08, z: Math.cos(elapsed * 3) * .1 }, true); captured.body.setAngvel({ x: .34, y: .18, z: -.28 }, true); updatePhase("lift", "QUASE! O PRÊMIO ESTÁ ESCORREGANDO"); }
          if(captureOutcome==="near"&&captured&&escapeStarted){ const slip=THREE.MathUtils.clamp((elapsed-escapeAt)/.62,0,1); captured.body.setGravityScale(THREE.MathUtils.lerp(.58,1,slip),true); const velocity=captured.body.linvel(); captured.body.setLinvel({x:velocity.x+Math.sin(elapsed*5)*.012,y:THREE.MathUtils.lerp(velocity.y,-.72,slip*.12),z:velocity.z+Math.cos(elapsed*4)*.009},true); if(slip>=1){ captured.body.setGravityScale(1,true); captured.body.setAngvel({x:1.05,y:.55,z:-.76},true); captured=null; updatePhase("lift","QUASE! O PRÊMIO ESCAPOU"); } }
          if(captureOutcome==="miss") claw.rotation.z=Math.sin(elapsed*8)*.018*(1-progress);
          if (progress >= 1) {
            phaseAt=performance.now();
            if(captureOutcome==="firm"&&captured){ localPhase="deliver"; updatePhase("deliver","PRÊMIO SENDO RECOLHIDO"); }
            else { localPhase="result"; setWon(null); setOutcome(captureOutcome); updatePhase("result",captureOutcome==="near"?"QUASE CAPTURA":"NÃO ENCAIXOU"); }
          }
        } else if(localPhase==="deliver"){
          const deliveryProgress=Math.min(1,elapsed/2.15); const rising=Math.min(1,elapsed/1.08); const returning=THREE.MathUtils.clamp((elapsed-1.52)/.58,0,1);
          claw.position.y=returning>0?THREE.MathUtils.lerp(DELIVERY_CLAW_Y,REST_CLAW_Y,1-Math.cos(returning*Math.PI/2)):THREE.MathUtils.lerp(REST_CLAW_Y,DELIVERY_CLAW_Y,1-Math.cos(rising*Math.PI/2)); updateCable();
          fingers.forEach((finger,index)=>{ finger.rotation.z=THREE.MathUtils.lerp(closedFingerAngle,.05,returning); fingerKnees[index].rotation.z=THREE.MathUtils.lerp(-.055,0,returning); fingerLinkages[index].rotation.z=THREE.MathUtils.lerp(.045,0,returning); fingerTips[index].scale.y=THREE.MathUtils.lerp(.94,1,returning); });
          if(captured&&elapsed<1.45){ const point=new THREE.Vector3(); claw.getWorldPosition(point); const p=captured.body.translation(); const targetY=point.y-.28-captured.halfHeight*.42; const strength=10.5; captured.body.setGravityScale(0,true); captured.body.setLinvel({x:(point.x-p.x)*strength,y:(targetY-p.y)*strength,z:(point.z-p.z)*strength},true); captured.body.setAngvel({x:0,y:.13,z:0},true); const shrink=THREE.MathUtils.clamp((elapsed-.92)/.5,0,1); captured.mesh.scale.setScalar(1-shrink*.9); }
          if(captured&&elapsed>=1.45){ captured.body.setEnabled(false); captured.mesh.visible=false; }
          if(deliveryProgress>=1){ const prize=attemptedPrize?.name??null; captured=null; localPhase="result"; phaseAt=performance.now(); setWon(prize); setOutcome("firm"); updatePhase("result","PRÊMIO ENTREGUE · PARABÉNS!"); }
        }
        gripContacts.forEach(({node,body}) => { const point = new THREE.Vector3(); node.getWorldPosition(point); body.setNextKinematicTranslation({x:point.x,y:point.y,z:point.z}); });
        world.timestep = dt; world.step();
        const touchingNow=[false,false,false];
        if(localPhase==="grip" || localPhase==="lift") gripContacts.forEach(({collider,finger})=>{ world.contactPairsWith(collider,(other)=>{ const parent=other.parent(); if(!parent)return; const item=itemByBodyHandle.get(parent.handle); if(!item)return; touchingNow[finger]=true; if(localPhase==="grip"){ const contacts=gripContactHistory.get(item)??new Set<number>(); contacts.add(finger); gripContactHistory.set(item,contacts); } }); });
        fingerPressure.forEach((pressure,index)=>{ const target=touchingNow[index]?1:0; fingerPressure[index]=THREE.MathUtils.lerp(pressure,target,touchingNow[index] ? .28 : .11); if(localPhase!=="grip"&&localPhase!=="lift"){ fingerTipMaterials[index].emissiveIntensity+=(.32-fingerTipMaterials[index].emissiveIntensity)*.12; } });
        rigidMeshes.forEach(({ body, mesh }) => { const p = body.translation(); const q = body.rotation(); mesh.position.set(p.x, p.y, p.z); mesh.quaternion.set(q.x, q.y, q.z, q.w); });
        const actionPhase = localPhase === "drop" || localPhase === "grip" || localPhase === "lift" || localPhase === "deliver";
        const deliveryActive=localPhase==="deliver"; deliveryHalo.visible=deliveryActive; deliveryHaloMaterial.opacity=deliveryActive ? .35+Math.sin(elapsed*8)*.2 : 0; deliveryHalo.rotation.z+=deliveryActive ? dt*1.7 : 0; deliveryHalo.scale.setScalar(deliveryActive ? .9+Math.sin(elapsed*5)*.08 : 1);
        celebrationParticles.forEach((particle,index)=>{ particle.visible=deliveryActive; const burst=THREE.MathUtils.clamp((elapsed-.55)/.72,0,1); const angle=index/celebrationParticles.length*Math.PI*2+elapsed*.55; const radius=.25+burst*(.58+(index%4)*.08); particle.position.set(Math.cos(angle)*radius,-.72+Math.sin(elapsed*2.4+index)*.18,Math.sin(angle)*radius); const material=particle.material as THREE.MeshBasicMaterial; material.opacity=deliveryActive?Math.sin(burst*Math.PI)*.85:0; particle.rotation.x+=dt*(1.5+index*.05); particle.rotation.y+=dt*2; });
        const motorShake=actionPhase?Math.sin(performance.now()*.052)*.018:0; motor.position.x+=(motorShake-motor.position.x)*.18; motor.position.y=actionPhase?Math.sin(performance.now()*.067)*.008:0;
        const resultPulse = localPhase === "result" ? .5 + Math.sin(elapsed * 7) * .5 : 0;
        let targetCameraZ = actionPhase ? 11.35 : 12.2; let targetCameraY = actionPhase ? 6.82 : 7.15; let shake = 0;
        if (localPhase === "result") {
          targetCameraZ = captureOutcome === "firm" ? 10.95 : captureOutcome === "near" ? 11.45 : 12.05;
          targetCameraY = captureOutcome === "firm" ? 6.62 : 6.95;
          shake = elapsed < .42 ? Math.sin(elapsed * 68) * (captureOutcome === "firm" ? .045 : captureOutcome === "near" ? .025 : .012) * (1 - elapsed / .42) : 0;
        }
        if (captureOutcome === "firm" && (localPhase === "lift" || localPhase === "deliver" || localPhase === "result")) { rimMaterial.color.setHex(0xffbd35); rimMaterial.emissive.setHex(0xb86a08); rimMaterial.emissiveIntensity = 2.5 + resultPulse * 2.2; clawLight.color.setHex(0xffd052); clawLight.intensity = 9 + resultPulse * 5; }
        else if (captureOutcome === "near" && (localPhase === "lift" || localPhase === "result")) { rimMaterial.color.setHex(0xff7b39); rimMaterial.emissive.setHex(0x9d2d09); rimMaterial.emissiveIntensity = 2.15 + resultPulse; clawLight.color.setHex(0xff8d42); clawLight.intensity = 7.5; }
        else if (captureOutcome === "miss" && (localPhase === "lift" || localPhase === "result")) { rimMaterial.color.setHex(0xc78b3d); rimMaterial.emissive.setHex(0x6f360b); rimMaterial.emissiveIntensity = 1.35; clawLight.color.setHex(0xffb357); clawLight.intensity = 4.2; }
        else { rimMaterial.color.setHex(0x9b49dc); rimMaterial.emissive.setHex(0x6a20b7); rimMaterial.emissiveIntensity = 2.2; clawLight.color.setHex(0xffd56e); clawLight.intensity = 7; }
        const ambientTime = performance.now() * .00018;
        arcadeBackdrop.position.x+=(carriage.position.x*.035-arcadeBackdrop.position.x)*.018; arcadeBackdrop.position.y=3.45+Math.sin(ambientTime*1.7)*.018;
        (backGlow.material as THREE.MeshBasicMaterial).opacity=.17+Math.sin(ambientTime*3.2)*.035;
        arcadeScreens.forEach((screen,index)=>{ (screen.material as THREE.MeshStandardMaterial).emissiveIntensity=.85+Math.sin(ambientTime*(8+index*.35)+index)*.42; });
        outerLeftGlow.intensity=6.2+Math.sin(ambientTime*5.1)*1.1; outerRightGlow.intensity=5.4+Math.cos(ambientTime*4.6)*.9;
        clawGlassReflection.position.x+=(carriage.position.x*.84-clawGlassReflection.position.x)*.09; clawGlassReflection.position.y=THREE.MathUtils.clamp(5.28+claw.position.y*.68,1.25,4.85); (clawGlassReflection.material as THREE.MeshBasicMaterial).opacity=actionPhase?.065:.028;
        edgeGlass.forEach((edge,index)=>{ edge.scale.x=.88+Math.sin(ambientTime*4.4+index*Math.PI)*.16; (edge.material as THREE.MeshBasicMaterial).opacity=.075+Math.sin(ambientTime*3.8+index)*.025; });
        glassWear.position.x=carriage.position.x*-.008; (glassWear.material as THREE.MeshBasicMaterial).opacity=localPhase==="result"?.42:.3;
        glassReflections.forEach((reflection,index) => { reflection.position.x = -4.8 + ((ambientTime * (1.05 + index * .17) + index * 2.75) % 9.6); (reflection.material as THREE.MeshBasicMaterial).opacity = .035 + Math.sin(ambientTime * 7 + index) * .014; });
        casinoDots.forEach((dot,index) => { const material = dot.material as THREE.MeshBasicMaterial; material.opacity = .18 + Math.sin(ambientTime * 13 + index * .7) * .1; dot.scale.setScalar(.86 + Math.sin(ambientTime * 9 + index) * .12); });
        prizeFillLeft.intensity=6.7+Math.sin(ambientTime*8)*.8; prizeFillRight.intensity=8.2+Math.cos(ambientTime*7)*.8;
        silhouettes.forEach((person,index)=>{ person.position.x=-4.4+((ambientTime*(.55+index*.08)+index*1.85)%8.8); person.position.y=.68+Math.sin(ambientTime*8+index)*.025; });
        if(localPhase!=="aim"){ claw.rotation.x*=.94; claw.rotation.z*=.94; claw.rotation.y+=(-claw.rotation.y)*.06; }
        camera.position.x += (carriage.position.x * .11 - camera.position.x) * .035; camera.position.y += (targetCameraY - camera.position.y) * .035; camera.position.z += (targetCameraZ - camera.position.z) * .035; camera.position.x += shake; camera.lookAt(carriage.position.x * .08, actionPhase ? 2.32 : 2.55, carriage.position.z * .08); renderer.render(scene, camera);
      };
      animate();
      const resize = () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); }; window.addEventListener("resize", resize);
      cleanup = () => { window.removeEventListener("resize", resize); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); cancelAnimationFrame(frame); arcadeTexture.dispose(); wearTexture.dispose(); cubeTextures.forEach((texture)=>texture.dispose()); renderer.dispose(); scene.clear(); renderer.domElement.remove(); };
    })();
    return () => { cancelled = true; cleanup(); };
  }, [prizeMode]);

  const pointer = (key: keyof Controls, active: boolean) => (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.stopPropagation(); if (active) event.currentTarget.setPointerCapture(event.pointerId); hold(key, active); };
  return <main className="three-page"><section className={`three-cabinet phase-${phase}`}>
    <header><button onClick={() => { window.location.href="/maquinas"; }}>←</button><div><b>GARRA PREMIADA</b><small>{prizeMode === "cubes" ? "BOX 3D · CUBOS" : "ARENA 3D · MODELOS"}</small></div><span>◆ 350</span></header>
    <div className="three-stage" ref={host}><div className="three-hud"><span>JOGADAS <b>{plays}</b></span><span>PRÊMIOS NA CAIXA <b>38</b></span></div><div className="three-status"><i />{status}</div>{phase === "ready" && <button className="three-start" onClick={start}>INICIAR TESTE 3D</button>}{phase === "result" && <div className={`three-result result-${outcome ?? "miss"}`}><small>{outcome === "firm" ? "CAPTURA FIRME" : outcome === "near" ? "QUASE CAPTURA" : "TENTE NOVAMENTE"}</small><b>{won ?? (outcome === "near" ? "O PRÊMIO ESCAPOU" : "A GARRA VOLTOU VAZIA")}</b><button onClick={start}>NOVA JOGADA</button></div>}</div>
    <div className="three-console"><div className="three-credit"><small>1 JOGADA</small><b>◆ 20</b><em>{phase === "aim" ? "ESCOLHA A POSIÇÃO" : "MÁQUINA EM MOVIMENTO"}</em></div><div className={`three-pad stick-${stick}`} role="application" aria-label="Joystick para mover a garra" onContextMenu={(event)=>event.preventDefault()} onDragStart={(event)=>event.preventDefault()} onPointerDown={beginPad} onPointerMove={movePad} onPointerUp={releasePad} onPointerCancel={releasePad} onLostPointerCapture={releasePad}><button aria-label="Mover para frente" onPointerDown={pointer("forward",true)} onPointerUp={pointer("forward",false)} onPointerCancel={pointer("forward",false)}>▲</button><button aria-label="Mover para esquerda" onPointerDown={pointer("left",true)} onPointerUp={pointer("left",false)} onPointerCancel={pointer("left",false)}>◀</button><i /><button aria-label="Mover para direita" onPointerDown={pointer("right",true)} onPointerUp={pointer("right",false)} onPointerCancel={pointer("right",false)}>▶</button><button aria-label="Mover para trás" onPointerDown={pointer("back",true)} onPointerUp={pointer("back",false)} onPointerCancel={pointer("back",false)}>▼</button></div><button className="three-drop" disabled={phase !== "aim"} onClick={drop}><span>▼</span><b>PEGAR</b><small>◆ 20</small></button></div>
    <nav><a>♛<small>MÁQUINA</small></a><a>◆<small>PRÊMIOS</small></a><a>↻<small>HISTÓRICO</small></a></nav>
  </section></main>;
}
