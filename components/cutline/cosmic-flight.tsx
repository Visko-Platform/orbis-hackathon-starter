"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface CosmicFlightProps {
  /** 0 multiverse, 1 universe, 2 web, 3 galaxy, 4 solar, 5 Earth, 6 SF, 7 theater, 8 film. */
  chapter: number;
  onNavigate: (index: number) => void;
  disabled?: boolean;
}

// Original NASA equirectangular texture; copy earth-day.jpg from the asset handoff here.
const EARTH_TEXTURE = "/images/nasa/earth-day.jpg";
const SAN_FRANCISCO_TEXTURE = "/images/nasa/san-francisco.jpg";
const LABELS = [
  "Enter this universe",
  "Follow the cosmic web",
  "Choose the Milky Way",
  "Find our solar system",
  "Travel to Earth",
  "Find San Francisco",
  "Enter the theater",
  "Begin the live film",
];
const DETAILS = [
  "A possibility among possibilities",
  "Galaxies connected across the dark",
  "One spiral among billions",
  "A small light in an outer arm",
  "Our shared world",
  "One city on the Pacific",
  "One room. One audience.",
  "Your next choice changes the picture",
];
const SCALE_RATIO = 7;
const CAMERA_DISTANCE = 34;
const OFFSETS: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 0],
  [2, -1, 0],
  [5, -2, 0],
  [8, 0, 2],
  [0, 0, 8.06],
  [0, -0.5, 0.5],
  [0, 1.0, -5.0],
];
const clampChapter = (value: number) =>
  Math.min(8, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** A single continuously rendered, nested 3D world. No full-frame image slides. */
export function CosmicFlight({
  chapter,
  onNavigate,
  disabled = false,
}: CosmicFlightProps) {
  const host = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLButtonElement>(null);
  const chapterRef = useRef(clampChapter(chapter));
  const navigateRef = useRef(onNavigate);
  const disabledRef = useRef(disabled);
  const [failed, setFailed] = useState(false);
  const [travelling, setTravelling] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    chapterRef.current = clampChapter(chapter);
    navigateRef.current = onNavigate;
    disabledRef.current = disabled;
  }, [chapter, onNavigate, disabled]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const textures = new Set<THREE.Texture>();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#03060d");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = motion.matches;
    queueMicrotask(() => {
      if (!disposed) setReducedMotion(reduce);
    });
    const motionChange = () => {
      reduce = motion.matches;
      setReducedMotion(reduce);
    };
    motion.addEventListener("change", motionChange);
    const pointer = new THREE.Vector2();
    const pointerMove = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2,
        ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2,
      );
    };
    const pointerLeave = () => pointer.set(0, 0);
    element.addEventListener("pointermove", pointerMove);
    element.addEventListener("pointerleave", pointerLeave);
    const disposeScene = () => {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material)
          (Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          ).forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    };
    const loseContext = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      if (!disposed) setFailed(true);
    };
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.cssText =
        "display:block;width:100%;height:100%;touch-action:pan-y";
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.addEventListener("webglcontextlost", loseContext);
      element.insertBefore(renderer.domElement, element.firstChild);
      const camera = new THREE.PerspectiveCamera(47, 16 / 9, 0.06, 1500);
      const groups = Array.from({ length: 9 }, () => {
        const group = new THREE.Group();
        scene.add(group);
        return group;
      });
      const origins = [new THREE.Vector3()];
      for (let i = 0; i < 8; i++)
        origins.push(
          origins[i]
            .clone()
            .add(
              new THREE.Vector3(...OFFSETS[i]).multiplyScalar(
                Math.pow(SCALE_RATIO, -i),
              ),
            ),
        );
      scene.add(new THREE.AmbientLight(0x89a8d2, 0.7));
      const sunlight = new THREE.DirectionalLight(0xffe5c7, 3.2);
      sunlight.position.set(18, 12, 26);
      scene.add(sunlight);
      let seed = 18421;
      const random = () => {
        seed = (1664525 * seed + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const ranged = (span: number) => (random() - 0.5) * span;
      const colors = [
        new THREE.Color("#a2bddb"),
        new THREE.Color("#f0d1a0"),
        new THREE.Color("#c7d5e8"),
        new THREE.Color("#658fad"),
      ];

      function points(
        parent: THREE.Object3D,
        positions: number[],
        pointColors: number[],
        sizes: number[],
        opacity = 1,
      ) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(pointColors, 3),
        );
        geometry.setAttribute(
          "size",
          new THREE.Float32BufferAttribute(sizes, 1),
        );
        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            opacity: { value: opacity },
            pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.65) },
          },
          vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float pixelRatio;
            void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);float scale=length(modelMatrix[0].xyz);gl_PointSize=clamp(size*pixelRatio*scale*30./max(1.,-p.z),1.,12.);gl_Position=projectionMatrix*p;}`,
          fragmentShader: `varying vec3 vColor;uniform float opacity;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=exp(-d*d*5.)*(1.-smoothstep(.65,1.,d));gl_FragColor=vec4(vColor,a*opacity);}`,
        });
        const cloud = new THREE.Points(geometry, material);
        parent.add(cloud);
        return cloud;
      }
      function randomStars(
        parent: THREE.Object3D,
        count: number,
        radius: number,
        size = 2.1,
      ) {
        const positions: number[] = [],
          tint: number[] = [],
          sizes: number[] = [];
        for (let i = 0; i < count; i++) {
          const theta = random() * Math.PI * 2,
            cosine = ranged(2),
            r = radius * Math.cbrt(random());
          const sine = Math.sqrt(1 - cosine * cosine);
          positions.push(
            r * sine * Math.cos(theta),
            r * cosine,
            r * sine * Math.sin(theta),
          );
          const color = colors[Math.floor(random() * colors.length)];
          tint.push(color.r, color.g, color.b);
          sizes.push(size * (0.35 + random()));
        }
        return points(parent, positions, tint, sizes);
      }
      function shell(
        parent: THREE.Object3D,
        radius: number,
        color: string,
        opacity: number,
      ) {
        const material = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.FrontSide,
          uniforms: {
            tint: { value: new THREE.Color(color) },
            strength: { value: opacity },
          },
          vertexShader: `varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
          fragmentShader: `varying vec3 n;varying vec3 v;uniform vec3 tint;uniform float strength;void main(){float rim=pow(1.-max(0.,dot(normalize(n),normalize(v))),3.5);gl_FragColor=vec4(tint,rim*strength);}`,
        });
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 48, 32),
          material,
        );
        parent.add(mesh);
        return mesh;
      }
      function sphere(
        parent: THREE.Object3D,
        radius: number,
        color: number,
        position: [number, number, number],
        emissive = false,
      ) {
        const material = emissive
          ? new THREE.MeshBasicMaterial({ color })
          : new THREE.MeshStandardMaterial({
              color,
              roughness: 0.95,
              metalness: 0,
            });
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 40, 28),
          material,
        );
        mesh.position.set(...position);
        parent.add(mesh);
        return mesh;
      }
      function pathLine(
        parent: THREE.Object3D,
        vertices: THREE.Vector3[],
        color: number,
        opacity = 0.25,
      ) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(vertices),
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false,
          }),
        );
        parent.add(line);
        return line;
      }
      function galaxy(parent: THREE.Object3D, count: number, radius: number) {
        const positions: number[] = [],
          tint: number[] = [],
          sizes: number[] = [];
        for (let i = 0; i < count; i++) {
          const r = radius * Math.pow(random(), 0.7),
            arm = ((i % 4) * Math.PI) / 2;
          const theta = arm + r * 0.43 + ranged(0.7) * (0.15 + r / radius);
          positions.push(
            Math.cos(theta) * r + ranged(0.5),
            Math.sin(theta) * r + ranged(0.5),
            ranged(0.5) * (1 - r / radius) + ranged(0.12),
          );
          const color = new THREE.Color().lerpColors(
            new THREE.Color("#ecd4ac"),
            new THREE.Color("#7f9abb"),
            Math.min(1, (r / radius) * 1.4),
          );
          tint.push(color.r, color.g, color.b);
          sizes.push(0.8 + random() * 2.3);
        }
        for (let i = 0; i < count / 8; i++) {
          const theta = random() * Math.PI * 2,
            r = Math.pow(random(), 1.8) * radius * 0.18;
          positions.push(
            Math.cos(theta) * r,
            Math.sin(theta) * r,
            ranged(radius * 0.035),
          );
          tint.push(0.91, 0.79, 0.61);
          sizes.push(1 + random() * 2);
        }
        return points(parent, positions, tint, sizes, 0.85);
      }
      function cosmicWeb(
        parent: THREE.Object3D,
        nodeCount: number,
        radius: number,
      ) {
        const nodes = Array.from(
          { length: nodeCount },
          () =>
            new THREE.Vector3(
              ranged(radius * 2),
              ranged(radius * 1.25),
              ranged(radius * 1.5),
            ),
        );
        const positions: number[] = [],
          tint: number[] = [],
          sizes: number[] = [];
        for (let i = 0; i < nodes.length; i++) {
          const nearest = nodes
            .map((node, index) => ({
              node,
              index,
              distance: node.distanceTo(nodes[i]),
            }))
            .filter((item) => item.index > i)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);
          for (const neighbor of nearest) {
            const midpoint = nodes[i]
              .clone()
              .lerp(neighbor.node, 0.5)
              .add(new THREE.Vector3(ranged(2), ranged(2), ranged(2)));
            const curve = new THREE.CatmullRomCurve3([
              nodes[i],
              midpoint,
              neighbor.node,
            ]);
            pathLine(parent, curve.getPoints(18), 0x577b9d, 0.16);
            for (let k = 0; k < 34; k++) {
              const p = curve.getPoint(random());
              positions.push(
                p.x + ranged(0.4),
                p.y + ranged(0.4),
                p.z + ranged(0.4),
              );
              tint.push(0.37, 0.51, 0.68);
              sizes.push(0.65 + random() * 1.3);
            }
          }
          for (let k = 0; k < 15; k++) {
            positions.push(
              nodes[i].x + ranged(0.7),
              nodes[i].y + ranged(0.7),
              nodes[i].z + ranged(0.7),
            );
            tint.push(0.79, 0.7, 0.58);
            sizes.push(1.2 + random() * 2);
          }
        }
        points(parent, positions, tint, sizes, 0.8);
      }
      // 0. A speculative multiverse: translucent volumes, each containing its own stars.
      shell(groups[0], 11.2, "#8bb5d3", 0.52);
      randomStars(groups[0], 1000, 10.5, 1.3);
      for (let i = 0; i < 7; i++) {
        const bubble = new THREE.Group();
        bubble.position.set(
          Math.cos(i * 2.4) * (18 + i * 2),
          Math.sin(i * 2.4) * (10 + i),
          -8 - random() * 35,
        );
        groups[0].add(bubble);
        const radius = 4.5 + random() * 4;
        shell(bubble, radius, i % 2 ? "#b59b77" : "#6b8da7", 0.4);
        randomStars(bubble, 210, radius * 0.94, 1.2);
      }
      // 1–2. Enter the central universe and move through its large-scale structure.
      cosmicWeb(groups[1], 42, 18);
      randomStars(groups[1], 1200, 26, 1.2);
      cosmicWeb(groups[2], 60, 17);
      for (let i = 0; i < 11; i++) {
        const cluster = new THREE.Group();
        cluster.position.set(ranged(33), ranged(21), ranged(24));
        cluster.rotation.set(random(), random(), random() * Math.PI);
        cluster.scale.setScalar(0.05 + random() * 0.055);
        groups[2].add(cluster);
        galaxy(cluster, 350, 12);
      }
      // 3. A volumetric four-arm Milky Way, viewed obliquely.
      const spiral = new THREE.Group();
      spiral.rotation.set(0.5, -0.15, -0.25);
      groups[3].add(spiral);
      galaxy(spiral, 12500, 17);
      randomStars(groups[3], 900, 26, 0.9);
      // 4. The solar neighborhood. Orbital distances are compressed for this cinematic journey.
      const sun = sphere(groups[4], 2.9, 0xf3bd71, [-12, 0, 0], true);
      shell(sun, 3.15, "#e2a35b", 0.65);
      shell(sun, 3.8, "#a77547", 0.16);
      const planetData: [number, number, number, number][] = [
        [4, 0.35, 0x897563, 1.1],
        [7, 0.65, 0xc9b496, 2.2],
        [13, 0.48, 0xa66d4f, 4.0],
        [19, 1.55, 0xb99878, 2.9],
        [25, 1.2, 0xbbae8b, 4.6],
      ];
      for (const [radius, size, color, angle] of planetData) {
        const orbit = Array.from({ length: 129 }, (_, i) => {
          const a = (i / 128) * Math.PI * 2;
          return new THREE.Vector3(
            -12 + Math.cos(a) * radius,
            Math.sin(a) * radius * 0.4,
            Math.sin(a) * radius * 0.12,
          );
        });
        pathLine(groups[4], orbit, 0x718092, 0.19);
        const planet = sphere(groups[4], size, color, [
          -12 + Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.4,
          Math.sin(angle) * radius * 0.12,
        ]);
        if (radius === 25) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(size * 1.35, size * 2.1, 64),
            new THREE.MeshBasicMaterial({
              color: 0xa99d80,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.55,
            }),
          );
          ring.rotation.x = 0.55;
          planet.add(ring);
        }
      }
      randomStars(groups[4], 650, 50, 0.8);
      // 5. A sphere mapped with the NASA equirectangular map, never with the Apollo disk photo.
      const earthMaterial = new THREE.MeshStandardMaterial({
        color: 0x829cb6,
        roughness: 0.95,
        metalness: 0,
      });
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(8, 96, 64),
        earthMaterial,
      );
      // Aim San Francisco approximately toward the camera. This is an editorial approach.
      earth.rotation.set(
        THREE.MathUtils.degToRad(37.77),
        THREE.MathUtils.degToRad(32.42),
        0,
      );
      groups[5].add(earth);
      shell(groups[5], 8.16, "#769cc1", 0.65);
      const loader = new THREE.TextureLoader();
      loader.load(
        EARTH_TEXTURE,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          textures.add(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(
            8,
            renderer?.capabilities.getMaxAnisotropy() || 1,
          );
          earthMaterial.map = texture;
          earthMaterial.color.set(0xffffff);
          earthMaterial.needsUpdate = true;
        },
        undefined,
        () => {
          /* The lit globe remains navigable if the texture is unavailable. */
        },
      );
      const earthStars = randomStars(groups[5], 800, 65, 0.8);
      earthStars.position.z = -15;
      // 6. Aerial terrain with actual depth: source imagery on the ground, a restrained city above.
      const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x27333c,
        roughness: 1,
        metalness: 0,
      });
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(28, 21),
        groundMaterial,
      );
      ground.position.z = -0.2;
      groups[6].add(ground);
      loader.load(
        SAN_FRANCISCO_TEXTURE,
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          textures.add(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          groundMaterial.map = texture;
          groundMaterial.color.set(0x85929e);
          groundMaterial.needsUpdate = true;
        },
        undefined,
        () => {},
      );
      // 7–8. Architectural theater space, rows of seats, and the shared screen.
      function box(
        parent: THREE.Object3D,
        size: [number, number, number],
        position: [number, number, number],
        color: number,
      ) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(...size),
          new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
        );
        mesh.position.set(...position);
        parent.add(mesh);
        return mesh;
      }
      box(groups[7], [25, 0.4, 29], [0, -5, 4], 0x101620);
      box(groups[7], [0.4, 14, 28], [-12.5, 1.5, 4], 0x182132);
      box(groups[7], [0.4, 14, 28], [12.5, 1.5, 4], 0x182132);
      box(groups[7], [25, 14, 0.5], [0, 1.5, -8], 0x101824);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(17, 8.6),
        new THREE.MeshBasicMaterial({ color: 0x93a4bb }),
      );
      screen.position.set(0, 1, -7.65);
      groups[7].add(screen);
      loader.load(
        "/images/the-last-train.png",
        (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          textures.add(texture);
          texture.colorSpace = THREE.SRGBColorSpace;
          (screen.material as THREE.MeshBasicMaterial).map = texture;
          (screen.material as THREE.MeshBasicMaterial).color.set(0xffffff);
          (screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
        },
        undefined,
        () => {},
      );
      const screenLight = new THREE.PointLight(0xb8c9e4, 30, 30, 2);
      screenLight.position.set(0, 1, -5);
      groups[7].add(screenLight);
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 12; col++) {
          const x = (col - 5.5) * 1.55 + (col < 6 ? -0.55 : 0.55);
          const z = -1 + row * 2.2;
          if ((row + col) % 5 !== 0) {
            const head = new THREE.Mesh(
              new THREE.SphereGeometry(0.31, 10, 8),
              new THREE.MeshStandardMaterial({
                color: 0x131b26,
                roughness: 0.95,
              }),
            );
            head.position.set(x, -2.02 + row * 0.13, z - 0.05);
            groups[7].add(head);
            box(
              groups[7],
              [0.78, 0.88, 0.48],
              [x, -2.7 + row * 0.13, z - 0.12],
              0x111a27,
            );
          }

          box(groups[7], [1.1, 1.3, 0.4], [x, -3.1 + row * 0.13, z], 0x37272b);
          box(
            groups[7],
            [1.1, 0.22, 0.85],
            [x, -3.7 + row * 0.13, z - 0.25],
            0x433034,
          );
        }
      for (const x of [-11.9, 11.9])
        for (let i = 0; i < 6; i++) {
          const light = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.07, 1.4),
            new THREE.MeshBasicMaterial({ color: 0xc89b67 }),
          );
          light.position.set(x, -4.6, -2 + i * 3);
          groups[7].add(light);
        }
      const finalScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(26, 14.625),
        new THREE.MeshBasicMaterial({ color: 0x111b2a }),
      );
      finalScreen.position.z = -4;
      groups[8].add(finalScreen);
      // A persistent deep star field provides parallax throughout every scale change.
      const background = new THREE.Group();
      scene.add(background);
      randomStars(background, 1800, 330, 1.5);
      const marker = new THREE.Group();
      scene.add(marker);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xeac18c,
        transparent: true,
        opacity: 0.65,
        depthTest: false,
        depthWrite: false,
      });
      const markerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.53, 0.555, 64),
        markerMaterial,
      );
      marker.add(markerRing);
      marker.renderOrder = 20;
      const resize = () => {
        if (!renderer || disposed) return;
        const width = Math.max(1, element.clientWidth),
          height = Math.max(1, element.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(element);
      resize();
      let current = chapterRef.current;
      let start = current;
      let destination = current;
      let startedAt = performance.now();
      let previousTime = startedAt;
      let transition = false;
      const focus = new THREE.Vector3(),
        projected = new THREE.Vector3();
      const render = (now: number) => {
        if (disposed || !renderer) return;
        const dt = Math.min(0.05, (now - previousTime) / 1000);
        previousTime = now;
        if (destination !== chapterRef.current) {
          start = current;
          destination = chapterRef.current;
          startedAt = now;
          transition = true;
          setTravelling(true);
        }
        const duration = reduce ? 250 : 4000;
        const progress = Math.min(1, (now - startedAt) / duration);
        current = THREE.MathUtils.lerp(start, destination, ease(progress));
        if (transition && progress === 1) {
          transition = false;
          setTravelling(false);
        }
        const lower = Math.min(8, Math.floor(current)),
          upper = Math.min(8, lower + 1),
          local = current - lower;
        focus.copy(origins[lower]).lerp(origins[upper], ease(local));
        const zoom = Math.pow(SCALE_RATIO, current);
        for (let i = 0; i < groups.length; i++) {
          groups[i].position.copy(origins[i]).sub(focus).multiplyScalar(zoom);
          groups[i].scale.setScalar(Math.pow(SCALE_RATIO, current - i));
          groups[i].visible =
            i >= Math.floor(current) - 1 &&
            i <= Math.ceil(current) + 1 &&
            (i !== 6 || current > 5.35) &&
            (i !== 7 || current > 6.35) &&
            (i !== 8 || current > 7.45) &&
            (i !== 5 || current < 6.55) &&
            (i !== 6 || current < 6.75);
        }
        // Logarithmic world rebasing is equivalent to moving a camera through nested scales,
        // and keeps floating-point precision stable all the way from universes to a room.
        const drift = reduce ? 0 : Math.sin(now * 0.00008) * 0.28;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          reduce ? 0 : pointer.x * 0.7 + drift,
          2,
          dt,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          current > 5.6 && current < 6.8 ? 3.5 : reduce ? 0 : -pointer.y * 0.45,
          2,
          dt,
        );
        camera.position.z = CAMERA_DISTANCE;
        camera.lookAt(0, 0, 0);
        background.rotation.y = reduce ? 0 : now * 0.000004;
        if (destination < 8) {
          const nextOrigin = origins[Math.min(8, destination + 1)];
          marker.position.copy(nextOrigin).sub(focus).multiplyScalar(zoom);
          marker.quaternion.copy(camera.quaternion);
          marker.scale.setScalar(
            Math.max(0.8, camera.position.distanceTo(marker.position) / 34),
          );
          marker.visible = !transition;
          markerMaterial.opacity = reduce
            ? 0.65
            : 0.52 + Math.sin(now * 0.0015) * 0.12;
          projected.copy(marker.position).project(camera);
          const button = target.current;
          if (button) {
            const visible =
              !transition && projected.z >= -1 && projected.z <= 1;
            button.style.left = `${Math.max(15, Math.min(85, (projected.x * 0.5 + 0.5) * 100))}%`;
            button.style.top = `${Math.max(18, Math.min(68, (-projected.y * 0.5 + 0.5) * 100))}%`;
            button.style.opacity = visible ? "1" : "0";
            button.style.pointerEvents =
              visible && !disabledRef.current ? "auto" : "none";
          }
        } else marker.visible = false;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(render);
      };
      frame = requestAnimationFrame(render);
    } catch {
      queueMicrotask(() => {
        if (!disposed) setFailed(true);
      });
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      motion.removeEventListener("change", motionChange);
      element.removeEventListener("pointermove", pointerMove);
      element.removeEventListener("pointerleave", pointerLeave);
      renderer?.domElement.removeEventListener("webglcontextlost", loseContext);
      disposeScene();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, []);

  const active = clampChapter(chapter);
  const next = () => {
    if (!disabledRef.current && !travelling && active < 8)
      navigateRef.current(active + 1);
  };
  return (
    <div
      ref={host}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#03060d",
        isolation: "isolate",
        zIndex: 1,
      }}
      aria-label="Interactive cinematic journey from imagined universes to a theater"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 1,
          background:
            "linear-gradient(180deg,rgba(3,6,13,.12),transparent 22%,transparent 65%,rgba(3,6,13,.7)),radial-gradient(ellipse at center,transparent 40%,rgba(3,6,13,.5))",
        }}
      />
      {failed && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeContent: "center",
            color: "#afbac8",
            textAlign: "center",
            padding: 24,
          }}
        >
          <p style={{ marginBottom: 100 }}>
            The 3D journey is unavailable on this device.
            <br />
            You can still enter the live film.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => navigateRef.current(8)}
            style={{
              color: "#eac18c",
              border: "1px solid #76644d",
              padding: "14px 24px",
              borderRadius: 40,
              background: "#111b2a",
            }}
          >
            Enter the theater
          </button>
        </div>
      )}
      {!failed && active < 8 && (
        <button
          ref={target}
          type="button"
          disabled={disabled || travelling}
          onClick={next}
          aria-label={LABELS[active]}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-22px)",
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            gap: 10,
            width: "min(290px,70%)",
            padding: "5px 10px 12px",
            border: 0,
            outlineOffset: 8,
            color: "#f4f3ee",
            background: "transparent",
            cursor: disabled || travelling ? "default" : "pointer",
            zIndex: 3,
            transition: reducedMotion ? "none" : "opacity .2s",
            opacity: travelling ? 0 : 1,
            textShadow: "0 2px 12px #03060d,0 1px 4px #03060d",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "grid",
              placeItems: "center",
              width: 46,
              height: 46,
              border: "1px solid rgba(234,193,140,.7)",
              borderRadius: "50%",
              color: "#eac18c",
              background: "rgba(8,11,18,.18)",
              boxShadow: "0 0 28px rgba(234,193,140,.12)",
              fontSize: 23,
            }}
          >
            +
          </span>
          <span
            style={{
              fontSize: "clamp(13px,1.2vw,17px)",
              fontWeight: 500,
              letterSpacing: ".035em",
            }}
          >
            {LABELS[active]}
          </span>
          <span style={{ fontSize: 11, color: "#bac5d1", fontWeight: 400 }}>
            {DETAILS[active]}
          </span>
        </button>
      )}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        {travelling
          ? "Traveling to the next destination"
          : active < 8
            ? LABELS[active]
            : "The live film is ready"}
      </span>
    </div>
  );
}
