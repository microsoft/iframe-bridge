import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { WinAPI, Bridge } from '@/common';
import { initProxy } from '@/host';
import { linkHost } from '@/iframe';

const sleep = (ms: number) => new Promise(rs => setTimeout(rs, ms));

function mockWin(wrap: (data: any) => any, parent?: WinAPI) {
  let call = (...args: any[]) => {};
  const win: WinAPI = {
    postMessage(data: any) {
      sleep(1).then(() => call(wrap(data)));
    },
    addEventListener(type: string, handler: any) {
      if(type === 'message') call = handler;
    },
    get parent() { return parent || win; }
  };
  return win;
}

function mockPair() {
  const host = mockWin((data) => ({ data, source: iframe, origin: 'iframe' }));
  const iframe = mockWin((data) => ({ data, source: host, origin: 'host' }), host);
  return { iframe, host };
}

describe('bridge tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provide methods from host', async () => {
    const { host, iframe } = mockPair();
    const proxy = initProxy({ win: host });
    proxy.registerMethod('xxx', (x: number, y: string) => {
      expect(x).toBe(1);
      expect(y).toBe('2');
      return Promise.resolve(true);
    });
    proxy.registerMethod('zzz', () => {
      throw Error('failed');
    });

    interface Methods {
      xxx: (x: number, y: string) => Promise<boolean>;
      yyy: () => Promise<void>;
      zzz: () => Promise<void>;
    }
    const { methods } = linkHost<Methods, any>('host', { win: iframe });
    methods.yyy().catch((err) => {
      expect(err.message).toBe(Bridge.NO_METHOD);
    });
    await vi.runAllTimersAsync();
    expect(methods.yyy).toBe(undefined);
    methods.xxx(1, '2').then((res) => {
      expect(res).toBe(true);
    });
    await vi.runAllTimersAsync();
    methods.zzz().catch((err) => {
      expect(err.message).toBe(Bridge.CALL_METHOD_FAILED);
    });
    await vi.runAllTimersAsync();
  });

  it('provide events from host', async () => {
    const { host, iframe } = mockPair();
    const proxy = initProxy({ win: host });
    const fire = proxy.registerEvent('xxx');

    interface Events {
      xxx: (a: string, b: number) => void;
    }
    const { events } = linkHost<any, Events>('host', { win: iframe });
    await vi.runAllTimersAsync();
    const fn = vi.fn();
    events.xxx.on(fn, 20);
    fire('1', 2);
    await vi.runAllTimersAsync();
    expect(fn.mock.calls[0]).toEqual(['1', 2]);
    fire('1', 2);
    await vi.runAllTimersAsync();
    expect(fn.mock.calls.length).toBe(1);
  });

  describe('scope test', () => {
    it('scope dose match', async () => {
      const { host, iframe } = mockPair();
      const proxy = initProxy({ win: host, scope: '1' });
      const mockMethod = vi.fn();
      proxy.registerMethod('xxx', mockMethod);
      const fire = proxy.registerEvent('xxx');

      interface Methods {
        xxx: () => Promise<void>;
      }
      interface Events {
        xxx: () => void;
      }
      const { methods, events } = linkHost<Methods, Events>('host', { win: iframe, scope: '1' });
      methods.xxx();
      await vi.runAllTimersAsync();
      expect(mockMethod).toHaveBeenCalled();

      const mockListen = vi.fn();
      events.xxx.on(mockListen);
      fire();
      await vi.runAllTimersAsync();
      expect(mockListen).toHaveBeenCalled();
    });

    it('scope miss match', async () => {
      const { host, iframe } = mockPair();
      const proxy = initProxy({ win: host, scope: '1' });
      const mockMethod = vi.fn();
      proxy.registerMethod('xxx', mockMethod);
      const fire = proxy.registerEvent('xxx');

      interface Methods {
        xxx: () => Promise<void>;
      }
      interface Events {
        xxx: () => void;
      }
      const { methods, events } = linkHost<Methods, Events>('host', { win: iframe, scope: '2' });
      methods.xxx().catch((err) => {
        expect(err.message).toBe(Bridge.TIME_OUT);
      });
      await vi.runAllTimersAsync();
      expect(mockMethod).not.toBeCalled();

      const mockListen = vi.fn();
      events.xxx.on(mockListen);
      fire('xxx');
      await vi.runAllTimersAsync();
      expect(mockListen).not.toBeCalled();
    });
  });
});
