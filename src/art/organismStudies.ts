/** Original editable Canvas2D field art. Exact taxa only; no category substitution.
 * Institutional morphology references and artistic limitations: art_source/field-studies/PROVENANCE.json.
 * These are authored render candidates, not human-approved specimens or 3D models.
 */
export const AUTHORED_STUDY_TAXA = ['balaenoptera_musculus', 'panthera_leo', 'loxodonta_africana', 'danaus_plexippus'] as const;
export type StudyTaxon = typeof AUTHORED_STUDY_TAXA[number];
export type StudyFrame = { time: number; facing: 1 | -1; reducedMotion: boolean; scale?: number };
export type StudyPose = { limb: number; secondary: number; wingSpan: number; breath: number };

export function hasAuthoredStudy(taxonId: string): taxonId is StudyTaxon {
  return (AUTHORED_STUDY_TAXA as readonly string[]).includes(taxonId);
}

/** Local drawing envelope including a small inspection margin, in canvas pixels. */
export function authoredStudyHalfWidth(taxonId: string): number | undefined {
  if (!hasAuthoredStudy(taxonId)) return undefined;
  return { balaenoptera_musculus: 150, panthera_leo: 140, loxodonta_africana: 145, danaus_plexippus: 80 }[taxonId];
}

/** One supplied observation clock drives articulation; no timers or randomness. */
export function studyPose(taxon: StudyTaxon, time: number, reducedMotion: boolean): StudyPose {
  const t = Number.isFinite(time) ? time : 0;
  if (reducedMotion) return { limb: 0, secondary: 0, wingSpan: .96, breath: 0 };
  switch (taxon) {
    case 'balaenoptera_musculus': return { limb: Math.sin(t * 2.1) * .065, secondary: Math.sin(t * 2.1 - .6) * .035, wingSpan: .96, breath: Math.sin(t * .8) * .5 };
    case 'panthera_leo': return { limb: Math.sin(t * 3.1) * .17, secondary: Math.sin(t * 3.1 + Math.PI) * .14, wingSpan: .96, breath: Math.sin(t * 1.4) * .7 };
    case 'loxodonta_africana': return { limb: Math.sin(t * 1.8) * .09, secondary: Math.sin(t * 1.3) * .045, wingSpan: .96, breath: Math.sin(t * 1.1) * .8 };
    case 'danaus_plexippus': return { limb: Math.sin(t * 10) * .06, secondary: Math.sin(t * 10 + .5) * .025, wingSpan: .68 + Math.sin(t * 10) * .27, breath: 0 };
  }
}

const paths = new Map<string, Path2D>();
function path(d: string): Path2D {
  let p = paths.get(d);
  if (!p) { p = new Path2D(d); paths.set(d, p); }
  return p;
}
function shape(ctx: CanvasRenderingContext2D, d: string, fill: string | CanvasGradient, stroke?: string, width = 1) {
  ctx.fillStyle = fill; ctx.fill(path(d));
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(path(d)); }
}
function line(ctx: CanvasRenderingContext2D, d: string, color: string, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path(d));
}
function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, rotation = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fill();
}
function gradient(ctx: CanvasRenderingContext2D, x: number, y: number, x2: number, y2: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x, y, x2, y2); stops.forEach(([offset, color]) => g.addColorStop(offset, color)); return g;
}

