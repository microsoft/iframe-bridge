import { initProxy } from '../src/host';
import { linkHost } from '../src/iframe';

const proxy = initProxy();

// bind events
(window as any).events.xxx.addListener(proxy.registerEvent('xxx'));
(window as any).events.yyy.addListener(proxy.registerEvent('yyy'));

// register methods
proxy.registerMethod('xxx', () => 123);
proxy.registerMethod('yyy', () => Promise.resolve('456'));

interface Events {
  xxx: (x: number, y: number) => void;
  yyy: (a: string, b: string) => void;
}

interface Methods {
  xxx: (a: number, b: number) => Promise<number>;
  yyy: (a: string, b: string) => Promise<string>;
  zzz?: () => Promise<void>;
}

const { events, methods } = linkHost<Methods, Events>('http://localhost:8080');

events.xxx.on((x, y) => {
  console.log(x, y);
});

events.yyy.on((a, b) => {
  console.log(a, b);
}, 1000);

methods.xxx(1, 2).then(console.log);
methods.yyy('a', 'b').then(console.log);
methods.zzz?.().then(console.log);

