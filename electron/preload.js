const { contextBridge, ipcRenderer } = require('electron');

const call = (ch) => (...args) => ipcRenderer.invoke(ch, ...args);

contextBridge.exposeInMainWorld('sb', {
  state: call('state'),
  resume: call('resume'),
  login: call('login'),
  qrStart: call('qr-start'),
  qrCancel: call('qr-cancel'),
  accounts: call('accounts'),
  guard: call('guard'),
  logout: call('logout'),
  start: call('start'),
  stop: call('stop'),
  refresh: call('refresh'),
  settings: call('settings'),
  skip: call('skip'),
  open: call('open'),
  onState: (fn) => {
    const h = (_e, s) => fn(s);
    ipcRenderer.on('state', h);
    return () => ipcRenderer.removeListener('state', h);
  },
});
