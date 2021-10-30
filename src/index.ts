import { record } from 'rrweb';
import { eventWithTime, listenerHandler } from 'rrweb/typings/types.d';
import io from 'socket.io-client';
import omit from 'omit.js';
import { request } from './utils';

import HijackNetwork from './network';

export interface IOptions {
  token: string;
  blockClass?: string | RegExp;
  ignoreClass?: string;
  maskAllInputs?: boolean;
}
export type userType = 'user' | 'session';

export interface IRepData {
  code: number;
  body: {
    [key: string]: any;
  };
  message: string;
}
export interface ISocketOptions {
  token: string;
  userId: string;
  sessionId: string;
}

export interface IVerifyTokenBody {
  token: string;
  userId: string;
  sessionId: string;
  pageUrl: string;
  screenWidth: number;
  screenHeight: number;
  resolution: string;
}

export interface IUpdateDocumentVisibilityStateBody {
  sessionId: string;
  visibilityState: boolean;
  isLive: boolean;
}

type IdentifyInfo = {
  userName: string;
  extra: Record<string, any>;
};
// @ts-ignore

export default class TrackSession {
  private options: IOptions;
  private socket: SocketIOClient.Socket;
  private sessionId: string;
  private userId: string;
  // @ts-ignore
  private static domain: string = isProd
    ? '//api-tracksession.ishanggang.com'
    : 'http://127.0.0.1:7008';

  private recordNSP: string = 'record';
  private storeKey: string = 'tracksession-';
  private recordStopFn: listenerHandler | undefined;
  private static isCertified = false;
  private static sessionId: string;
  constructor(options: IOptions) {
    this.options = options;
    this.init();
  }
  public static addCustomEvent(tag: string, paylaod: unknown) {
    if (TrackSession.isCertified && record) {
      record.addCustomEvent(tag, paylaod);
    }
  }
  public static async identify(payload: IdentifyInfo) {
    if (TrackSession.isCertified) {
      try {
        await request<IRepData>(`${TrackSession.domain}/updateIdentify`, {
          ...payload,
          sessionId: TrackSession.sessionId,
        });
      } catch (error) {}
    }
  }
  private init() {
    this.verifyToken();
  }

  private async verifyToken() {
    const { token = '' } = this.options;
    if (!token) throw new Error('token is required');
    const pageUrl = window.location.href;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const resolution = `${window.screen.width}*${window.screen.height}`;
    const userId = this.getUserByType('user');
    const sessionId = this.getUserByType('session');
    const bodyParams: IVerifyTokenBody = {
      token,
      userId,
      sessionId,
      pageUrl,
      screenWidth,
      screenHeight,
      resolution,
    };
    try {
      // const json = await this.request('/verifytoken', bodyParams);
      const json = await request<IRepData>(
        `${TrackSession.domain}/verifytoken`,
        bodyParams,
      );
      const { code, body = {} } = json;
      if (code === 200) {
        const { userId, sessionId } = body;
        TrackSession.isCertified = true;
        TrackSession.sessionId = sessionId;
        this.sessionId = sessionId;
        this.userId = userId;
        this.setUserByType('user', userId);
        this.setUserByType('session', sessionId);
        this.openSocket();
        this.onDocumentVisibilityState();
        // console.log(true)
      }
    } catch (error) {}
  }
  private async onDocumentVisibilityState() {
    const updateHandle = async (visibilityState = true, isLive = true) => {
      const sessionId = this.getUserByType('session');
      const bodyParams: IUpdateDocumentVisibilityStateBody = {
        sessionId,
        visibilityState,
        isLive,
      };
      try {
        await request<IRepData>(
          `${TrackSession.domain}/updatevisibilitystate`,
          bodyParams,
        );
      } catch (error) {}
    };
    updateHandle();

    document.addEventListener('visibilitychange', async () => {
      const visibilityState = document.visibilityState === 'visible';
      updateHandle(visibilityState);
    });

    document.addEventListener('unload', () => {
      try {
        const sessionId = this.getUserByType('session');
        const data = new Blob([JSON.stringify({ sessionId })], {
          type: 'application/json; charset=UTF-8',
        });

        navigator.sendBeacon(
          `${TrackSession.domain}/unloadUpdatevisibilitystate`,
          data,
        );
      } catch (error) {}
    });
  }
  private getUserByType(type: userType): string {
    const { token } = this.options;
    try {
      const key = `${this.storeKey}-${type}id-${token}`;
      if (type === 'session') {
        return sessionStorage.getItem(key) ?? '';
      } else {
        return localStorage.getItem(key) ?? '';
      }
    } catch (error) {
      throw new Error('浏览器版本不支持');
    }
  }
  private setUserByType(type: userType, userid: string) {
    const { token } = this.options;
    try {
      const key = `${this.storeKey}-${type}id-${token}`;
      if (type === 'session') {
        sessionStorage.setItem(key, userid);
      } else {
        localStorage.setItem(key, userid);
      }
    } catch (error) {
      throw new Error('浏览器版本不支持');
    }
  }
  private initSocketEvent() {
    this.socket.on('connect', () => {
      console.log('connect*****');
      this.startRecord();
    });
    this.socket.on('reconnect', () => {
      this.restartRecord();
    });
    this.socket.on('connect_error', (error: object) => {
      // console.log('connect_error', error);
    });
    this.socket.on('connect_timeout', (timeout: number) => {
      // console.log('connect_timeout', timeout);
    });
    this.socket.on('disconnect', (reason: string) => {
      console.log('disconnect', reason);
      this.stopRecord();
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });
    this.socket.on('online', () => {
      this.restartRecord();
    });
  }

  private openSocket() {
    const { token } = this.options;
    const url = `${TrackSession.domain}/${this.recordNSP}`;
    const option: ISocketOptions & { room: string; role: string } = {
      token,
      sessionId: this.sessionId,
      userId: this.userId,
      room: this.sessionId,
      role: 'client',
    };

    this.socket = io(url, {
      query: option,
      transports: ['websocket'],
      path: '/sessiontrack',
    });
    this.initSocketEvent();
    new HijackNetwork(record);
  }
  private startRecord() {
    const recordOptions: Pick<
      IOptions,
      'blockClass' | 'ignoreClass' | 'maskAllInputs'
    > = omit(this.options, ['token']);

    this.recordStopFn = record({
      emit: (event: eventWithTime) => {
        // @ts-ignore
        const defaultLog = console.log['__rrweb_original__']
          ? console.log['__rrweb_original__']
          : console.log;
        // defaultLog('record', event);
        this.socket.emit(this.recordNSP, event);
      },
      ...recordOptions,
      recordLog: {
        level: ['info', 'log', 'warn', 'error'],
        lengthThreshold: 100,
        stringifyOptions: {
          stringLengthLimit: 1000,
          numOfKeysLimit: 100,
        },
        logger: window.console,
      },
    });
  }
  private stopRecord() {
    if (this.recordStopFn) {
      this.recordStopFn();
    }
  }
  private restartRecord() {
    this.stopRecord();
    this.startRecord();
  }
}