function blueWhale(ctx: CanvasRenderingContext2D, pose: StudyPose) {
  // Derived from this project's original editable blue-whale field plate, not a source photograph.
  // Native outline faces left; mirror once so positive observation travel faces right.
  ctx.scale(-.27, .27); ctx.translate(-600, -277);
  const skin = gradient(ctx, 0, 210, 0, 325, [[0, '#739ba5'], [.45, '#547d8d'], [.82, '#9ab6b8'], [1, '#d3ddd3']]);
  ctx.save(); ctx.translate(1000, 289); ctx.rotate(pose.limb);
  shape(ctx, 'M-25-8C8-13 48-37 86-38C70-20 55-5 38 5C67 3 98 6 125 19C72 22 29 18 4 7L-26 16Z', gradient(ctx, 0, -40, 30, 20, [[0, '#86a7ae'], [1, '#355667']]), '#324f61', 1.6);
  line(ctx, 'M8-3Q43-18 80-34M18 9Q63 9 111 17', '#9fb9bd88', 2); ctx.restore();
  ctx.save(); ctx.translate(413, 294); ctx.rotate(pose.secondary);
  shape(ctx, 'M0 0C35 5 56 28 74 55C36 42 10 25 0 0Z', '#345566', '#284857', 1.5); ctx.restore();
  const body = 'M110 263C118 242 177 225 270 217C390 206 529 215 672 239C731 249 782 258 816 264C827 266 835 250 844 245C843 255 846 263 850 269C900 279 956 287 1000 282L1004 296C935 317 858 322 769 321C662 322 565 324 466 325C361 326 282 323 212 306C165 294 125 278 110 263Z';
  shape(ctx, body, skin, '#3e6270', 1.5);
  ctx.save(); ctx.clip(path(body));
  const mottles: [number, number, number, number, number][] = [[263,237,29,10,.2],[326,246,36,13,-.3],[402,236,27,8,.2],[458,259,32,12,-.1],[530,253,33,11,.25],[588,274,24,9,-.2],[659,270,31,10,.2],[731,284,30,9,-.1],[790,293,25,8,.15],[847,289,27,8,-.1],[370,279,25,8,.1],[503,289,31,11,-.2],[620,304,30,7,.1],[260,269,25,8,-.2],[180,253,19,7,.2],[900,299,22,6,.1]];
  for (const [x, y, rx, ry, angle] of mottles) oval(ctx, x, y, rx, ry, '#afc8c22b', angle);
  for (const [x, y, rx, ry, angle] of [[315,294,32,9,.1],[565,286,23,8,-.2],[684,303,20,6,.1],[804,279,19,6,.2]]) oval(ctx, x, y, rx, ry, '#31586b22', angle);
  shape(ctx, 'M112 266C228 292 449 308 650 305L641 327H240Z', '#d6e0d036');
  for (const d of ['M135 271Q318 303 578 307','M153 278Q335 311 583 312','M174 285Q348 318 579 316','M197 292Q352 322 552 319','M220 298Q374 326 519 322']) line(ctx, d, '#557a82a0', 1.8);
  line(ctx, 'M132 258Q177 241 251 235M288 220Q442 215 607 240', '#c0d5cf88', 2);
  ctx.restore();
  line(ctx, 'M120 264C189 260 257 256 324 265', '#2c4e60', 2.3);
  line(ctx, 'M311 265Q323 262 331 270', '#2d4c5a', 2);
  oval(ctx, 306, 255, 5.5, 3, '#213e4d'); oval(ctx, 307, 254.4, 1.5, 1.2, '#dce9e1');
  line(ctx, 'M265 226Q278 222 290 225', '#365867', 2.2);
  ctx.save(); ctx.translate(396, 296); ctx.rotate(-pose.secondary);
  shape(ctx, 'M0-5C26 5 59 42 112 79C68 73 14 44 0-5Z', gradient(ctx, 0, 0, 100, 80, [[0, '#7e9da5'], [1, '#304e61']]), '#2b4b5d', 1.8);
  line(ctx, 'M12 8Q45 45 94 69', '#adc3c45e', 1.7); ctx.restore();
}

