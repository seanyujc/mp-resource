# mp-resource

Access resource management for the service interface of wechat miniprogram, you can get two configuration lists

## Install

```js
npm i mp-resource
```

## Usage

Create your own type definition file my-miniprogram.d.ts:

```ts
declare namespace MyMiniprogram {
  type EnvKeys = "DEV" | "SIT" | "UAT" | "PROD";
  type HostKeys = "base" | "news" | "sport";
  type Resource<M, H, D> =
    import("../miniprogram/node_modules/mp-resource").IResource<M, H, D>;
  type IRestResponse<T> =
    import("../miniprogram/node_modules/mp-resource").IRestResponse<T>;

  interface RestResponse<
    T extends string | number | Record<string, any> | ArrayBuffer =
      | string
      | number
      | Record<string, any>
      | ArrayBuffer
  > extends IRestResponse<T> {
    errorCode: number | null;
    errorMessage: string;
  }

  interface IAppOption {
    globalData: {
      accessToken?: string;
      resource: Resource<RestResponse, HostKeys, EnvData>;
    };
  }
}
```

Create two configuration files.

```ts
// miniprogram/config/api-config.ts
import { ApiUrl } from "mp-resource";

export const apiUrl: ApiUrl<MyMiniprogram.HostKeys> = {
  get: {
    // GET http://localhost:8080/news-svc/details
    getNewsDetails: {
      hostKey: "news",
      path: "/details"
    }
  },
  post: {},
  put: {},
  delete: {},
};
```

```ts
// miniprogram/config/config.ts
import { ISite } from "mp-resource";
import { apiUrl } from "./api-config";

export const sysEnvConfig: ISite<
  MyMiniprogram.EnvKeys,
  MyMiniprogram.HostKeys
> = {
  runtimes: "DEV",
  systems: [
    {
      key: "DEV",
      data: {
        hostname: "http://localhost:8080",
      },
      hosts: [
        {
          key: "base",
          url: "{{data.hostname}}/base-svc",
        },
        {
          key: "news",
          url: "{{data.hostname}}/news-svc",
        },
        {
          key: "sport",
          url: "{{data.hostname}}/sport-svc",
        },
      ],
    },
  ],
  hosts: [
    { key: "base", header: { "product-code": "100001" } },
    { key: "news", header: { "product-code": "100001" } },
    { key: "sport", header: { "product-code": "100001" } },
  ],
  apiUrl,
  globalData: {},
};
```

Create a startup file

```ts
// miniprogram/resource.ts
import { sysEnvConfig } from "./config/config";
import { useResource } from "mp-resource";

export const resource = useResource(sysEnvConfig);
```

Using in app

```ts
// miniprogram/app.ts
import { resource } from "./resource";

App<TlDoctorMiniprogram.IAppOption>({
  globalData: {
    resource,
  },
  onLaunch() {
    this.globalData.resource.interceptors.request.use((option) => {
      if (this.globalData.accessToken) {
        option.header = {
          ...option.header,
          "access-token": this.globalData.accessToken,
        };
      } else {
        if (option.header) {
          delete option.header["access-token"];
        }
      }
      return option;
    });
    this.globalData.resource.interceptors.response.use(
      ({ result, urlKey }) =>
        new Promise((resolve, reject) => {
          if (result.data.status === 0) {
            // unpack
            result.data = result.data.data as any;
            resolve({ result, urlKey });
          } else {
            reject(result.data);
          }
        })
    );
  }
})
```

Use Resource send requests:  

```ts
// miniprogram/service/mews-service.ts
import { resource } from "../resource";

export function useNewsService(){

  function getNewsDetails(id: string){
    // send GET request to "http://localhost:8080/news-svc/details/[id][0]"
    return resource.get("getNewsDetails", {}, [id]);
  }

  return { getNewsDetails };
}

```
