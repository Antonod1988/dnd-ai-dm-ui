import type { GameState } from "../types.js";

export type SandboxWorld = NonNullable<GameState["sandboxWorld"]>;

export function appendSandboxServiceLog(world: SandboxWorld, message: string, tags: string[]): SandboxWorld {
  return {
    ...world,
    eventLog: [
      ...world.eventLog,
      {
        turn: world.calendar.turn,
        eventId: `service_${world.calendar.turn}_${world.eventLog.length + 1}`,
        message,
        tags
      }
    ]
  };
}
