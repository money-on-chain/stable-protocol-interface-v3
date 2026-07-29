import { useMemo } from "react";
import { checksumAddress } from "viem";

import {
    BUCKET_C0,
    MINT_BPRO_FEES_MOC,
    MINT_BPRO_FEES_RBTC,
    MINT_DOC_FEES_MOC,
    MINT_DOC_FEES_RBTC,
    REDEEM_BPRO_FEES_MOC,
    REDEEM_BPRO_FEES_RBTC,
    REDEEM_DOC_FEES_MOC,
    REDEEM_DOC_FEES_RBTC,
    VENDOR_ADDRESS_V1,
} from "../constants/v1";
import type { MultiCallInput } from "../types/hooks";
import type {
    ContractProtocolStatusV1Result,
    DContractsV1,
} from "../types/hooks-v1";
import { useMultiCall } from "./useMulticall";

/**
 * React hook that wraps useMultiCall to fetch v1 protocol status.
 * v1 has a single collateral bucket (BUCKET_C0) — unlike useContractProtocolStatus,
 * there is no CA-indexed loop here.
 */
export function useContractProtocolStatusV1(
    contracts?: DContractsV1,
    refetchInterval = 30_000
): ContractProtocolStatusV1Result {
    const callsRequests = useMemo((): MultiCallInput[] => {
        if (!contracts) return [];

        const { Moc, MoCState, MoCInrate, MoCVendors } = contracts;

        const callRequest: MultiCallInput[] = [
            {
                contract: MoCState,
                functionName: "getBitcoinPrice",
                args: [],
                resultType: "uint256",
                keys: ["getBitcoinPrice"],
            },
            {
                contract: MoCState,
                functionName: "state",
                args: [],
                resultType: "uint256",
                keys: ["state"],
            },
            {
                contract: MoCState,
                functionName: "globalCoverage",
                args: [],
                resultType: "uint256",
                keys: ["globalCoverage"],
            },
            {
                contract: MoCState,
                functionName: "absoluteMaxBPro",
                args: [],
                resultType: "uint256",
                keys: ["absoluteMaxBPro"],
            },
            {
                contract: MoCState,
                functionName: "absoluteMaxDoc",
                args: [],
                resultType: "uint256",
                keys: ["absoluteMaxDoc"],
            },
            {
                contract: MoCState,
                functionName: "freeDoc",
                args: [],
                resultType: "uint256",
                keys: ["freeDoc"],
            },
            {
                contract: MoCState,
                functionName: "blocksToSettlement",
                args: [],
                resultType: "uint256",
                keys: ["blocksToSettlement"],
            },
            {
                contract: MoCState,
                functionName: "getBitcoinMovingAverage",
                args: [],
                resultType: "uint256",
                keys: ["getBitcoinMovingAverage"],
            },
            {
                contract: MoCState,
                functionName: "bproTecPrice",
                args: [],
                resultType: "uint256",
                keys: ["bproTecPrice"],
            },
            {
                contract: MoCState,
                functionName: "bproUsdPrice",
                args: [],
                resultType: "uint256",
                keys: ["bproUsdPrice"],
            },
            {
                contract: MoCState,
                functionName: "getMoCPrice",
                args: [],
                resultType: "uint256",
                keys: ["mocUsdPrice"],
            },
            {
                contract: MoCState,
                functionName: "getBucketNBTC",
                args: [BUCKET_C0],
                resultType: "uint256",
                keys: ["getBucketNBTC"],
            },
            {
                contract: MoCState,
                functionName: "getBucketNDoc",
                args: [BUCKET_C0],
                resultType: "uint256",
                keys: ["getBucketNDoc"],
            },
            {
                contract: MoCState,
                functionName: "getBucketNBPro",
                args: [BUCKET_C0],
                resultType: "uint256",
                keys: ["getBucketNBPro"],
            },
            {
                contract: Moc,
                functionName: "paused",
                args: [],
                resultType: "bool",
                keys: ["paused"],
            },
            // Protocol-enforced gas price ceiling — v1 txs sent above this
            // revert on-chain. See backend/v1/moc-v1.ts's capped gas price.
            {
                contract: Moc,
                functionName: "maxGasPrice",
                args: [],
                resultType: "uint256",
                keys: ["maxGasPrice"],
            },
            {
                contract: MoCState,
                functionName: "cobj",
                args: [],
                resultType: "uint256",
                keys: ["cobj"],
            },
            {
                contract: MoCState,
                functionName: "leverage",
                args: [BUCKET_C0],
                resultType: "uint256",
                keys: ["b0Leverage"],
            },
            {
                contract: MoCState,
                functionName: "bproDiscountPrice",
                args: [],
                resultType: "uint256",
                keys: ["bproDiscountPrice"],
            },
        ];

        if (VENDOR_ADDRESS_V1) {
            const vendorAddress = checksumAddress(VENDOR_ADDRESS_V1);
            // v1's MoCVendors.sol exposes this as `getMarkup`, not `vendorMarkup`
            // (that's the v3 MocVendors.sol name — different contract/ABI).
            callRequest.push({
                contract: MoCVendors,
                functionName: "getMarkup",
                args: [vendorAddress],
                resultType: "uint256",
                keys: ["vendorMarkup"],
            });
        }

        callRequest.push(
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [MINT_BPRO_FEES_RBTC],
                resultType: "uint256",
                keys: ["mintBProFeesRbtc"],
            },
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [REDEEM_BPRO_FEES_RBTC],
                resultType: "uint256",
                keys: ["redeemBProFeesRbtc"],
            },
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [MINT_DOC_FEES_RBTC],
                resultType: "uint256",
                keys: ["mintDocFeesRbtc"],
            },
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [REDEEM_DOC_FEES_RBTC],
                resultType: "uint256",
                keys: ["redeemDocFeesRbtc"],
            },
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [MINT_BPRO_FEES_MOC],
                resultType: "uint256",
                keys: ["mintBProFeesMoc"],
            },
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [REDEEM_BPRO_FEES_MOC],
                resultType: "uint256",
                keys: ["redeemBProFeesMoc"],
            },
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [MINT_DOC_FEES_MOC],
                resultType: "uint256",
                keys: ["mintDocFeesMoc"],
            },
            {
                contract: MoCInrate,
                functionName: "commissionRatesByTxType",
                args: [REDEEM_DOC_FEES_MOC],
                resultType: "uint256",
                keys: ["redeemDocFeesMoc"],
            }
        );

        return callRequest;
    }, [contracts]);

    const multicallState = useMultiCall(callsRequests, {
        refetchInterval,
        enabled: callsRequests.length > 0,
        scopeKey: ["contractProtocolStatusV1"].join(":"),
    });

    return multicallState as unknown as ContractProtocolStatusV1Result;
}
