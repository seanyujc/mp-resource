import { ISite, ISystem } from "./mp-resource";

export const autoConfigure = (
  sysEnvConfig: ISite<string, string>
): ISystem<string, string> | undefined => {
  const runtimes = sysEnvConfig.runtimes;
  const curConfig = sysEnvConfig.systems.find((el) => el.key === runtimes);
  if (curConfig) {
    curConfig.hosts.forEach((el) => {
      if (el.url) {
        for (const key in curConfig.data) {
          if (Object.prototype.hasOwnProperty.call(curConfig.data, key)) {
            const value = curConfig.data[key];
            el.url = el.url.replace("{{data." + key + "}}", value);
          }
          const globalConf = sysEnvConfig.hosts?.find((el) => el.key === key);
          if (globalConf) {
            el.header = { ...globalConf.header, ...el.header };
          }
        }
      } else {
        el.url = "";
      }
    });
    return curConfig;
  }
  return;
};
