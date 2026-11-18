import { describe, it, expect, afterEach } from 'vitest';
import { ICON_FONT_GATE } from '../../app/lib/iconFontGate';

type Listener = () => void;

/** A `document.fonts` stand-in: the faces it holds and the load events it can fire. */
function fakeFonts(faces: { family: string; status: string }[] = []) {
  const listeners = new Map<string, Set<Listener>>();
  const fonts = {
    forEach: (cb: (face: { family: string; status: string }) => void) => faces.forEach(cb),
    addEventListener: (name: string, cb: Listener) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(cb);
    },
    removeEventListener: (name: string, cb: Listener) => void listeners.get(name)?.delete(cb),
  };
  return {
    fonts,
    faces,
    fire: (name: string) => listeners.get(name)?.forEach((cb) => cb()),
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
  };
}

const run = (fonts: unknown) => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
  new Function(ICON_FONT_GATE)();
};
const mark = () => document.documentElement.getAttribute('data-icons');

afterEach(() => {
  document.documentElement.removeAttribute('data-icons');
  Reflect.deleteProperty(document, 'fonts');
});

describe('the icon font gate', () => {
  it('marks the page pending before the font is known, so the glyphs are hidden from the first paint', () => {
    const { fonts } = fakeFonts();
    run(fonts);
    expect(mark()).toBe('pending');
  });

  it('lifts the mark once the icon font has loaded, and only then', () => {
    const f = fakeFonts([{ family: 'PingARLT', status: 'loaded' }]);
    run(f.fonts);
    f.fire('loadingdone'); // another font finished: the icons are still waiting
    expect(mark()).toBe('pending');
    f.faces.push({ family: '"sallaicons"', status: 'loading' });
    f.fire('loadingdone');
    expect(mark()).toBe('pending');
    f.faces[1].status = 'loaded';
    f.fire('loadingdone');
    expect(mark()).toBeNull();
  });

  it('does not mark a page whose icon font is already loaded', () => {
    run(fakeFonts([{ family: 'sallaicons', status: 'loaded' }]).fonts);
    expect(mark()).toBeNull();
  });

  it('lifts the mark if the font fails, rather than hiding the icons for good', () => {
    const f = fakeFonts();
    run(f.fonts);
    f.fire('loadingerror');
    expect(mark()).toBeNull();
  });

  it('leaves no listeners behind once it is done', () => {
    const f = fakeFonts([{ family: 'sallaicons', status: 'loading' }]);
    run(f.fonts);
    f.faces[0].status = 'loaded';
    f.fire('loadingdone');
    expect(f.listenerCount()).toBe(0);
  });

  it('does nothing where the Font Loading API is missing', () => {
    run(undefined);
    expect(mark()).toBeNull();
  });

  it('uses no timer: the font\'s own events decide', () => {
    expect(ICON_FONT_GATE).not.toMatch(/setTimeout|setInterval/);
  });
});
