import { Bridge, BridgeOptions, delayExecute } from './common';

export function initProxy(opts: BridgeOptions = {}) {
  const { win = window, scope } = opts;
  const frames = new Map<string, WindowProxy>();
  const methods: Record<string, Function> = {};

  function emit(event: string, args: any[]) {
    frames.forEach((f, origin) => {
      f.postMessage({ type: Bridge.EVENT, event, args, scope }, origin);
    });
  }

  async function onCall(fn?: Function, args: any[] = []): Promise<[any?, string?]> {
    if (typeof fn !== 'function') return [, Bridge.NO_METHOD];
    let res = fn.apply(null, args);
    if (res && typeof res.then === 'function') return [await res];
    return [res];
  }

  // to judge if scope is match
  const diffScope = scope ? ((s?: string) => (s !== scope)) : Boolean;
  win.addEventListener('message', (event: any) => {
    const { source, data = {}, origin } = event;
    if (diffScope(data.scope)) return;
    if (!source || !origin) return;
    const frame = source as WindowProxy;
    frames.set(origin, frame);
    const { type, mid, method, args } = data;
    if (type === Bridge.CALL_METHOD && mid) {
      onCall(methods[method], args)
        .then(([res, err]) => {
          if (__IS_DEV__ && err) console.error(`bridge call [${method}] fail`, err);
          frame.postMessage({ type: Bridge.RESPONSE, mid, res, err, scope }, origin);
        })
        .catch((err) => {
          console.error(`bridge call [${method}] error`, err);
          frame.postMessage({ type: Bridge.RESPONSE, mid, err: Bridge.CALL_METHOD_FAILED, scope }, origin);
        });
    }
  });

  methods[Bridge.ENUM_METHODS] = () => Object.keys(methods);
  const updateMethods = delayExecute(() => emit(Bridge.ENUM_METHODS, [Object.keys(methods)]));
  return {
    emitEvent: emit,
    registerEvent(event: string) {
      return (...args: any[]) => emit(event, args);
    },
    registerMethod(method: string, handler: Function) {
      methods[method] = handler;
      updateMethods(50);
    },
  };
}
