import type { MetronomeConfig } from "./types";
const defaultConfig: MetronomeConfig = require("./metronome.config.js");

export class MetronomeConfigHandler {
  public config: MetronomeConfig;
  private ignoredRouteCache: { [key: string]: boolean } = {};
  private ignoredPathnameCache: { [key: string]: boolean } = {};

  constructor(config?: MetronomeConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  public getEndpoint(): string {
    return this.config.endpoint
      ? `${this.config.endpoint}/v4/process`
      : "https://v4.metrics.metronome.sh/v4/process";
  }

  public shouldIgnoreRoute(routeId: string): boolean {
    if (this.ignoredRouteCache[routeId]) {
      return this.ignoredRouteCache[routeId];
    }

    const isIgnored = !!this.config.ignoredRoutes?.some((ignoredRoute) => {
      const normalizedRouteId = routeId.replace(/^\/?routes\//, "");

      if (typeof ignoredRoute === "string") {
        const normalizedIgnoredRoute = ignoredRoute.replace(/^\/?routes\//, "");
        return normalizedIgnoredRoute === normalizedRouteId;
      }

      if (ignoredRoute instanceof RegExp) {
        return ignoredRoute.test(normalizedRouteId);
      }

      return false;
    });

    this.ignoredRouteCache[routeId] = isIgnored;

    return isIgnored;
  }

  public shouldIgnorePath(urlString?: string): boolean {
    if (!urlString) return false;

    if (urlString.includes("__metronome")) return true;

    if (this.ignoredPathnameCache[urlString]) {
      return this.ignoredPathnameCache[urlString];
    }

    const url = new URL(
      urlString,
      urlString.startsWith("http") ? undefined : "http://localhost"
    );

    const isIgnored = !!this.config.ignoredPathnames?.some(
      (ignoredPathname) => {
        if (typeof ignoredPathname === "string") {
          return ignoredPathname === url.pathname;
        }

        if (ignoredPathname instanceof RegExp) {
          return ignoredPathname.test(url.pathname);
        }

        return false;
      }
    );

    this.ignoredPathnameCache[urlString] = isIgnored;

    return isIgnored;
  }

  public shouldIgnoreMethod(method?: string): boolean {
    return (
      method?.toLowerCase() === "head" && Boolean(this.config.ignoreHeadMethod)
    );
  }

  public async shoudNotTrack(request: Request) {
    if (!this.config.doNotTrack) return false;

    try {
      return await this.config.doNotTrack?.(request);
    } catch (error) {
      // prettier-ignore
      console.log("[metronome] the doNotTrack function in your config file threw an error, ignoring...");
      console.error(error);
      return false;
    }
  }
}
