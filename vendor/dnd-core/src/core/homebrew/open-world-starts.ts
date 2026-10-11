import type { CampaignClock, CampaignFront, GameLanguage, OpenWorldStartPitch, OpenWorldState, SandboxLocationKind } from "../types.js";

export const openWorldStartSceneId = "open_world_start";
export const openWorldPlaySceneId = "open_world_play";

export const openWorldToneIds = [
  "classic_adventure",
  "heroic_fantasy",
  "dark_adventure",
  "dark_mystery",
  "mystery_investigation",
  "political_intrigue",
  "urban_intrigue",
  "wilderness_survival",
  "fairy_tale_journey",
  "dungeon_delving",
  "classic_dungeon_crawl",
  "faction_conflict"
] as const;

export type OpenWorldToneId = (typeof openWorldToneIds)[number];

export type OpenWorldStartPlanInput = {
  settingName?: string;
  region?: string;
  location?: string;
  startLocationKind?: SandboxLocationKind;
  startLocationKindSource?: OpenWorldState["startLocationKindSource"];
  tone?: OpenWorldToneId | string;
  language?: GameLanguage;
  storyMode?: OpenWorldState["storyMode"];
  count?: number;
  seed?: string | number;
  allowPrivateSettingReferences?: boolean;
  /** @deprecated Ignored. Chat-first starts no longer accept prebuilt pitch cards. */
  authoredPitches?: OpenWorldStartPitch[];
};

export function planOpenWorldStarts(input: OpenWorldStartPlanInput = {}): OpenWorldState {
  const settingName = cleanText(input.settingName, "Original SRD frontier", 80);
  const region = cleanText(input.region, "unmapped borderlands", 80);
  const location = cleanText(input.location, "a road settlement", 80);
  const tone = normalizeTone(input.tone);
  const language = cleanLanguage(input.language);
  const privateSetting = Boolean(input.allowPrivateSettingReferences) || looksLikePrivateDndSetting(settingName, region, location);

  return {
    settingName,
    region,
    location,
    startLocationKind: input.startLocationKind,
    startLocationKindSource: input.startLocationKindSource,
    tone,
    language,
    storyMode: "chat_first",
    contentPolicy: privateSetting ? "private_user_setting" : "original_open_content",
    warnings: privateSetting
      ? [
          language === "ru"
            ? "Этот сеттинг или локация считаются пользовательским контекстом кампании. Пакет не поставляет защищенный лор, карты, персонажей или закрытый книжный текст."
            : "This setting/location is treated as user-provided private campaign context. The package must not ship protected setting lore, maps, characters or closed-book text."
        ]
      : [],
    pitches: []
  };
}

export function openWorldStoryHooksDisabled(openWorld: OpenWorldState | undefined): boolean {
  return Boolean(openWorld);
}

export function createOpenWorldClocks(language?: GameLanguage): Record<string, CampaignClock> {
  void language;
  return {};
}

export function createOpenWorldFronts(openWorld: OpenWorldState): CampaignFront[] {
  void openWorld;
  return [];
}

export function selectedOpenWorldPitch(openWorld: OpenWorldState | undefined): OpenWorldStartPitch | undefined {
  if (!openWorld?.selectedPitchId) {
    return undefined;
  }
  return openWorld.pitches.find((pitch) => pitch.id === openWorld.selectedPitchId);
}

function normalizeTone(value: string | undefined): OpenWorldToneId {
  const normalized = value?.trim();
  if (normalized && openWorldToneIds.includes(normalized as OpenWorldToneId)) {
    return normalized as OpenWorldToneId;
  }
  return "classic_adventure";
}

function cleanLanguage(language: GameLanguage | undefined): GameLanguage {
  return language ?? "English";
}

function cleanText(value: string | undefined, fallback: string, maxLength: number): string {
  const cleaned = value?.replace(/\s+/gu, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function looksLikePrivateDndSetting(...values: string[]): boolean {
  const joined = values.join(" ").toLowerCase();
  return /\b(faerun|forgotten realms|waterdeep|baldur'?s gate|icewind dale|eberron|krynn|dragonlance|ravnica|theros|greyhawk|planescape|spelljammer)\b/u.test(joined);
}