function lionLeg(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, far: boolean) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  shape(ctx, 'M-9-4C-10 12-5 25-3 37L-7 45Q-8 50 1 50L15 49Q18 44 8 42L7 19L10-3Z', far ? '#8d653e' : gradient(ctx, -8, 0, 12, 50, [[0, '#c7995e'], [1, '#e3bc7c']]), '#715337', .7);
  line(ctx, 'M4 44L5 48M9 44L10 48', far ? '#6a5137' : '#a88153', .8); ctx.restore();
}
function lion(ctx: CanvasRenderingContext2D, pose: StudyPose) {
  ctx.translate(-10, -10 + pose.breath);
  // An adult male study: mane presence is a declared sex/age interpretation.
  ctx.save(); ctx.translate(-78, -5); ctx.rotate(pose.secondary * .6);
  line(ctx, 'M0 0C-38-3-51-27-39-44Q-29-57-17-48', '#aa7c48', 5);
  shape(ctx, 'M-21-52Q-8-54-9-44Q-13-39-22-43Z', '#4e3826'); ctx.restore();
  lionLeg(ctx, -50, 15, pose.secondary, true); lionLeg(ctx, 42, 11, pose.limb, true);
  shape(ctx, 'M-82-9C-76-25-46-30-18-23C8-24 33-33 55-24C68-16 68 5 52 17L35 21C3 20-19 28-51 24Q-82 22-82-9Z', gradient(ctx, 0, -30, 0, 29, [[0, '#ddba7b'], [.5, '#bd8b4f'], [1, '#e5c48d']]), '#a47a46', 1.2);
  shape(ctx, 'M-68 6Q-26 18 29 10L30 22Q-32 34-64 19Z', '#f0d5a13b');
  line(ctx, 'M-71-11Q-51-24-28-20M-34 3Q-13 10 5 6', '#98704055', 1.2);
  lionLeg(ctx, -64, 15, pose.limb, false); lionLeg(ctx, 37, 11, pose.secondary, false);
  shape(ctx, 'M39-45L47-53L57-51Q72-64 89-51L101-49L106-39L112-31L107-18L111-8L102 2L100 12L85 17L75 24L62 17L51 20L45 8L36 1L39-13L31-22L38-32Z', gradient(ctx, 35, -50, 105, 22, [[0, '#896038'], [.5, '#5c4029'], [1, '#382e24']]), '#493721', 1.2);
  shape(ctx, 'M51-40Q71-56 90-45L99-31L91-7L77 11Q56 9 47-12Z', '#a16d37');
  for (const d of ['M44-29L53-21L47-9','M50-42L63-33','M64-50L68-38','M86-48L81-36','M48 3L62 8L66 15','M91 4L87 13','M36-20L44-15']) line(ctx, d, '#c38b4777', 1.3);
  oval(ctx, 84, -44, 9, 9, '#bc8e52'); oval(ctx, 84, -45, 4.5, 5, '#58402b');
  shape(ctx, 'M70-36C78-45 97-42 104-31L108-22L121-18L121-9Q107 1 91-5L83-15Q71-20 70-36Z', gradient(ctx, 85, -42, 110, 0, [[0, '#e3bc78'], [1, '#c29355']]), '#98703f', .8);
  shape(ctx, 'M98-17Q111-24 122-17L124-10Q112-3 100-8L93-11Z', '#ecdbc0');
  shape(ctx, 'M116-18L125-17L123-12L117-12Z', '#3c3027');
  line(ctx, 'M120-12L120-7Q115-4 108-7', '#624b35', .8);
  line(ctx, 'M94-30Q99-33 103-30', '#352e26', 1.5); oval(ctx, 100, -30, 1.8, 1.6, '#9d9b55');
  for (const d of ['M108-12L130-14','M108-9L132-7','M106-6L126 0']) line(ctx, d, '#e4d5b699', .7);
}

