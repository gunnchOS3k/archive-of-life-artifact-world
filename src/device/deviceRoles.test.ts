import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEVICE_ROLE_IDS,
  DEVICE_ROLE_MATRIX,
  applyDeviceRole,
  getDeviceRole,
  isDeviceRoleId,
  listDeviceRoles,
  resolveDeviceRole,
} from '@/device/deviceRoles';

describe('deviceRoles', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.deviceRole;
  });

  it('defines all four G2-C6 roles with layout/input/world_scale', () => {
    expect(DEVICE_ROLE_IDS).toEqual([
      'student_14_5',
      'handheld_hybrid',
      'ds_xl_coder',
      'edge_io_rings',
    ]);
    for (const id of DEVICE_ROLE_IDS) {
      const role = DEVICE_ROLE_MATRIX[id];
      expect(role.input).toBeTruthy();
      expect(role.layout).toBeTruthy();
      expect(role.worldScale).toBeTruthy();
      expect(role.worldScaleFactor).toBeGreaterThan(0);
    }
    expect(getDeviceRole('edge_io_rings').peripheralOnly).toBe(true);
    expect(getDeviceRole('ds_xl_coder').dualPane).toBe(true);
    expect(getDeviceRole('handheld_hybrid').touchPrimary).toBe(true);
  });

  it('resolves role from query param and applies CSS/data attrs', () => {
    expect(isDeviceRoleId('student_14_5')).toBe(true);
    expect(isDeviceRoleId('not_a_role')).toBe(false);
    const role = resolveDeviceRole(null, new URLSearchParams('device=ds_xl_coder'));
    expect(role.id).toBe('ds_xl_coder');
    applyDeviceRole(role);
    expect(document.documentElement.classList.contains(role.cssClass)).toBe(true);
    expect(document.documentElement.dataset.deviceRole).toBe('ds_xl_coder');
    expect(document.documentElement.dataset.deviceInput).toBe('pointer_keyboard');
    expect(document.documentElement.dataset.worldScale).toBe('studio');
    expect(listDeviceRoles()).toHaveLength(4);
  });
});
