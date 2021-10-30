import TrackSession, { IOptions } from './index';

declare global {
  interface Window {
    trackSessionToken: string;
    TrackSession: any;
  }
}

(function () {
  const options: IOptions = { token: window['trackSessionToken'] || '' };
  window.TrackSession = TrackSession;
  new TrackSession(options);
})();
