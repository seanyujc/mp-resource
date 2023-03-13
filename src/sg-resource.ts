import { autoConfigure } from "./configuration";
import {
  Handler,
  InterceptorManager,
  RequestCallback,
  ResponseCallback,
} from "./interceptor-manager";

export interface IAppOption<E> extends WechatMiniprogram.IAnyObject {
  globalData: Required<{
    runtimes: E;
  }>;
}

export interface IResource<
  M extends IRestResponse,
  D extends Record<string, any>
> {
  get<T extends string | number | Record<string, any> | ArrayBuffer = any>(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ): Promise<T>;
  /**
   * post request
   * @param urlKey url key
   * @param data body
   * @param pathVariable path params
   * @param header request header
   * @returns
   */
  post<T extends string | number | Record<string, any> | ArrayBuffer = any>(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ): Promise<T>;
  put<T extends string | number | Record<string, any> | ArrayBuffer = any>(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ): Promise<T>;
  remove<T extends string | number | Record<string, any> | ArrayBuffer = any>(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ): Promise<T>;
  getUrl(
    method:
      | "OPTIONS"
      | "GET"
      | "HEAD"
      | "POST"
      | "PUT"
      | "DELETE"
      | "TRACE"
      | "CONNECT",
    urlKey: string
  ): string;
  interceptors: {
    request: InterceptorManager<M, RequestCallback<M>>;
    response: InterceptorManager<M, ResponseCallback<M>>;
  };
  envData: D;
}

export function useResource<
  M extends IRestResponse,
  H extends string = string,
  D extends Record<string, any> = Record<string, any>
>(sysEnvConfig: ISite<string, H>): IResource<M, D> {
  const interceptors = {
    request: new InterceptorManager<M, RequestCallback<M>>(),
    response: new InterceptorManager<M, ResponseCallback<M>>(),
  };
  const curConfig: ISystem<string, string> | undefined =
    autoConfigure(sysEnvConfig);
  const envData: D = {
    ...sysEnvConfig.globalData,
    ...curConfig?.data,
    runtimes: sysEnvConfig.runtimes,
  };

  function get<
    T extends string | number | Record<string, any> | ArrayBuffer = any
  >(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ) {
    return request<T>({
      method: "GET",
      urlKey,
      data,
      pathVariable,
      header,
    });
  }

  function post<
    T extends string | number | Record<string, any> | ArrayBuffer = any
  >(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ) {
    return request<T>({
      method: "POST",
      urlKey,
      data,
      pathVariable,
      header,
    });
  }

  function put<
    T extends string | number | Record<string, any> | ArrayBuffer = any
  >(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ) {
    return request<T>({
      method: "PUT",
      urlKey,
      data,
      pathVariable,
      header,
    });
  }

  function remove<
    T extends string | number | Record<string, any> | ArrayBuffer = any
  >(
    urlKey: string,
    data?: string | Record<string, any> | ArrayBuffer,
    pathVariable?: string[],
    header?: Record<string, any>
  ) {
    return request<T>({
      method: "DELETE",
      urlKey,
      data,
      pathVariable,
      header,
    });
  }

  function getHost(hostKey: H) {
    return curConfig?.hosts.find((el) => el.key === hostKey);
  }

  function getUrl(
    method:
      | "OPTIONS"
      | "GET"
      | "HEAD"
      | "POST"
      | "PUT"
      | "DELETE"
      | "TRACE"
      | "CONNECT",
    urlKey: string
  ) {
    const api =
      sysEnvConfig.apiUrl[
        method.toLocaleLowerCase() as
          | "options"
          | "get"
          | "head"
          | "post"
          | "put"
          | "delete"
          | "trace"
          | "connect"
      ];
    const url = api[urlKey];
    let hostKey: H = "" as H;
    let path = urlKey;
    if (typeof url === "string") {
      const urls = url.split(":");
      if (urls.length > 1) {
        hostKey = urls[0].replace("Host", "") as H;
        path = urls[1];
      } else {
        return url;
      }
    } else if (typeof url === "object") {
      hostKey = url.hostKey;
      path = url.path;
    }
    const host = getHost(hostKey);
    if (host) {
      return host.url + path;
    } else {
      return path;
    }
  }

  function request<
    T extends string | number | Record<string, any> | ArrayBuffer
  >({ method, urlKey, data, pathVariable, header }: ResourceRequestOptions) {
    return new Promise<T>((resolve, reject) => {
      let url = getUrl(method, urlKey);
      if (pathVariable && pathVariable instanceof Array) {
        url = [url, ...pathVariable].join("/");
      }
      let option: WechatMiniprogram.RequestOption<M> = {
        method,
        url,
        data,
        header,
        success: (res) => {
          const responseInterceptorChain: Handler<M, ResponseCallback<M>>[] =
            [];
          interceptors.response.forEach((handler) => {
            if (handler != null) {
              responseInterceptorChain.unshift(handler);
            }
          });

          let i = 0;
          let promise = Promise.resolve(res);
          let len = responseInterceptorChain.length;

          while (i < len) {
            const { fulfilled, rejected } = responseInterceptorChain[i];
            if (isPromiseLike(fulfilled)) {
              promise = promise.then(
                (res) => fulfilled({ result: res, urlKey }),
                rejected
              );
            } else {
              promise = promise.then(
                (res) =>
                  new Promise((resolve, reject) => {
                    try {
                      resolve(fulfilled({ result: res, urlKey }));
                    } catch (error) {
                      reject(error);
                    }
                  }),
                rejected
              );
            }
            i++;
          }

          promise.then((res: any) => {
            resolve(res as T);
          }, reject);
        },
        fail: (err: WechatMiniprogram.Err) => {
          reject(err);
        },
      };
      const requestInterceptorChain: Handler<M, RequestCallback<M>>[] = [];
      interceptors.request.forEach((handler) => {
        if (handler != null) {
          requestInterceptorChain.unshift(handler);
        }
      });
      let i = 0;
      let promise = Promise.resolve(option);
      let len = requestInterceptorChain.length;

      while (i < len) {
        const { fulfilled, rejected } = requestInterceptorChain[i];
        if (isPromiseLike(fulfilled)) {
          promise = promise.then(fulfilled, rejected);
        } else {
          promise = promise.then(
            (res) =>
              new Promise((resolve, reject) => {
                try {
                  resolve(fulfilled(res));
                } catch (error) {
                  reject(error);
                }
              }),
            rejected
          );
        }
        i++;
      }

      promise.then((option) => {
        console.log("request", option);

        wx.request<M>(option);
      });
    });
  }

  return { get, post, put, remove, getUrl, interceptors, envData };
}