function elephantLeg(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, far: boolean) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  shape(ctx, 'M-15-9Q-18 13-14 46L-17 58Q-15 65 5 63L17 61L14 43L13-11Z', far ? '#52646a' : gradient(ctx, -16, 0, 18, 60, [[0, '#839195'], [1, '#5e727b']]), '#485c65', 1);
  line(ctx, 'M-13 39Q0 43 13 40M-12 44Q0 47 12 45', '#3e576577', 1);
  for (const x2 of [-8, 0, 8]) oval(ctx, x2, 59, 3.2, 3, far ? '#718286' : '#b8b9ab'); ctx.restore();
}
function elephant(ctx: CanvasRenderingContext2D, pose: StudyPose) {
  ctx.scale(.93, .93); ctx.translate(-9, -15 + pose.breath);
  ctx.save(); ctx.translate(-98, -22); ctx.rotate(pose.secondary);
  line(ctx, 'M0 0Q-29 3-27 36', '#526773', 3.2); shape(ctx, 'M-30 32L-22 33L-24 48L-32 47Z', '#344852'); ctx.restore();
  elephantLeg(ctx, -57, 15, -pose.limb, true); elephantLeg(ctx, 43, 13, pose.limb, true);
  shape(ctx, 'M-106-24Q-100-55-72-62Q-38-65-6-52Q28-64 53-54Q79-41 72-3Q57 29 20 31L-62 30Q-103 24-106-24Z', gradient(ctx, -65, -67, 20, 34, [[0, '#a6ada9'], [.38, '#839397'], [.8, '#647d86'], [1, '#a4aca5']]), '#486773', 1.3);
  shape(ctx, 'M-91-28Q-55-48-7-38L47-38Q54-14 23-8L-70-7Z', '#c3c9b414');
  for (const d of ['M-89-25Q-69-35-45-25','M-84-17Q-55-25-30-16','M-78-8Q-49-17-31-8','M-75 1Q-48-5-27 2','M-15-33L-21-13L-16 8','M1-34L-4-10L1 14','M24-29L21-9L26 12']) line(ctx, d, '#405f6c3f', 1);
  elephantLeg(ctx, -78, 18, pose.limb, false); elephantLeg(ctx, 28, 18, -pose.limb, false);
  shape(ctx, 'M55-57Q77-70 96-52L108-26L104 5L78 8L61-11Z', gradient(ctx, 60, -65, 105, 10, [[0, '#a7b0aa'], [1, '#708992']]), '#4a6773', 1);
  ctx.save(); ctx.translate(61, -37); ctx.rotate(pose.secondary);
  shape(ctx, 'M5-16C-14-43-45-41-46-10C-49 14-30 41-7 32Q12 14 5-16Z', gradient(ctx, -40, -35, 8, 31, [[0, '#b0afa1'], [.55, '#7b9094'], [1, '#536f7a']]), '#587480', 1.4);
  for (const d of ['M-3-8L-33-23','M-3-4L-38-8','M-2 0L-33 11','M-3 5L-21 25']) line(ctx, d, '#c3c1ab55', 1); ctx.restore();
  ctx.save(); ctx.translate(100, -25); ctx.rotate(pose.secondary);
  shape(ctx, 'M-6-6C9-8 15 4 16 19L13 49Q12 61 26 53L31 58Q16 75 4 65L-2 50L-4 21L-10 6Z', gradient(ctx, -10, 0, 25, 65, [[0, '#91a39f'], [1, '#5b7b89']]), '#4b6c7c', 1.2);
  for (const d of ['M1 13L13 13','M2 21L13 21','M3 29L12 29','M4 38L11 38','M6 47L12 46']) line(ctx, d, '#3e617474', .9);
  line(ctx, 'M25 54L26 58M29 55L28 59', '#cad0b8', 1.2); ctx.restore();
  shape(ctx, 'M91-11Q115 4 141-3Q124 16 99 4Z', '#e1d9b9', '#b5b9a5', .8);
  shape(ctx, 'M85-4Q105 15 124 10Q110 23 89 8Z', '#f0e6c8', '#a8b5ad', .8);
  line(ctx, 'M83-38Q89-42 94-38', '#344f5d', 1.3); oval(ctx, 90, -38, 2.3, 2.3, '#223e4c'); oval(ctx, 90.7, -38.5, .7, .7, '#e2dfc5');
  line(ctx, 'M72-48Q82-51 90-47M81-30Q86-33 91-30', '#48697866', .9);
}

