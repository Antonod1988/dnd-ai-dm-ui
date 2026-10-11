/**
 * Public API of the game core.
 *
 * Adapters (web, CLI, MCP, telegram) should import from this barrel — or from
 * the explicitly allowlisted modules in scripts/check-core-boundary.ts — and
 * must not reach into core internals. The boundary is enforced by
 * `npm run check:core-boundary`.
 */

export * from "./types.js";

export { RpgGameService } from "./game-service.js";
export { SceneRunner } from "./narrative/scene-runner.js";

export { parseGameState, cloneGameState } from "./state/schema.js";
export {
  findWorldEntity,
  normalizeWorldEntityName,
  upsertWorldEntity,
  worldEntityId,
  worldEntityPromptLines,
  type WorldEntityUpsertInput
} from "./state/entity-registry.js";

export { formatCampaignJournal } from "./narrative/journal-view.js";
