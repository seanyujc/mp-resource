export class InterceptorManager<
  M extends string | Record<string, any> | ArrayBuffer,
  H extends RequestCallback<M> | ResponseCallback<M>
> {
  handlers: (Handler<M, H> | null)[] = [];
  use(fulfilled: H, rejected?: () => any) {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }
  eject(id: number) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }

  forEach(
    fn: (
      h: Handler<M, H> | null,
      i: number,
      handlers: (Handler<M, H> | null)[]
    ) => void
  ) {
    for (let i = 0; i < this.handlers.length; i++) {
      fn.call(null, this.handlers[i], i, this.handlers);
    }
  }
}

export type Handler<
  M extends string | Record<string, any> | ArrayBuffer,
  H extends RequestCallback<M> | ResponseCallback<M>
> = {
  fulfilled: H;
  rejected?: () => Promise<any>;
};

export type ResponseCallbackParams<M extends string | Record<string, any> | ArrayBuffer> = {
  result: WechatMiniprogram.RequestSuccessCallbackResult<M>;
  urlKey: string;
  method: "OPTIONS" | "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "TRACE" | "CONNECT"
};

export type RequestCallback<
  M extends string | Record<string, any> | ArrayBuffer = any
> = (
  options: WechatMiniprogram.RequestOption<M>
) =>
  | Promise<WechatMiniprogram.RequestOption<M>>
  | WechatMiniprogram.RequestOption<M>;

export type ResponseCallback<
  M extends string | Record<string, any> | ArrayBuffer = any
> = (
  params: ResponseCallbackParams<M>
) =>
  | Promise<ResponseCallbackParams<M>>
  | ResponseCallbackParams<M>;
