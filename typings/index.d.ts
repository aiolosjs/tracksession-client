export interface IOptions {
    token: string;
    blockClass?: string | RegExp;
    ignoreClass?: string;
    maskAllInputs?: boolean;
}
export declare type userType = 'user' | 'session';
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
}
export default class TrackSession {
    private options;
    private socket;
    private sessionId;
    private userId;
    private domain;
    private recordNSP;
    private storeKey;
    private recordStopFn;
    constructor(options: IOptions);
    private init;
    private request;
    private verifyToken;
    private onDocumentVisibilityState;
    private getUserByType;
    private setUserByType;
    private socketEventInit;
    private openSocket;
    private startRecord;
    private stopRecord;
}