export type ApiUrl<HostKeys> = Record<
  "options" | "get" | "head" | "post" | "put" | "delete" | "trace" | "connect",
  Record<string, string | { hostKey: HostKeys; path: string }>
>;
type IHost<H> = {
  key: H;
  url?: string;
  header?: WechatMiniprogram.IAnyObject;
};
export type ISystem<E, H> = {
  /**
   * Environmental labeling
   */
  key: E;
  /**
   * List of remote server addresses
   */
  hosts: IHost<H>[];
  /**
   * custom configuration
   */
  data?: any;
};
export type ISite<E, H> = {
  runtimes: E;
  systems: ISystem<E, H>[];
  apiUrl: ApiUrl<H>;
  /**
   * Global remote server address list
   */
  hosts?: IHost<H>[];
  /**
   * Global custom configuration
   */
  globalData?: Record<string, any>;
};
interface ResourceRequestOptions {
  method:
    | "OPTIONS"
    | "GET"
    | "HEAD"
    | "POST"
    | "PUT"
    | "DELETE"
    | "TRACE"
    | "CONNECT";
  urlKey: string;
  data?: string | Record<string, any> | ArrayBuffer;
  pathVariable?: string[];
  header?: Record<string, any>;
}

function isPromiseLike<T>(it: T | PromiseLike<T>): it is PromiseLike<T> {
  return it instanceof Promise || typeof (it as any)?.then === "function";
}

type BeaforeRequestCallback<
  M extends string | Record<string, any> | ArrayBuffer
> = (
  options: WechatMiniprogram.RequestOption<M>
) =>
  | Promise<WechatMiniprogram.RequestOption<M>>
  | WechatMiniprogram.RequestOption<M>;

type AfterRequestCallback<
  M extends string | Record<string, any> | ArrayBuffer
> = (
  res: WechatMiniprogram.RequestSuccessCallbackResult<M>
) =>
  | Promise<WechatMiniprogram.RequestSuccessCallbackResult<M>>
  | WechatMiniprogram.RequestSuccessCallbackResult<M>;

export interface ResourceOptions<
  M extends string | Record<string, any> | ArrayBuffer
> {
  beaforeRequestCallback?: BeaforeRequestCallback<M>;
  afterRequestCallback?: AfterRequestCallback<M>;
}

/**
 * request return type
 */
export interface IRestResponse<
  T extends string | number | Record<string, any> | ArrayBuffer = string
> {
  data: T;
  status: number;
}
