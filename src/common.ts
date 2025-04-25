export interface WinAPI {
  addEventListener: Window['addEventListener'];
  postMessage: Window['postMessage'];
  parent: WinAPI;
}

export interface BridgeOptions {
  win?: WinAPI;
  scope?: string;
}

export enum Bridge {
  // post message types
  EVENT = '__bridge_event__',
  RESPONSE = '__bridge_response__',
  CALL_METHOD = '__bridge_call_method__',

  // internal methods
  ENUM_METHODS = '__bridge_enum_methods__',

  // error types
  CALL_METHOD_FAILED = '__call_method_failed__',
  NO_METHOD = '__no_method__',
  TIME_OUT = '__time_out__',
}

export function uuid() {
  const seed = (Math.random() + 1) * Date.now();
  return Math.round(seed).toString(36);
}

export function delayExecute(fn: Function) {
  let timer = 0;
  return (wait: number) => {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
  };
}
