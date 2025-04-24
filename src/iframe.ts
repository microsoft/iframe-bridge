import { uuid, Bridge, BridgeOptions } from './common';

type Method = (...args: any[]) => (Promise<any> | void);
type Listen<F> = (fn: F, timeout?: number) => VoidFunction;
type MapFunc<M> = { [K in keyof M]: Function };
type MapMethod<M> = { [K in keyof M]: Method };
interface Result<M, E> {
  methods: Readonly<M>;
  events: {
    readonly [K in keyof E]: { on: Listen<E[K]> };
  };
}

export function linkHost<M extends MapMethod<M>, E extends MapFunc<E>>(
  origin: string, opts: BridgeOptions = {}): Result<M, E> {
  const { win = window, scope } = opts;
  const requests: Record<string, { resolve: Function; reject: Function }> = {};
  let exist_methods: Set<string | symbol> | undefined;

  function setMethods(list: any) {
    if (!Array.isArray(list) || list.length === 0) return;
    exist_methods = new Set(list);
  }

  function done(mid: string, res?: any, err?: string) {
    const task = requests[mid];
    if (!task) return;
    delete requests[mid];
    if (err) task.reject(new Error(err));
    else task.resolve(res);
  }

  function methodGetter(target: any, method: string | symbol) {
    if (exist_methods && !exist_methods.has(method)) return;
    if (!target[method]) {
      target[method] = (...args: any[]) => {
        const mid = uuid();
        win.parent.postMessage({ type: Bridge.CALL_METHOD, mid, method, args, scope }, origin);
        return new Promise<any>((resolve, reject) => {
          requests[mid] = { resolve, reject };
          setTimeout(() => done(mid, undefined, 'timeout'), 5000);
        });
      };
    }
    return target[method];
  }

  function eventGetter(target: any, event: string | symbol) {
    if (!target[event]) {
      const list = new Set<Function>();
      target[event] = {
        trigger: (args: any[]) => list.forEach(fn => fn.apply(null, args)),
        on: (fn: Function, timeout = 0) => {
          list.add(fn);
          const remove = () => list.delete(fn);
          if (timeout > 0) setTimeout(remove, timeout);
          return remove;
        },
      };
    }
    return target[event];
  }

  const methods = new Proxy({}, { get: methodGetter });
  const events = new Proxy({}, { get: eventGetter });

  // to judge if scope is match
  const diffScope = scope ? ((s?: string) => (s !== scope)) : Boolean;
  win.addEventListener('message', ({ source, data = {} }) => {
    if (!diffScope(data.scope)) return;
    if (!source || source !== win.parent) return;
    const { type, event = '', mid = '', res, err, args = [] } = data;
    switch (type) {
      case Bridge.RESPONSE:
        return done(mid, res, err);
      case Bridge.EVENT:
        return events[event].trigger(args);
    }
  });

  methods[Bridge.ENUM_METHODS]().then(setMethods);
  events[Bridge.ENUM_METHODS].on(setMethods);
  return { methods, events };
}
