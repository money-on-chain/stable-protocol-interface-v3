import type { TokenConfig } from "../types/hooks";
import globalData from "./global.json";
import { resolveSettings } from "./resolveSettings";
import rawSettings from "./settings.json";

const globalTokens = globalData.tokens as Record<string, TokenConfig>;

export default resolveSettings(rawSettings, globalTokens);