function monarch(ctx: CanvasRenderingContext2D, pose: StudyPose) {
  ctx.rotate(Math.PI / 2 + pose.limb * .35); ctx.scale(.73, .73);
  const wing = gradient(ctx, 0, -60, 72, 48, [[0, '#f6ba56'], [.5, '#e98231'], [1, '#bb4e21']]);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side * pose.wingSpan, 1);
    shape(ctx, 'M4-22C26-50 68-73 79-58C93-31 72-8 19 10L4 2Z', wing, '#1b2427', 8);
    shape(ctx, 'M6 2C36-11 71 7 66 33C62 58 35 66 9 31Z', wing, '#1b2427', 8);
    shape(ctx, 'M64-60Q77-70 80-57L82-41L70-41L58-47Z', '#22292a');
    for (const d of ['M8-17L61-50','M10-13L76-31','M11-8L65-12','M31-29L36-48','M45-36L46-58','M46-23L63-35','M18 8L46 49','M15 12L28 54','M18 7L61 28','M18 7L54 10','M29 23L50 24']) line(ctx, d, '#27302c', 2.1);
    for (const [x, y, r] of [[71,-58,2.8],[76,-49,2.2],[76,-39,2.2],[72,-27,2.5],[65,-16,2.2],[60,13,2.1],[62,24,2.3],[58,37,2.2],[49,48,2.2],[37,54,2.1],[25,51,1.9]]) oval(ctx, x, y, r, r * .85, '#f8eed6');
    for (const [x, y] of [[66,-53],[71,-44],[58,21],[54,34],[43,47]]) oval(ctx, x, y, 1.1, 1.1, '#eee8d3');
    ctx.restore();
  }
  shape(ctx, 'M-4-24Q-7 0-4 30Q0 42 4 29Q7-1 4-24Z', '#1d2a2d', '#111b20', 1);
  for (const y of [-1, 7, 15, 23]) line(ctx, `M-3 ${y}L3 ${y}`, '#65746b', .9);
  oval(ctx, 0, -28, 6, 7, '#202a2d'); oval(ctx, -2.5, -30, 1, 1, '#f2ead5'); oval(ctx, 2.5, -30, 1, 1, '#f2ead5');
  line(ctx, 'M-3-33Q-17-47-11-51M3-33Q17-47 11-51', '#19292b', 1.4);
  oval(ctx, -11, -51, 1.8, 1.8, '#27322e'); oval(ctx, 11, -51, 1.8, 1.8, '#27322e');
}

/** Returns false before touching the canvas for every unsupported identity.
 * Browsers provide Path2D. jsdom and other hosts without it keep the existing
 * silhouette/icon fallback instead of throwing from the game loop.
 */
export function drawAuthoredOrganism(ctx: CanvasRenderingContext2D, taxonId: string, frame: StudyFrame): boolean {
  if (!hasAuthoredStudy(taxonId) || typeof Path2D !== 'function') return false;
  const pose = studyPose(taxonId, frame.time, frame.reducedMotion);
  ctx.save(); ctx.scale((frame.facing < 0 ? -1 : 1) * (frame.scale ?? 1), frame.scale ?? 1);
  if (taxonId === 'balaenoptera_musculus') blueWhale(ctx, pose);
  else if (taxonId === 'panthera_leo') lion(ctx, pose);
  else if (taxonId === 'loxodonta_africana') elephant(ctx, pose);
  else monarch(ctx, pose);
  ctx.restore(); return true;
}

function acacia(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size);
  shape(ctx, 'M-3 0L0-49L-16-64L-14-68L4-55L21-75L24-72L7-49L5 0Z', color);
  shape(ctx, 'M-50-68Q-44-84-18-82Q-8-96 8-84Q35-94 50-77Q60-69 40-64L-27-63Z', color); ctx.restore();
}
function milkweed(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, lean: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.rotate(lean);
  line(ctx, 'M0 0Q-4-53 0-97', '#34685b', 3);
  for (const [y2, side] of [[-30,-1],[-46,1],[-59,-1],[-72,1]]) {
    ctx.save(); ctx.translate(0, y2); ctx.scale(side, 1);
    shape(ctx, 'M0 0Q17-28 39-17Q30 6 0 0Z', '#50836a', '#396e5c', .7);
    line(ctx, 'M1-1L33-16', '#a9c2a066', .8); ctx.restore();
  }
  for (const [x2,y2] of [[-13,-94],[0,-103],[12,-97],[-6,-87],[9,-85]]) {
    oval(ctx, x2, y2, 7, 5, '#b98a9f'); oval(ctx, x2-1, y2-2, 3, 2, '#ead3c2');
  }
  ctx.restore();
}

