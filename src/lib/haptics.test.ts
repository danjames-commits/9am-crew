import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module caches its hidden label, so load a fresh copy for each test.
async function load() {
  vi.resetModules();
  return (await import('./haptics')).haptic;
}

function fakeDocument() {
  const made: { tag: string; el: Record<string, unknown> }[] = [];
  const doc = {
    createElement: (tag: string) => {
      const el: Record<string, unknown> = {
        style: {},
        attrs: {} as Record<string, string>,
        children: [] as unknown[],
        setAttribute(k: string, v: string) {
          (this.attrs as Record<string, string>)[k] = v;
        },
        appendChild(c: unknown) {
          (this.children as unknown[]).push(c);
        },
        isConnected: true,
        click: vi.fn(),
      };
      made.push({ tag, el });
      return el;
    },
    body: { appendChild: vi.fn() },
  };
  return { doc, made };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('haptic', () => {
  it('does nothing on the server', async () => {
    vi.stubGlobal('window', undefined);
    const haptic = await load();
    expect(() => haptic()).not.toThrow();
  });

  it('uses navigator.vibrate when the browser has it', async () => {
    const vibrate = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { vibrate });
    const haptic = await load();
    haptic(12);
    expect(vibrate).toHaveBeenCalledWith(12);
  });

  it('defaults to 10 ms', async () => {
    const vibrate = vi.fn();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', { vibrate });
    const haptic = await load();
    haptic();
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('on iPhone, clicks one hidden switch, made once and reused', async () => {
    const { doc, made } = fakeDocument();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', doc);
    const haptic = await load();
    haptic();
    haptic();
    const label = made.find((m) => m.tag === 'label')!.el;
    const input = made.find((m) => m.tag === 'input')!.el;
    expect(made.filter((m) => m.tag === 'label')).toHaveLength(1);
    expect(input.type).toBe('checkbox');
    expect((input.attrs as Record<string, string>).switch).toBe('');
    expect(label.children).toContain(input);
    expect(doc.body.appendChild).toHaveBeenCalledTimes(1);
    expect(label.click).toHaveBeenCalledTimes(2);
  });

  it('on iPhone, makes a new switch when the old one was detached', async () => {
    const { doc, made } = fakeDocument();
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', doc);
    const haptic = await load();
    haptic();
    made.find((m) => m.tag === 'label')!.el.isConnected = false;
    haptic();
    expect(made.filter((m) => m.tag === 'label')).toHaveLength(2);
  });
});
