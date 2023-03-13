# mp-resource
Access resource management for the service interface of wechat miniprogram, you can get two configuration lists

## Install

```
npm i mp-resource
```

## Usage

Create your own type definition file my-miniprogram.d.ts:

```ts
declare namespace MyMiniprogram {
  type EnvKeys = "DEV" | "SIT" | "UAT" | "PROD";
  type HostKeys = "base" | "news" | "sport";
  interface RestResponse<
    T extends string | number | Record<string, any> | ArrayBuffer =
      | string
      | number
      | Record<string, any>
      | ArrayBuffer
  > extends import("../miniprogram/node_modules/mp-resource").IRestResponse<T> {
    data: T;
    status: number;
    errorCode: number | null;
    errorMessage: string;
  }
  type Resource = import("../miniprogram/node_modules/mp-resource").Resource<
    RestResponse<any>,
    HostKeys,
    EnvData
  >;
  type IMyAppOption = import("../miniprogram/node_modules/mp-resource").IAppOption<EnvKeys>;
  interface IAppOption extends IMyAppOption {
    globalData: {
      resource: Resource
    };
  }
```

Create two configuration files.

```ts
// miniprogram/config/api-config.ts
import { ApiUrl } from "mp-resource";

export const apiUrl: ApiUrl<MyMiniprogram.HostKeys> = {
  get: {},
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
