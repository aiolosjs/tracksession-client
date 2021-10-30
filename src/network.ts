import {
  parseUrlSearch,
  getUniqueID,
  parseAjaxHeaders,
  isPlainObject,
  isString,
} from './utils';

class HijackNetwork {
  private recorder: any;
  private reqList: Record<string, any>;
  constructor(recorder: any) {
    this.recorder = recorder;
    this.hijackFetch();
    this.hijackAjax();
  }
  private processFetchSavedRequestResponse(
    savedRequest: Request | null,
    savedResponse: Response | null,
    startTime: number,
    endTime: number,
  ) {
    const attemptParseBuffer = (buffer: ArrayBuffer) => {
      if (!buffer) return {};
      if (buffer.byteLength <= 0) {
        return {};
      }
      try {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(buffer);

        try {
          return { body: JSON.parse(text) };
        } catch (err) {
          return {
            body: 'no parse',
          };
        }
      } catch (err) {
        return {
          body: 'no parse',
        };
      }
    };
    const parseHeaders = (headers: any) => {
      try {
        const result: Record<string, any> = {};
        const entries = headers.entries();
        let entry = entries.next();
        while (!entry.done) {
          result[entry.value[0]] = entry.value[1];

          entry = entries.next();
        }
        return result;
      } catch (e) {
        return {};
      }
    };

    try {
      if (savedRequest && savedResponse) {
        try {
          Promise.all([
            savedRequest.arrayBuffer(),
            savedResponse.arrayBuffer(),
          ]).then((bodies) => {
            const processedBodies = bodies.map(attemptParseBuffer);
            if (savedRequest.method.toLowerCase() === 'get') {
              Object.assign(processedBodies[0], {
                body: parseUrlSearch(savedRequest.url),
              });
            }

            const requestModel = Object.assign(processedBodies[0], {
              url: savedRequest.url,
              method: savedRequest.method,
              time: startTime,
              headers: parseHeaders(savedRequest.headers),
            });

            const responseModel = Object.assign(processedBodies[1], {
              status: savedResponse.status,
              time: endTime,
              headers: parseHeaders(savedResponse.headers),
            });

            const paylaod = {
              request: requestModel,
              response: responseModel,
            };
            // console.log(paylaod);
            if (
              paylaod.request.url.endsWith('/updatevisibilitystate') ||
              paylaod.request.url.endsWith('/verifytoken')
            ) {
              return;
            }

            this.recorder.addCustomEvent('hijack-fetch', paylaod);
          });
        } catch (err) {}
      } else {
        //   logger.log('savedRequest');
      }
    } catch (err) {}
  }
  private hijackFetch() {
    const _fetch = window.fetch;
    if (!_fetch) return;
    const interceptor = (input: RequestInfo, init: RequestInit) => {
      let savedRequest: Request | null = null;
      try {
        savedRequest = new Request(input, init);
      } catch (err) {}

      const startTime = Date.now();
      let endTime = null;

      let promise = null;

      promise = _fetch(input, init);

      // add handlers for response.
      promise = promise.then((response) => {
        const savedResponse = response.clone();
        endTime = Date.now();

        this.processFetchSavedRequestResponse(
          savedRequest,
          savedResponse,
          startTime,
          endTime,
        );

        return response;
      });

      return promise;
    };
    const prevFetch = (input: RequestInfo, init: RequestInit) => {
      return interceptor(input, init);
    };
    window.fetch = prevFetch;
  }
  private processAjaxSavedRequestResponse(item: Record<string, any>) {
    const {
      url,
      method,
      startTime,
      endTime,
      postData,
      getData,
      requestHeader,
      responseHeader = {},
      status,
      responseType,
      response,
    } = item;
    const requestModel = {};
    const responseModel = {};

    let resBody;

    try {
      resBody = JSON.parse(response);
    } catch (error) {
      resBody = response;
    }

    Object.assign(requestModel, {
      url,
      method,
      time: startTime,
      headers: requestHeader,
      body: method === 'GET' ? getData : postData,
    });

    Object.assign(responseModel, {
      status,
      time: endTime,
      headers: { ...responseHeader, responseType },
      body: resBody,
    });

    const paylaod = {
      request: requestModel,
      response: responseModel,
    };
    console.log(paylaod);
    this.recorder.addCustomEvent('hijack-xhr', paylaod);
  }
  private hijackAjax() {
    let _XMLHttpRequest = window.XMLHttpRequest;
    if (!_XMLHttpRequest) {
      return;
    }
    const that = this;
    const _open = window.XMLHttpRequest.prototype.open,
      _send = window.XMLHttpRequest.prototype.send,
      _setRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
    that.reqList = {};
    window.XMLHttpRequest.prototype.open = function () {
      try {
        let XMLReq = this;
        let [method, url] = [...arguments],
          id = getUniqueID();
        let timer = -1;
        XMLReq._requestID = id;
        XMLReq._method = method;
        XMLReq._url = url;

        let _onreadystatechange = XMLReq.onreadystatechange ?? function () {};
        let onreadystatechange = function () {
          let item = that.reqList[id];
          if (!item) {
            item = {};
            that.reqList[id] = item;
          }
          item.readyState = XMLReq.readyState;
          item.status = 0;
          if (XMLReq.readyState > 1) {
            item.status = XMLReq.status;
          }

          if (XMLReq.readyState == 0) {
            // UNSENT
            if (!item.startTime) {
              item.startTime = +new Date();
            }
          } else if (XMLReq.readyState == 1) {
            // OPENED
            if (!item.startTime) {
              item.startTime = +new Date();
            }
            // UNSENT
          } else if (XMLReq.readyState == 2) {
            // UNSENT
          } else if (XMLReq.readyState == 3) {
            // LOADING
          } else if (XMLReq.readyState == 4) {
            // DONE
            clearInterval(timer);
            item.responseHeader = parseAjaxHeaders(
              XMLReq.getAllResponseHeaders(),
            );
            item.endTime = +new Date();
            item.response = XMLReq.response;
            item.responseType = XMLReq.responseType;
            that.processAjaxSavedRequestResponse(item);
          } else {
            clearInterval(timer);
          }
          return _onreadystatechange.apply(XMLReq, arguments);
        };
        XMLReq.onreadystatechange = onreadystatechange;
        let preState = -1;
        timer = window.setInterval(function () {
          if (preState != XMLReq.readyState) {
            preState = XMLReq.readyState;
            onreadystatechange.call(XMLReq);
          }
        }, 10);

        return _open.apply(XMLReq, arguments);
      } catch (error) {
        console.log(error);
      }
    };
    window.XMLHttpRequest.prototype.setRequestHeader = function () {
      const XMLReq = this;
      const args = [...arguments];
      const item = that.reqList[XMLReq._requestID];
      if (item) {
        if (!item.requestHeader) {
          item.requestHeader = {};
        }
        item.requestHeader[args[0]] = args[1];
      }
      return _setRequestHeader.apply(XMLReq, args);
    };
    window.XMLHttpRequest.prototype.send = function () {
      let XMLReq = this;
      let args = [...arguments],
        data = args[0];

      let item = that.reqList[XMLReq._requestID] ?? {};
      item.method = (XMLReq._method ?? 'GET').toUpperCase();

      item.url = XMLReq._url ?? '';

      if (item.method == 'POST') {
        if (isString(data)) {
          let arr = data.split('&');
          item.postData = {};
          for (let q of arr) {
            q = q.split('=');
            item.postData[q[0]] = q[1];
          }
        } else if (isPlainObject(data)) {
          item.postData = data;
        } else {
          item.postData = '[object Object]';
        }
      } else {
        item.getData = parseUrlSearch(item.url);
      }
      return _send.apply(XMLReq, args);
    };
  }
}

export default HijackNetwork;
