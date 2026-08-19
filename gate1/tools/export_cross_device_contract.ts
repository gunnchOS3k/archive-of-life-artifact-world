#!/usr/bin/env tsx
/** Export cross-device contract JSON for field-kit aggregate verifier. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildCrossDeviceContract } from '../../src/crossDevice/contractProvider.ts';

const out = join(process.cwd(), 'gate1/evidence/out/cross_device_contract.json');
mkdirSync(dirname(out), { recursive: true });
const doc = buildCrossDeviceContract({ platform: process.env.PLATFORM ?? 'node' });
writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log('cross_device_contract written:', out);
