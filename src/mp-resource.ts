import { autoConfigure } from "./configuration";
import {
  Handler,
  InterceptorManager,
  RequestCallback,
  ResponseCallback,
  ResponseCallbackParams,
} from "./interceptor-manager";
import { generateUUID } from "./utils";

export interface IAppOption<
  M extends IRestResponse,
  H extends string,
  D extends Record<string, any>
> extends WechatMiniprogram.IAnyObject {
  globalData: Required<{
    resource: IResource<M, H, D>;
  }>;
}

export interface IResource<
  M extends IRestResponse,
  H extends string,
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
  getHost(hostKey: H): IHost<string> | undefined;
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
>(sysEnvConfig: ISite<string, H>): IResource<M, H, D> {
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

  function getUrlInfo(
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
        return { url };
      }
    } else if (typeof url === "object") {
      hostKey = url.hostKey;
      path = url.path;
    }
    const host = getHost(hostKey);
    return { host, url: host ? host.url + path : path };
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
    const { url } = getUrlInfo(method, urlKey);
    return url;
  }

  function request<
    T extends string | number | Record<string, any> | ArrayBuffer
  >({ method, urlKey, data, pathVariable, header }: ResourceRequestOptions) {
    return new Promise<T>((resolve, reject) => {
      generateUUID()
        .then((traceId) => {
          let { host, url } = getUrlInfo(method, urlKey);
          if (pathVariable && pathVariable instanceof Array) {
            url = [url, ...pathVariable].join("/");
          }

          header = { ...host?.header, ...header };
          let option: WechatMiniprogram.RequestOption<M> = {
            method,
            url,
            data,
            header,
            success: (res) => {
              const responseInterceptorChain: Handler<
                M,
                ResponseCallback<M>
              >[] = [];
              interceptors.response.forEach((handler) => {
                if (handler != null) {
                  responseInterceptorChain.unshift(handler);
                }
              });

              let i = 0;
              let promise = Promise.resolve<ResponseCallbackParams<M>>({
                result: res,
                urlKey,
                method,
                traceId,
              });
              let len = responseInterceptorChain.length;

              while (i < len) {
                const { fulfilled, rejected } = responseInterceptorChain[i];
                if (isPromiseLike(fulfilled)) {
                  promise = promise.then((res) => fulfilled(res), rejected);
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

              promise.then(({ result }) => {
                // only is data returned
                resolve(result.data as any as T);
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
          let promise = Promise.resolve({ option, urlKey, method, traceId });
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

          promise.then(({ option }) => {
            wx.request<M>(option);
          });
        })
        .catch(reject);
      // const traceId = uuidv4({
      //   random: [
      //     0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea, 0x71, 0xb4, 0xef,
      //     0xe1, 0x67, 0x1c, 0x58, 0x36,
      //   ],
      // });
    });
  }

  return { get, post, put, remove, getUrl, getHost, interceptors, envData };
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
  T extends string | number | Record<string, any> | ArrayBuffer =
    | string
    | number
    | Record<string, any>
    | ArrayBuffer
> {
  data: T;
  status: number;
}
