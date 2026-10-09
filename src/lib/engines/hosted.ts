import type { EngineCapabilities, EngineDescriptor, EngineOption } from "../engineTypes";
import { engineServerStatus, reportEngineServerFailure } from "../engineServer";
import { HostedEngine, type HostedEngineInfo } from "../hostedEngine";
import { DEFAULT_MAX_DEPTH, isSettableOption } from "../uciEngine";

/**
 * **The engine server's engines, as registry entries** ([`docs/engine.md`](../../../docs/engine.md) §8)
 * — one descriptor per engine the server lists while it is online
 * (`lib/engineServer.ts`), none otherwise.
 *
 * - The id is `hosted:<the server's id>` — `hosted:stockfish-19` — stable, so
 *   a preference and a played game can name it.
 * - **A descriptor is the same object for as long as the engine is the same**
 *   (its address and the server's description of it): a board rebuilds its
 *   engine when its descriptor changes (`useEngineModule`), so a re-check that
 *   finds the same engines must hand back the same descriptors.
 * - The capabilities are read off what the binary declared — a server engine
 *   is not a build this app ships, so nothing is assumed.
 */
export const HOSTED_ENGINE_PREFIX = "hosted:";

const has = (options: readonly EngineOption[], name: string) => options.some((option) => option.name === name);

const strengthOf = (options: readonly EngineOption[]): EngineCapabilities["strength"] => {
  const elo = has(options, "UCI_Elo") && has(options, "UCI_LimitStrength");
  const skill = has(options, "Skill Level");
  return elo && skill ? "both" : elo ? "elo" : "skill";
};

const descriptors = new Map<string, EngineDescriptor>();

const descriptorOf = (url: string, info: HostedEngineInfo): EngineDescriptor => {
  const key = `${url}\n${JSON.stringify(info)}`;
  let descriptor = descriptors.get(key);
  if (descriptor === undefined) {
    const threads = info.options.find((option) => option.name === "Threads");
    descriptor = {
      id: `${HOSTED_ENGINE_PREFIX}${info.id}`,
      name: info.name,
      version: info.version ?? "",
      server: url,
      capabilities: {
        maxDepth: Math.min(info.maxDepth, DEFAULT_MAX_DEPTH),
        strength: strengthOf(info.options),
        multiThread: isSettableOption(threads) && (threads?.max ?? 1) > 1,
      },
      create: () => new HostedEngine(url, info, { onFailure: reportEngineServerFailure }),
    };
    descriptors.set(key, descriptor);
  }
  return descriptor;
};

let cached: { status: ReturnType<typeof engineServerStatus>; list: readonly EngineDescriptor[] } | undefined;

/** The server's engines while it is online — the registry lists them after the shipped ones. */
export const hostedEngineDescriptors = (): readonly EngineDescriptor[] => {
  const status = engineServerStatus();
  if (cached?.status !== status) {
    cached = {
      status,
      list: status.state === "online" ? status.engines.map((info) => descriptorOf(status.url, info)) : [],
    };
  }
  return cached.list;
};
