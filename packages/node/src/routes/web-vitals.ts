import type { ActionFunction } from "@remix-run/node";
import { decodeObject } from "../transport/encoder";
import { Span } from "../transport/span";
import DeviceDetector, { DeviceDetectorResult } from "device-detector-js";
import { sendSpan } from "../transport/exporter";
import { ContextWithMetronome, Meta } from "../types";
import { METRONOME_CONTEXT_KEY } from "../contants";

const getDeviceCategory = (result?: DeviceDetectorResult) => {
  if (!result?.device?.type) return "unknown";

  switch (result.device.type) {
    case "desktop":
      return "desktop";
    case "tablet":
    case "smartphone":
      return "mobile";
    default:
      return "unknown";
  }
};

type WebVitalObject = {
  metric: {
    name: string;
    value: number;
    id: string;
    delta: number;
  };
  connection: string;
  routeId: string;
  routePath: string;
  pathname: string;
};

export const action: ActionFunction = async ({ request, context }) => {
  const webVital = decodeObject<WebVitalObject>(await request.text());

  const {
    version = "",
    metronomeVersion = "",
    hash = "",
  } = (context as ContextWithMetronome)[METRONOME_CONTEXT_KEY] || {};

  if (!webVital) {
    // TODO check how we can handle this and send this failure to Metronome
    return new Response("", { status: 204 });
  }

  const userAgent = request.headers.get("User-Agent") || "";
  const detector = new DeviceDetector();
  const result = detector.parse(userAgent);
  const { connection, metric, routeId, routePath, pathname } = webVital;
  const { name, value, id, delta } = metric;

  const attributes = {
    "device.ua": userAgent,
    "device.client.name": result.client?.name || "unknown",
    "device.client.version": result.client?.version || "unknown",
    "device.category": getDeviceCategory(result),
    "device.type": result.device?.type || "unknown",
    "device.brand": result.device?.brand || "unknown",
    "device.connection": connection || "unknown",
    "remix.route.id": routeId,
    "remix.route.path": routePath,
    "remix.pathname": pathname,
    "vital.name": name,
    "vital.value": value,
    "vital.id": id,
    "vital.delta": delta,
    "app.version": version,
    "app.hash": hash,
    "metronome.version": metronomeVersion,
  };

  console.log({ attributes });

  // prettier-ignore
  const span = new Span("vital", { attributes, startTime: 0 }).end({ endTime: 0 });
  await sendSpan(span);

  return new Response("", { status: 204 });
};
