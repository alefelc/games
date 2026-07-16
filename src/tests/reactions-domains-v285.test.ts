import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('v2.8.5', () => {
  it('reacciones', () => {
    const g=readFileSync('src/screens/GameScreen.tsx','utf8'); const i=readFileSync('src/components/Icon.tsx','utf8');
    for (const x of ['flameUp','moon','hearts','dice','change_style']) expect(g+i).toContain(x);
    expect(g).not.toContain('Me gustó');
  });
  it('dominios',()=>{ const d=readFileSync('Dockerfile','utf8'); expect(d).toContain('https://admin.teanimas.com'); expect(d).toContain('https://gm.teanimas.com'); });
});
