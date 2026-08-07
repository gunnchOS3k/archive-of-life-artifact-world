/**
 * Device-role runtime for G2-C6 — real TypeScript module (not YAML-only).
 * Roles: student_14_5, handheld_hybrid, ds_xl_coder, edge_io_rings
 */

export type DeviceRoleId =
  | 'student_14_5'
  | 'handheld_hybrid'
  | 'ds_xl_coder'
  | 'edge_io_rings';

export type DeviceInputMode =
  | 'pointer'
  | 'touch'
  | 'pointer_keyboard'
  | 'ring_select';

export type DeviceLayout =
  | 'landscape'
  | 'portrait_or_landscape'
  | 'dual_pane_editor_world'
  | 'peripheral_only';

export type WorldScale = 'classroom' | 'pocket' | 'studio' | 'n/a';

export interface DeviceRoleProfile {
  id: DeviceRoleId;
  label: string;
  input: DeviceInputMode;
  layout: DeviceLayout;
  worldScale: WorldScale;
  /** Movement / camera scale multiplier applied to world viewport */
  worldScaleFactor: number;
  /** Prefer touch stick when true */
  touchPrimary: boolean;
  /** Dual-pane debug chrome for coder XL */
  dualPane: boolean;
  /** Peripheral-only: suppress full world canvas chrome */
  peripheralOnly: boolean;
  cssClass: string;
}

export const DEVICE_ROLE_MATRIX: Record<DeviceRoleId, DeviceRoleProfile> = {
  student_14_5: {
    id: 'student_14_5',
    label: 'Student 14.5″ classroom',
    input: 'pointer',
    layout: 'landscape',
    worldScale: 'classroom',
    worldScaleFactor: 1,
    touchPrimary: false,
    dualPane: false,
    peripheralOnly: false,
    cssClass: 'device-role-student-14-5',
  },
  handheld_hybrid: {
    id: 'handheld_hybrid',
    label: 'Handheld hybrid',
    input: 'touch',
    layout: 'portrait_or_landscape',
    worldScale: 'pocket',
    worldScaleFactor: 0.85,
    touchPrimary: true,
    dualPane: false,
    peripheralOnly: false,
    cssClass: 'device-role-handheld-hybrid',
  },
  ds_xl_coder: {
    id: 'ds_xl_coder',
    label: 'DS XL coder',
    input: 'pointer_keyboard',
    layout: 'dual_pane_editor_world',
    worldScale: 'studio',
    worldScaleFactor: 1.1,
    touchPrimary: false,
    dualPane: true,
    peripheralOnly: false,
    cssClass: 'device-role-ds-xl-coder',
  },
  edge_io_rings: {
    id: 'edge_io_rings',
    label: 'Edge I/O rings',
    input: 'ring_select',
    layout: 'peripheral_only',
    worldScale: 'n/a',
    worldScaleFactor: 1,
    touchPrimary: false,
    dualPane: false,
    peripheralOnly: true,
    cssClass: 'device-role-edge-io-rings',
  },
};

export const DEVICE_ROLE_IDS: DeviceRoleId[] = [
  'student_14_5',
  'handheld_hybrid',
  'ds_xl_coder',
  'edge_io_rings',
];

const STORAGE_KEY = 'aol_device_role';

export function isDeviceRoleId(value: string): value is DeviceRoleId {
  return (DEVICE_ROLE_IDS as string[]).includes(value);
}

export function getDeviceRole(id: DeviceRoleId): DeviceRoleProfile {
  return DEVICE_ROLE_MATRIX[id];
}

export function resolveDeviceRole(
  explicit?: string | null,
  searchParams?: URLSearchParams | null,
): DeviceRoleProfile {
  const fromQuery = searchParams?.get('device') ?? searchParams?.get('deviceRole');
  const raw = explicit ?? fromQuery ?? readStoredRole() ?? detectDefaultRole();
  const id = isDeviceRoleId(raw) ? raw : 'student_14_5';
  return getDeviceRole(id);
}

function readStoredRole(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistDeviceRole(id: DeviceRoleId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota */
  }
}

function detectDefaultRole(): DeviceRoleId {
  if (typeof window === 'undefined') return 'student_14_5';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = window.matchMedia?.('(max-width: 720px)').matches;
  if (coarse || narrow) return 'handheld_hybrid';
  return 'student_14_5';
}

/**
 * Apply layout / input / world_scale CSS + data attributes to document root.
 */
export function applyDeviceRole(role: DeviceRoleProfile, root: HTMLElement = document.documentElement): void {
  for (const id of DEVICE_ROLE_IDS) {
    root.classList.remove(DEVICE_ROLE_MATRIX[id].cssClass);
  }
  root.classList.add(role.cssClass);
  root.dataset.deviceRole = role.id;
  root.dataset.deviceInput = role.input;
  root.dataset.deviceLayout = role.layout;
  root.dataset.worldScale = role.worldScale;
  root.style.setProperty('--aol-world-scale', String(role.worldScaleFactor));
  persistDeviceRole(role.id);
}

export function listDeviceRoles(): DeviceRoleProfile[] {
  return DEVICE_ROLE_IDS.map((id) => DEVICE_ROLE_MATRIX[id]);
}
