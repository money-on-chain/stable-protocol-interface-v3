import type { TokenConfig } from "../types/hooks"
import globalData from "./global.json"
import rawSettings from "./settings.json"
import { resolveSettings } from "./resolveSettings"

const globalTokens = globalData.tokens as Record<string, TokenConfig>

export default resolveSettings(rawSettings, globalTokens)
