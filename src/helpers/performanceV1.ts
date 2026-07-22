// System-status classification for moc-v1's Performance/Metrics page — ported
// from the legacy dapp's Cards/Metrics/SystemStatus (coverage-band thresholds
// taken from that dapp's projects/moc/settings.json: globalCoverage.{ok,warning,dangerous}).
// v1 has no BTCx bucket (removed from the UI already, see components/ExchangeV1),
// so the mint/redeem operation list below only covers DOC/BPro.
import type { ContractProtocolStatusV1Data } from "../types/hooks-v1";
import { divPrecision, mulPrecision, WAD } from "./precision";

export type SystemStatusBandV1 =
    | "unknown"
    | "full"
    | "partial"
    | "opportunity"
    | "protected"
    | "paused"
    | "settlement";

export type SystemStatusClassV1 =
    | "status-positive"
    | "status-neutral"
    | "status-negative";

export interface SystemOperationV1 {
    action: "mint" | "redeem";
    token: "TP_0" | "TC_0";
    available: boolean;
}

export interface SystemStatusResultV1 {
    band: SystemStatusBandV1;
    statusLabelClass: SystemStatusClassV1;
    titleKey: string;
    descriptionKey: string;
    operations: SystemOperationV1[];
}

// coverage ratios, WAD-scaled (e.g. 4x collateralization -> 4n * WAD)
const COVERAGE_WARNING = 2n * WAD;
const COVERAGE_DANGEROUS = (3n * WAD) / 2n; // 1.5x

const ALL_OPERATIONS: ReadonlyArray<Pick<SystemOperationV1, "action" | "token">> =
    [
        { action: "mint", token: "TP_0" },
        { action: "redeem", token: "TP_0" },
        { action: "mint", token: "TC_0" },
        { action: "redeem", token: "TC_0" },
    ];

const AVAILABILITY_BY_BAND: Record<SystemStatusBandV1, ReadonlySet<string>> = {
    unknown: new Set(),
    full: new Set(["mint:TP_0", "redeem:TP_0", "mint:TC_0", "redeem:TC_0"]),
    partial: new Set(["redeem:TP_0", "mint:TC_0"]),
    opportunity: new Set(["mint:TC_0"]),
    protected: new Set(),
    paused: new Set(),
    settlement: new Set(),
};

const CLASS_BY_BAND: Record<SystemStatusBandV1, SystemStatusClassV1> = {
    unknown: "status-neutral",
    full: "status-positive",
    partial: "status-neutral",
    opportunity: "status-negative",
    protected: "status-negative",
    paused: "status-negative",
    settlement: "status-negative",
};

const TITLE_KEY_BY_BAND: Record<SystemStatusBandV1, string> = {
    unknown: "performance.status.statusTitleUnavailable",
    full: "performance.status.statusTitleFull",
    partial: "performance.status.stuatusTitleWarning",
    opportunity: "performance.v1.statusTitleOpportunity",
    protected: "performance.status.statusTitleAlert",
    paused: "performance.status.statusTitlePaused",
    settlement: "performance.v1.statusTitleSettlement",
};

const DESCRIPTION_KEY_BY_BAND: Record<SystemStatusBandV1, string> = {
    unknown: "performance.status.statusDescreiptionUnavailable",
    full: "performance.status.statusDescriptionFull",
    partial: "performance.status.statusDescriptionWarning",
    opportunity: "performance.v1.statusDescriptionOpportunity",
    protected: "performance.status.statusDescriptionAlert",
    paused: "performance.status.statusDescriptionPaused",
    settlement: "performance.v1.statusDescriptionSettlement",
};

/**
 * cobj() (target coverage) adjusted by the ratio of the spot RBTC price to
 * its moving average — mirrors the legacy dapp's Metrics page formula:
 * `b0TargetCoverage * (bitcoinPrice / min(bitcoinPrice, bitcoinMovingAverage))`.
 */
export function adjustedTargetCoverageV1(
    status: Pick<
        ContractProtocolStatusV1Data,
        "cobj" | "getBitcoinPrice" | "getBitcoinMovingAverage"
    >
): bigint {
    const { cobj, getBitcoinPrice, getBitcoinMovingAverage } = status;
    if (getBitcoinMovingAverage <= 0n || getBitcoinPrice <= 0n) return cobj;

    const minPrice =
        getBitcoinPrice < getBitcoinMovingAverage
            ? getBitcoinPrice
            : getBitcoinMovingAverage;

    return mulPrecision(cobj, divPrecision(getBitcoinPrice, minPrice));
}

export function systemStatusV1(
    status: ContractProtocolStatusV1Data | undefined
): SystemStatusResultV1 {
    let band: SystemStatusBandV1 = "unknown";

    if (status) {
        if (status.paused) {
            band = "paused";
        } else if (status.blocksToSettlement <= 0n) {
            band = "settlement";
        } else {
            const coverage = status.globalCoverage;
            const target = adjustedTargetCoverageV1(status);

            if (coverage >= target) {
                band = "full";
            } else if (coverage >= COVERAGE_WARNING) {
                band = "partial";
            } else if (coverage >= COVERAGE_DANGEROUS) {
                band = "opportunity";
            } else {
                band = "protected";
            }
        }
    }

    const allowed = AVAILABILITY_BY_BAND[band];
    const operations: SystemOperationV1[] = ALL_OPERATIONS.map((op) => ({
        ...op,
        available: allowed.has(`${op.action}:${op.token}`),
    }));

    return {
        band,
        statusLabelClass: CLASS_BY_BAND[band],
        titleKey: TITLE_KEY_BY_BAND[band],
        descriptionKey: DESCRIPTION_KEY_BY_BAND[band],
        operations,
    };
}
