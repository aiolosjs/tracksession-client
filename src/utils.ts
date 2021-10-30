export const parseUrlSearch = (url: string) => {
  try {
    const body = url
      .split('?')[1]
      .split('&')
      .reduce(function (prev, curr) {
        const p = curr.split('=');
        // @ts-ignore
        prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
        return prev;
      }, {});
    return body;
  } catch (error) {
    return {};
  }
};

const isWindow = (value: any) => {
  var toString = Object.prototype.toString.call(value);
  return (
    toString == '[object global]' ||
    toString == '[object Window]' ||
    toString == '[object DOMWindow]'
  );
};

export const isPlainObject = (obj: any) => {
  let hasOwn = Object.prototype.hasOwnProperty;
  // Must be an Object.
  if (!obj || typeof obj !== 'object' || obj.nodeType || isWindow(obj)) {
    return false;
  }
  try {
    if (
      obj.constructor &&
      !hasOwn.call(obj, 'constructor') &&
      !hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')
    ) {
      return false;
    }
  } catch (e) {
    return false;
  }
  let key;
  for (key in obj) {
  }
  return key === undefined || hasOwn.call(obj, key);
};
export const isString = (value: any) => {
  return Object.prototype.toString.call(value) == '[object String]';
};
export const getUniqueID = () => {
  let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    function (c) {
      let r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
  return id;
};

export const parseAjaxHeaders = (header = '') => {
  try {
    const headers: Record<string, string> = {},
      headerArr = header.split('\n');
    for (let i = 0; i < headerArr.length; i++) {
      let line = headerArr[i];
      if (!line) {
        continue;
      }
      let arr = line.split(': ');
      let key = arr[0],
        value = arr.slice(1).join(': ');
      headers[key] = value;
    }
    return headers;
  } catch (error) {
    return {};
  }
};

export const request = async <T>(
  url: string,
  body: Record<string, any>,
): Promise<T> => {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const json: T = await response.json();
  return json;
};
