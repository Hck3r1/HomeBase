export type ParticleShapeType = 'house' | 'shield' | 'lock';

interface Point {
  x: number;
  y: number;
}

function sampleEdges(edges: number[][], count: number): Point[] {
  const lens = edges.map((e) => Math.hypot(e[2] - e[0], e[3] - e[1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const pts: Point[] = [];

  for (let i = 0; i < count; i++) {
    let t = (i / count) * total;
    let ei = 0;
    while (t > lens[ei] && ei < edges.length - 1) {
      t -= lens[ei];
      ei++;
    }
    const [x1, y1, x2, y2] = edges[ei];
    const f = lens[ei] ? t / lens[ei] : 0;
    pts.push({ x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f });
  }

  return pts;
}

export function buildShapePoints(type: ParticleShapeType, w: number, h: number, count: number): Point[] {
  const pts: Point[] = [];
  const cx = w / 2;
  const cy = h * 0.4;

  if (type === 'house') {
    const scale = w * 0.4;
    const baseY = cy + scale * 0.52;
    const wallTopY = cy - scale * 0.05;
    const roofPeakY = cy - scale * 0.62;
    const leftX = cx - scale * 0.5;
    const rightX = cx + scale * 0.5;
    const roofLeftX = cx - scale * 0.62;
    const roofRightX = cx + scale * 0.62;
    const doorW = scale * 0.22;
    const doorH = scale * 0.42;
    const doorLX = cx - doorW / 2;
    const doorRX = cx + doorW / 2;
    const doorTopY = baseY - doorH;

    return sampleEdges(
      [
        [leftX, wallTopY, leftX, baseY],
        [leftX, baseY, doorLX, baseY],
        [doorLX, baseY, doorLX, doorTopY],
        [doorLX, doorTopY, doorRX, doorTopY],
        [doorRX, doorTopY, doorRX, baseY],
        [doorRX, baseY, rightX, baseY],
        [rightX, baseY, rightX, wallTopY],
        [roofLeftX, wallTopY, cx, roofPeakY],
        [cx, roofPeakY, roofRightX, wallTopY],
        [roofLeftX, wallTopY, roofRightX, wallTopY],
      ],
      count,
    );
  }

  if (type === 'shield') {
    const scale = w * 0.36;
    const top = cy - scale * 0.62;
    const bottom = cy + scale * 0.62;
    const leftX = cx - scale * 0.5;
    const rightX = cx + scale * 0.5;
    const midY = cy + scale * 0.08;

    const shieldEdges = [
      [leftX, top, rightX, top],
      [rightX, top, rightX, midY],
      [rightX, midY, cx, bottom],
      [cx, bottom, leftX, midY],
      [leftX, midY, leftX, top],
    ];
    const checkEdges = [
      [cx - scale * 0.26, cy, cx - scale * 0.06, cy + scale * 0.22],
      [cx - scale * 0.06, cy + scale * 0.22, cx + scale * 0.3, cy - scale * 0.18],
    ];

    const shieldLens = shieldEdges.map((e) => Math.hypot(e[2] - e[0], e[3] - e[1]));
    const shieldTotal = shieldLens.reduce((a, b) => a + b, 0);
    const checkLens = checkEdges.map((e) => Math.hypot(e[2] - e[0], e[3] - e[1]));
    const checkTotal = checkLens.reduce((a, b) => a + b, 0);
    const checkCount = Math.floor(count * 0.28);
    const shieldCount = count - checkCount;

    for (let i = 0; i < shieldCount; i++) {
      let t = (i / shieldCount) * shieldTotal;
      let ei = 0;
      while (t > shieldLens[ei] && ei < shieldEdges.length - 1) {
        t -= shieldLens[ei];
        ei++;
      }
      const [x1, y1, x2, y2] = shieldEdges[ei];
      const f = shieldLens[ei] ? t / shieldLens[ei] : 0;
      pts.push({ x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f });
    }
    for (let i = 0; i < checkCount; i++) {
      let t = (i / checkCount) * checkTotal;
      let ei = 0;
      while (t > checkLens[ei] && ei < checkEdges.length - 1) {
        t -= checkLens[ei];
        ei++;
      }
      const [x1, y1, x2, y2] = checkEdges[ei];
      const f = checkLens[ei] ? t / checkLens[ei] : 0;
      pts.push({ x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f });
    }
    return pts;
  }

  const scale = w * 0.3;
  const bodyTop = cy - scale * 0.05;
  const bodyW = scale * 0.95;
  const bodyH = scale * 0.95;
  const edges = [
    [cx - bodyW / 2, bodyTop, cx + bodyW / 2, bodyTop],
    [cx + bodyW / 2, bodyTop, cx + bodyW / 2, bodyTop + bodyH],
    [cx + bodyW / 2, bodyTop + bodyH, cx - bodyW / 2, bodyTop + bodyH],
    [cx - bodyW / 2, bodyTop + bodyH, cx - bodyW / 2, bodyTop],
  ];
  const lens = edges.map((e) => Math.hypot(e[2] - e[0], e[3] - e[1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const bodyCount = Math.floor(count * 0.62);

  for (let i = 0; i < bodyCount; i++) {
    let t = (i / bodyCount) * total;
    let ei = 0;
    while (t > lens[ei] && ei < edges.length - 1) {
      t -= lens[ei];
      ei++;
    }
    const [x1, y1, x2, y2] = edges[ei];
    const f = lens[ei] ? t / lens[ei] : 0;
    pts.push({ x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f });
  }

  const shackleCount = count - bodyCount;
  const shackleR = bodyW * 0.38;
  const shackleCy = bodyTop - shackleR * 0.15;
  for (let i = 0; i < shackleCount; i++) {
    const a = Math.PI + (i / shackleCount) * Math.PI;
    pts.push({ x: cx + Math.cos(a) * shackleR, y: shackleCy + Math.sin(a) * shackleR });
  }

  return pts;
}
