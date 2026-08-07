/**
 * Settings UI — accessibility + device role + telemetry toggle.
 */

import {
  applyAccessibilitySettings,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  type AccessibilitySettings,
} from '@/systems/accessibility';
import {
  applyDeviceRole,
  DEVICE_ROLE_IDS,
  getDeviceRole,
  isDeviceRoleId,
  listDeviceRoles,
  type DeviceRoleId,
  type DeviceRoleProfile,
} from '@/device/deviceRoles';
import { isTelemetryEnabled, setTelemetryEnabled, track } from '@/systems/telemetry';

export class SettingsUI {
  private root: HTMLElement;
  private settings: AccessibilitySettings;
  private role: DeviceRoleProfile;
  onRoleChange: ((role: DeviceRoleProfile) => void) | null = null;
  onA11yChange: ((settings: AccessibilitySettings) => void) | null = null;

  constructor(panel: HTMLElement, initialRole: DeviceRoleProfile) {
    this.root = panel.querySelector('.panel-body') ?? panel;
    this.settings = loadAccessibilitySettings();
    this.role = initialRole;
    this.render();
  }

  open() {
    this.settings = loadAccessibilitySettings();
    this.render();
  }

  private render() {
    const roles = listDeviceRoles();
    this.root.innerHTML = `
      <section class="settings-section">
        <h3>Device role</h3>
        <p class="settings-hint">G2-C6 runtime profiles — layout, input, and world scale.</p>
        <select id="settings-device-role" class="filter-select" aria-label="Device role">
          ${roles
            .map(
              (r) =>
                `<option value="${r.id}" ${r.id === this.role.id ? 'selected' : ''}>${r.label} (${r.input} / ${r.layout} / ${r.worldScale})</option>`,
            )
            .join('')}
        </select>
      </section>
      <section class="settings-section">
        <h3>Accessibility</h3>
        <label class="settings-check"><input type="checkbox" id="a11y-reduced-motion" ${this.settings.reducedMotion ? 'checked' : ''}/> Reduced motion</label>
        <label class="settings-check"><input type="checkbox" id="a11y-high-contrast" ${this.settings.highContrast ? 'checked' : ''}/> High contrast</label>
        <label class="settings-check"><input type="checkbox" id="a11y-large-text" ${this.settings.largeText ? 'checked' : ''}/> Large text</label>
        <label class="settings-check"><input type="checkbox" id="a11y-sr-hints" ${this.settings.screenReaderHints ? 'checked' : ''}/> Screen-reader hints</label>
      </section>
      <section class="settings-section">
        <h3>Telemetry</h3>
        <p class="settings-hint">Local event buffer only — no remote ship by default.</p>
        <label class="settings-check"><input type="checkbox" id="telemetry-enabled" ${isTelemetryEnabled() ? 'checked' : ''}/> Enable local telemetry hooks</label>
      </section>
    `;

    const roleSelect = this.root.querySelector('#settings-device-role') as HTMLSelectElement;
    roleSelect?.addEventListener('change', () => {
      const id = roleSelect.value;
      if (!isDeviceRoleId(id)) return;
      this.role = getDeviceRole(id);
      applyDeviceRole(this.role);
      track('device_role_apply', { role: id });
      this.onRoleChange?.(this.role);
    });

    const bindA11y = (id: string, key: keyof AccessibilitySettings) => {
      const el = this.root.querySelector(`#${id}`) as HTMLInputElement | null;
      el?.addEventListener('change', () => {
        this.settings[key] = el.checked;
        saveAccessibilitySettings(this.settings);
        applyAccessibilitySettings(this.settings);
        track('a11y_change', { [key]: el.checked });
        this.onA11yChange?.(this.settings);
      });
    };
    bindA11y('a11y-reduced-motion', 'reducedMotion');
    bindA11y('a11y-high-contrast', 'highContrast');
    bindA11y('a11y-large-text', 'largeText');
    bindA11y('a11y-sr-hints', 'screenReaderHints');

    const tel = this.root.querySelector('#telemetry-enabled') as HTMLInputElement | null;
    tel?.addEventListener('change', () => setTelemetryEnabled(tel.checked));
  }

  getRole(): DeviceRoleProfile {
    return this.role;
  }

  setRole(id: DeviceRoleId) {
    if (!DEVICE_ROLE_IDS.includes(id)) return;
    this.role = getDeviceRole(id);
    applyDeviceRole(this.role);
  }
}
