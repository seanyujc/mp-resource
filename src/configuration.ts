import { ISite, ISystem } from "./mp-resource";

export const autoConfigure = (
  sysEnvConfig: ISite<string, string>
): ISystem<string, string> | undefined => {
  const runtimes = sysEnvConfig.runtimes;
  const envConfig = sysEnvConfig.systems.find((el) => el.key === runtimes);
  if (envConfig) {
    envConfig.hosts.forEach((envHost) => {
      if (envHost.url) {
        const data = { ...sysEnvConfig.globalData, ...envConfig.data };
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            const reg = RegExp("{{(data.)*" + key + "}}");
            envHost.url = envHost.url.replace(reg, value);
          }
        }
      } else {
        envHost.url = "";
      }
      const globalConf = sysEnvConfig.hosts?.find(
        (host) => host.key === envHost.key
      );
      if (globalConf) {
        envHost.header = { ...globalConf.header, ...envHost.header };
      }
    });
    return envConfig;
  }
  return;
};
