import {existsSync} from 'node:fs';
import type {Stage} from '../run';

const stage: Stage = {
  name: 'fast-swift',
  order: 30,
  e2e: false,
  run({sh}) {
    if (process.platform !== 'darwin') return void console.log('skipped: not macOS');
    if (!existsSync('Package.swift')) return void console.log('skipped: no Package.swift');
    sh(['swift', 'test']);
  },
};

export default stage;