/** Original composed habitat studies; no surveyed geographic or abundance claim. */
export function drawAuthoredHabitat(ctx: CanvasRenderingContext2D, taxonId: string, width: number, height: number, time: number, reducedMotion: boolean): boolean {
  if (!hasAuthoredStudy(taxonId) || typeof Path2D !== 'function') return false;
  const t = reducedMotion || !Number.isFinite(time) ? 0 : time;
  ctx.save();
  if (taxonId === 'balaenoptera_musculus') {
    ctx.fillStyle = gradient(ctx, 0, 0, 0, height, [[0, '#437f8b'], [.3, '#1b5268'], [.7, '#12384e'], [1, '#092536']]); ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#b9ded90a';
    for (const [start, end] of [[.12,.37],[.38,.68],[.72,.95]]) {
      ctx.beginPath(); ctx.moveTo(width*start, 0); ctx.lineTo(width*(start+.05), 0); ctx.lineTo(width*end, height*.72); ctx.lineTo(width*(end-.12), height*.72); ctx.fill();
    }
    ctx.strokeStyle = '#b9dfd548'; ctx.lineWidth = 1;
    for (const row of [0, 1, 2]) {
      ctx.beginPath(); ctx.moveTo(0, 13+row*9);
      ctx.bezierCurveTo(width*.3, 2+row*9+Math.sin(t*.35)*2, width*.64, 22+row*7, width, 12+row*9); ctx.stroke();
    }
    for (const [x,y,r] of [[.08,.34,1],[.23,.65,.8],[.39,.25,.7],[.56,.73,1],[.72,.43,.8],[.85,.66,.7],[.94,.3,1]]) oval(ctx, width*x, height*y+Math.sin(t*.4+x)*1.7, r, r, '#c0d9cb35');
    shape(ctx, `M0 ${height*.88}Q${width*.2} ${height*.77} ${width*.5} ${height*.94}T${width} ${height*.9}V${height}H0Z`, '#0c2a3a');
  } else if (taxonId === 'danaus_plexippus') {
    ctx.fillStyle = gradient(ctx, 0, 0, 0, height, [[0, '#b8d4c8'], [.43, '#8cae90'], [1, '#3d6755']]); ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#e7e2af33'; ctx.beginPath(); ctx.ellipse(width*.72, height*.21, width*.17, height*.24, -.3, 0, Math.PI*2); ctx.fill();
    milkweed(ctx, width*.10, height*.94, .9, Math.sin(t*.5)*.025);
    milkweed(ctx, width*.87, height*.98, 1.24, -.15+Math.sin(t*.5+.3)*.025);
    milkweed(ctx, width*.68, height*1.06, .76, .2);
    line(ctx, `M0 ${height*.91}Q${width*.3} ${height*.79} ${width*.61} ${height*.94}`, '#94ad7c33', 8);
  } else {
    ctx.fillStyle = gradient(ctx, 0, 0, 0, height, [[0, '#c8c5ac'], [.47, '#e1c78f'], [.55, '#b49d65'], [1, '#766a43']]); ctx.fillRect(0, 0, width, height);
    oval(ctx, width*.17, height*.18, 20, 20, '#f3e2ad6b');
    shape(ctx, `M0 ${height*.57}Q${width*.2} ${height*.43} ${width*.48} ${height*.57}T${width} ${height*.51}V${height}H0Z`, '#76846b');
    shape(ctx, `M0 ${height*.65}Q${width*.35} ${height*.53} ${width*.68} ${height*.64}T${width} ${height*.59}V${height}H0Z`, '#a28a56');
    acacia(ctx, width*.13, height*.62, .65, '#526452'); acacia(ctx, width*.86, height*.58, .48, '#647461');
    if (taxonId === 'loxodonta_africana') {
      oval(ctx, width*.55, height*.81, width*.30, height*.08, '#607e77');
      line(ctx, `M${width*.27} ${height*.81}Q${width*.53} ${height*.87} ${width*.8} ${height*.80}`, '#b8c9a366', 1.2);
    }
    for (const x of [.03,.07,.23,.31,.79,.92,.97]) {
      const y=height*(.89+(x% .13)); const bend=Math.sin(t*.6+x)*2;
      ctx.strokeStyle = '#c8bb794d'; ctx.lineWidth = 1.1; ctx.beginPath();
      ctx.moveTo(width*x, y); ctx.quadraticCurveTo(width*x-6+bend, y-15, width*x-9, y-23);
      ctx.moveTo(width*x, y); ctx.quadraticCurveTo(width*x+4+bend, y-13, width*x+10, y-18); ctx.stroke();
    }
  }
  ctx.restore(); return true;
}
