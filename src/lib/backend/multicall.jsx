import BigNumber from "bignumber.js";
import { fromContractPrecisionDecimals } from "../../helpers/Formats";
import settings from "../../settings/settings.json";
import omoc from "../../settings/omoc/omoc.json";

const onErrorLeverage = () => {
    const value = new BigNumber(
        115792089237316200000000000000000000000000000000000000
    );
    console.warn("WARN: Leverage too high!");
    return { value, canOperate: true };
};

const onErrorProposal = () => {
    console.warn("Proposal not exist");
    return { value: null, canOperate: true };
};

const onErrorFluxCapacitor = () => {
    console.warn("Flux capacitor is disabled");
    return { value: null, canOperate: true };
};

const onErrorTP = () => {
    return { value: null, canOperate: true };
};

class Multicall {
    constructor(multicall, web3) {
        this.multicall = multicall;
        this.web3 = web3;
        this.calls = [];
        this.storage = {};
    }
    clear() {
        this.calls = [];
    }
    aggregate(
        contract,
        encodeABI,
        resultType,
        keyName,
        keyIndex,
        keySubIndex,
        onError
    ) {
        this.calls.push([
            contract.options.address,
            encodeABI,
            resultType,
            keyName,
            keyIndex,
            keySubIndex,
            onError,
        ]);
    }
    async tryBlockAndAggregate(blockNumber) {
        // Remove decode result parameter
        const cleanListMethods = this.calls.map((x) => [x[0], x[1]]);
        const multiCallResult = await this.multicall.methods
            .tryBlockAndAggregate(false, cleanListMethods)
            .call({}, blockNumber);

        let canOperate = true;

        const calls = this.calls;
        const storage = this.storage;
        const web3 = this.web3;

        storage["blockHeight"] = multiCallResult[0];

        multiCallResult.returnData.forEach(function (item, itemIndex) {
            let value;
            const resultType = calls[itemIndex][2];
            const keyName = calls[itemIndex][3];
            const keyIndex = calls[itemIndex][4];
            const keySubIndex = calls[itemIndex][5];
            const onError = calls[itemIndex][6];

            // ON success
            if (item.success) {
                if (typeof resultType === "string") {
                    value = web3.eth.abi.decodeParameter(
                        resultType,
                        item.returnData
                    );
                } else {
                    value = web3.eth.abi.decodeParameters(
                        resultType,
                        item.returnData
                    );
                }
            } else {
                if (onError !== undefined) {
                    const resError = onError();
                    value = resError["value"];
                    canOperate = resError["canOperate"];
                } else {
                    // Not Ok Error on calling
                    if (resultType === "uint256") {
                        value = "0";
                    } else if (resultType === "address") {
                        value = "0x";
                    } else if (resultType === "bool") {
                        value = false;
                    }
                    // If there are any problems can not operate
                    canOperate = false;
                    console.warn(
                        "WARN: Cannot operate! Index query:",
                        itemIndex
                    );
                    console.warn("keyName:", keyName)
                    console.warn("keyIndex:", keyIndex)
                    console.warn("keySubIndex:", keySubIndex)
                }
            }

            if (keyIndex != null && keySubIndex != null) {
                if (!storage[keyName]) {
                    if (keyName === parseInt(keyName, 10)) {
                        storage[keyName] = [];
                    } else {
                        storage[keyName] = {};
                    }
                }
                if (!storage[keyName][keyIndex]) {
                    if (keyIndex === parseInt(keyIndex, 10)) {
                        storage[keyName][keyIndex] = [];
                    } else {
                        storage[keyName][keyIndex] = {};
                    }
                }
                storage[keyName][keyIndex][keySubIndex] = value;
            } else if (keyIndex != null) {
                if (!storage[keyName]) {
                    if (keyName === parseInt(keyName, 10)) {
                        storage[keyName] = [];
                    } else {
                        storage[keyName] = {};
                    }
                }
                storage[keyName][keyIndex] = value;
            } else {
                storage[keyName] = value;
            }
        });

        storage["canOperate"] = canOperate;

        return storage;
    }
}

const contractStatus = async (web3, dContracts) => {
    if (!dContracts) return;

    const vendorAddress =
        `${import.meta.env.REACT_APP_ENVIRONMENT_VENDOR_ADDRESS}`.toLowerCase();
    const multicall = dContracts.contracts.multicall;
    const PP_COINBASE = dContracts.contracts.PP_COINBASE;
    const MocMultiCollateralGuard = dContracts.contracts.MocMultiCollateralGuard;

    // OMOC
    let iregistry;
    let stakingmachine;
    let delaymachine;
    let supporters;
    let votingmachine;
    let tg;
    let proposalCountVoting;

    if (typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY !== "undefined") {
        iregistry = dContracts.contracts.IRegistry;
        stakingmachine = dContracts.contracts.StakingMachine;
        delaymachine = dContracts.contracts.DelayMachine;
        supporters = dContracts.contracts.Supporters;
        votingmachine = dContracts.contracts.VotingMachine;
        tg = dContracts.contracts.TG;
        proposalCountVoting = Number(
            BigInt(await votingmachine.methods.getProposalCount().call())
        );
    }

    const multiCallRequest = new Multicall(multicall, web3);

    const currentBlockNumber =  await multicall.methods.getBlockNumber().call()
    let contractMocType
    let Moc
    let MocVendors
    let MocQueue
    let PP_FeeToken
    let FC_MAX_ABSOLUTE_OP_PROVIDER
    let FC_MAX_OP_DIFFERENCE_PROVIDER
    let PP_TP

    multiCallRequest.aggregate(
        PP_COINBASE,
        PP_COINBASE.methods.peek().encodeABI(),
        [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            },
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "PP_COINBASE"
    );

    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {

        contractMocType = settings.tokens.CA[ca].type
        Moc = dContracts.contracts.Moc[ca]
        MocVendors = dContracts.contracts.MocVendors[ca]
        MocQueue = dContracts.contracts.MocQueue[ca]
        PP_FeeToken = dContracts.contracts.PP_FeeToken[ca]
        FC_MAX_ABSOLUTE_OP_PROVIDER = dContracts.contracts.FC_MAX_ABSOLUTE_OP_PROVIDER[ca]
        FC_MAX_OP_DIFFERENCE_PROVIDER = dContracts.contracts.FC_MAX_OP_DIFFERENCE_PROVIDER[ca]

        multiCallRequest.aggregate(
            Moc,
            Moc.methods.protThrld().encodeABI(),
            "uint256",
            ca,
            "protThrld"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.liqThrld().encodeABI(),
            "uint256",
            ca,
            "liqThrld"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.liqEnabled().encodeABI(),
        //     "bool",
        //     ca,
        //     "liqEnabled"
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.liquidated().encodeABI(),
            "bool",
            ca,
            "liquidated"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.nACcb().encodeABI(),
            "uint256",
            ca,
            "nACcb"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.tcToken().encodeABI(),
        //     "address",
        //     ca,
        //     "tcToken"
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.nTCcb().encodeABI(),
            "uint256",
            ca,
            "nTCcb"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.successFee().encodeABI(),
        //     "uint256",
        //     ca,
        //     "successFee"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.appreciationFactor().encodeABI(),
        //     "uint256",
        //     ca,
        //     "appreciationFactor"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.feeRetainer().encodeABI(),
        //     "uint256",
        //     ca,
        //     "feeRetainer"
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.tcMintFee().encodeABI(),
            "uint256",
            ca,
            "tcMintFee"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.tcRedeemFee().encodeABI(),
            "uint256",
            ca,
            "tcRedeemFee"
        );
        /*multiCallRequest.aggregate(
            Moc,
            Moc.methods.swapTPforTPFee().encodeABI(),
            "uint256",
            ca,
            "swapTPforTPFee"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.swapTPforTCFee().encodeABI(),
            "uint256",
            ca,
            "swapTPforTCFee"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.swapTCforTPFee().encodeABI(),
            "uint256",
            ca,
            "swapTCforTPFee"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.redeemTCandTPFee().encodeABI(),
            "uint256",
            ca,
            "redeemTCandTPFee"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.mintTCandTPFee().encodeABI(),
            "uint256",
            ca,
            "mintTCandTPFee"
        );*/
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.mocFeeFlowAddress().encodeABI(),
        //     "address",
        //     ca,
        //     "mocFeeFlowAddress"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.mocAppreciationBeneficiaryAddress().encodeABI(),
        //     "address",
        //     ca,
        //     "mocAppreciationBeneficiaryAddress"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.isLiquidationReached().encodeABI(),
        //     "bool",
        //     ca,
        //     "isLiquidationReached"
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.getPTCac().encodeABI(),
            "uint256",
            ca,
            "getPTCac"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.getCglb().encodeABI(),
            "uint256",
            ca,
            "getCglb"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.getLckAC().encodeABI(),
        //     "uint256",
        //     ca,
        //     "getLckAC"
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.getTCAvailableToRedeem().encodeABI(),
            "uint256",
            ca,
            "getTCAvailableToRedeem"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.getTotalACavailable().encodeABI(),
        //     "uint256",
        //     ca,
        //     "getTotalACavailable"
        // );
        /*multiCallRequest.aggregate(
            Moc,
            Moc.methods.getLeverageTC().encodeABI(),
            "uint256",
            "getLeverageTC",
            null,
            null,
            onErrorLeverage
        );*/
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.nextEmaCalculation().encodeABI(),
        //     "uint256",
        //     ca,
        //     "nextEmaCalculation"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.emaCalculationTimeSpan().encodeABI(),
        //     "uint256",
        //     ca,
        //     "emaCalculationTimeSpan"
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.getCtargemaCA().encodeABI(),
            "uint256",
            ca,
            "getCtargemaCA"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.shouldCalculateEma().encodeABI(),
        //     "bool",
        //     ca,
        //     "shouldCalculateEma"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.settlementTimeSpan().encodeABI(),
        //     "uint256",
        //     ca,
        //     "settlementTimeSpan"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.nextSettlementTime().encodeABI(),
        //     "uint256",
        //     ca,
        //     "nextSettlementTime"
        // );
        // multiCallRequest.aggregate(
        //     MocVendors,
        //     MocVendors.methods.vendorsGuardianAddress().encodeABI(),
        //     "address",
        //     ca,
        //     "vendorGuardianAddress"
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.feeTokenPct().encodeABI(),
            "uint256",
            ca,
            "feeTokenPct"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.feeToken().encodeABI(),
            "address",
            ca,
            "feeToken"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.feeTokenPriceProvider().encodeABI(),
        //     "address",
        //     ca,
        //     "feeTokenPriceProvider"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.tcInterestCollectorAddress().encodeABI(),
        //     "address",
        //     ca,
        //     "tcInterestCollectorAddress"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.tcInterestRate().encodeABI(),
        //     "uint256",
        //     ca,
        //     "tcInterestRate"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.tcInterestPaymentTimeSpan().encodeABI(),
        //     "uint256",
        //     ca,
        //     "tcInterestPaymentTimeSpan"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.nextTCInterestPayment().encodeABI(),
        //     "uint256",
        //     ca,
        //     "nextTCInterestPayment"
        // );
        multiCallRequest.aggregate(
            PP_FeeToken,
            PP_FeeToken.methods.peek().encodeABI(),
            [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                },
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            ca,
            "PP_FeeToken"
        );
        multiCallRequest.aggregate(
            MocVendors,
            MocVendors.methods.vendorMarkup(vendorAddress).encodeABI(),
            "uint256",
            ca,
            "vendorMarkup"
        );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.maxAbsoluteOpProvider().encodeABI(),
        //     "address",
        //     ca,
        //     "maxAbsoluteOpProvider"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.maxOpDiffProvider().encodeABI(),
        //     "address",
        //     ca,
        //     "maxOpDiffProvider"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.decayTimeSpan().encodeABI(),
        //     "uint256",
        //     ca,
        //     "decayTimeSpan"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.absoluteAccumulator().encodeABI(),
        //     "uint256",
        //     ca,
        //     "absoluteAccumulator"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.differentialAccumulator().encodeABI(),
        //     "uint256",
        //     ca,
        //     "differentialAccumulator"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.lastOperationTimeStamp().encodeABI(),
        //     "uint256",
        //     ca,
        //     "lastOperationTimeStamp"
        // );
        // multiCallRequest.aggregate(
        //     Moc,
        //     Moc.methods.qACLockedInPending().encodeABI(),
        //     "uint256",
        //     ca,
        //     "qACLockedInPending"
        // );
        // multiCallRequest.aggregate(
        //     MocQueue,
        //     MocQueue.methods.operIdCount().encodeABI(),
        //     "uint256",
        //     ca,
        //     "operIdCount"
        // );
        // multiCallRequest.aggregate(
        //     MocQueue,
        //     MocQueue.methods.firstOperId().encodeABI(),
        //     "uint256",
        //     ca,
        //     "firstOperId"
        // );
        // multiCallRequest.aggregate(
        //     MocQueue,
        //     MocQueue.methods.minOperWaitingBlk().encodeABI(),
        //     "uint256",
        //     ca,
        //     "minOperWaitingBlk"
        // );
        // multiCallRequest.aggregate(
        //     MocQueue,
        //     MocQueue.methods.maxOperWaitingBlk().encodeABI(),
        //     "uint256",
        //     ca,
        //     "maxOperWaitingBlk"
        // );
        // multiCallRequest.aggregate(
        //     MocQueue,
        //     MocQueue.methods.isEmpty().encodeABI(),
        //     "bool",
        //     ca,
        //     "isEmpty"
        // );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(1).encodeABI(),
            "uint256",
            ca,
            "tcMintExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(2).encodeABI(),
            "uint256",
            ca,
            "tcRedeemExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(3).encodeABI(),
            "uint256",
            ca,
            "tpMintExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(4).encodeABI(),
            "uint256",
            ca,
            "tpRedeemExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(9).encodeABI(),
            "uint256",
            ca,
            "swapTPforTPExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(8).encodeABI(),
            "uint256",
            ca,
            "swapTPforTCExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(7).encodeABI(),
            "uint256",
            ca,
            "swapTCforTPExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(6).encodeABI(),
            "uint256",
            ca,
            "redeemTCandTPExecCost"
        );
        multiCallRequest.aggregate(
            MocQueue,
            MocQueue.methods.execCost(5).encodeABI(),
            "uint256",
            ca,
            "mintTCandTPExecCost"
        );
        // multiCallRequest.aggregate(
        //     FC_MAX_ABSOLUTE_OP_PROVIDER,
        //     FC_MAX_ABSOLUTE_OP_PROVIDER.methods.peek().encodeABI(),
        //     [
        //         {
        //             "internalType": "bytes32",
        //             "name": "",
        //             "type": "bytes32"
        //         },
        //         {
        //             "internalType": "bool",
        //             "name": "",
        //             "type": "bool"
        //         }
        //     ],
        //     ca,
        //     "FC_MAX_ABSOLUTE_OP",
        //     null,
        //     onErrorFluxCapacitor
        // );
        // multiCallRequest.aggregate(
        //     FC_MAX_OP_DIFFERENCE_PROVIDER,
        //     FC_MAX_OP_DIFFERENCE_PROVIDER.methods.peek().encodeABI(),
        //     [
        //         {
        //             "internalType": "bytes32",
        //             "name": "",
        //             "type": "bytes32"
        //         },
        //         {
        //             "internalType": "bool",
        //             "name": "",
        //             "type": "bool"
        //         }
        //     ],
        //     ca,
        //     "FC_MAX_OP_DIFFERENCE",
        //     null,
        //     onErrorFluxCapacitor
        // );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.maxQACToMintTP(currentBlockNumber).encodeABI(),
            "uint256",
            ca,
            "maxQACToMintTP"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.maxQACToRedeemTP(currentBlockNumber).encodeABI(),
            "uint256",
            ca,
            "maxQACToRedeemTP"
        );
        multiCallRequest.aggregate(
            Moc,
            Moc.methods.paused().encodeABI(),
            "bool",
            ca,
            "paused"
        );
        multiCallRequest.aggregate(
            MocMultiCollateralGuard,
            MocMultiCollateralGuard.methods.getRealTCAvailableToRedeem(Moc.options.address).encodeABI(),
            "uint256",
            ca,
            "getRealTCAvailableToRedeem"
        );
        // // only on coinbase mode
        // if (contractMocType === "coinbase") {
        //     multiCallRequest.aggregate(
        //         Moc,
        //         Moc.methods.transferMaxGas().encodeABI(),
        //         "uint256",
        //         ca,
        //         "transferMaxGas"
        //     );
        //     multiCallRequest.aggregate(
        //         Moc,
        //         Moc.methods.coinbaseFailedTransferFallback().encodeABI(),
        //         "address",
        //         ca,
        //         "coinbaseFailedTransferFallback"
        //     );
        // }

        let tpAddress;
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
            tpAddress = dContracts.contracts.TP[tp].options.address;
            PP_TP = dContracts.contracts.PP_TP[ca][tp];

            multiCallRequest.aggregate(
                PP_TP,
                PP_TP.methods.peek().encodeABI(),
                [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                ca,
                "PP_TP",
                tp
            );
            multiCallRequest.aggregate(
                Moc,
                Moc.methods.tpMintFees(tpAddress).encodeABI(),
                "uint256",
                ca,
                "tpMintFees",
                tp
            );
            multiCallRequest.aggregate(
                Moc,
                Moc.methods.tpRedeemFees(tpAddress).encodeABI(),
                "uint256",
                ca,
                "tpRedeemFees",
                tp
            );
            multiCallRequest.aggregate(
                Moc,
                Moc.methods.tpCtarg(tp).encodeABI(),
                "uint256",
                ca,
                "tpCtarg",
                tp
            );
            multiCallRequest.aggregate(
                Moc,
                Moc.methods.pegContainer(tp).encodeABI(),
                "uint256",
                ca,
                "pegContainer",
                tp
            );
            // multiCallRequest.aggregate(
            //     Moc,
            //     Moc.methods.getPACtp(tpAddress).encodeABI(),
            //     "uint256",
            //     ca,
            //     "getPACtp",
            //     tp
            // );
            multiCallRequest.aggregate(
                Moc,
                Moc.methods.getTPAvailableToMint(tpAddress).encodeABI(),
                "int256",
                ca,
                "getTPAvailableToMint",
                tp
            );
            multiCallRequest.aggregate(
                Moc,
                Moc.methods.tpEma(tp).encodeABI(),
                "uint256",
                ca,
                "tpEma",
                tp
            );
            multiCallRequest.aggregate(
                MocMultiCollateralGuard,
                MocMultiCollateralGuard.methods.getRealTPAvailableToMint(Moc.options.address, tpAddress).encodeABI(),
                "uint256",
                ca,
                "getRealTPAvailableToMint",
                tp
            );
        }

    }
    // multiCallRequest.aggregate(
    //     MocMultiCollateralGuard,
    //     MocMultiCollateralGuard.methods.maxOperPerBatch().encodeABI(),
    //     "uint256",
    //     "maxOperPerBatch"
    // );
    // multiCallRequest.aggregate(
    //     MocMultiCollateralGuard,
    //     MocMultiCollateralGuard.methods.getCombinedCglb().encodeABI(),
    //     "uint256",
    //     "getCombinedCglb"
    // );
    // multiCallRequest.aggregate(
    //     MocMultiCollateralGuard,
    //     MocMultiCollateralGuard.methods.getCombinedCtargemaCA().encodeABI(),
    //     "uint256",
    //     "getCombinedCtargemaCA"
    // );
    /*
    multiCallRequest.aggregate(
        MocMultiCollateralGuard,
        MocMultiCollateralGuard.methods.getLastPublicationBlock(true).encodeABI(),
        "uint256",
        "getLastPublicationBlock"
    );*/

    // OMOC
    if (typeof iregistry !== "undefined") {
        multiCallRequest.aggregate(
            stakingmachine,
            stakingmachine.methods.getWithdrawLockTime().encodeABI(),
            "uint256",
            "stakingmachine",
            "getWithdrawLockTime"
        );
        multiCallRequest.aggregate(
            stakingmachine,
            stakingmachine.methods.getSupporters().encodeABI(),
            "address",
            "stakingmachine",
            "getSupporters"
        );
        multiCallRequest.aggregate(
            stakingmachine,
            stakingmachine.methods.getOracleManager().encodeABI(),
            "address",
            "stakingmachine",
            "getOracleManager"
        );
        multiCallRequest.aggregate(
            stakingmachine,
            stakingmachine.methods.getDelayMachine().encodeABI(),
            "address",
            "stakingmachine",
            "getDelayMachine"
        );
        multiCallRequest.aggregate(
            delaymachine,
            delaymachine.methods.getLastId().encodeABI(),
            "uint256",
            "delaymachine",
            "getLastId"
        );
        multiCallRequest.aggregate(
            delaymachine,
            delaymachine.methods.getSource().encodeABI(),
            "address",
            "delaymachine",
            "getSource"
        );
        multiCallRequest.aggregate(
            supporters,
            supporters.methods.isReadyToDistribute().encodeABI(),
            "bool",
            "supporters",
            "isReadyToDistribute"
        );
        multiCallRequest.aggregate(
            supporters,
            supporters.methods.mocToken().encodeABI(),
            "address",
            "supporters",
            "mocToken"
        );
        multiCallRequest.aggregate(
            supporters,
            supporters.methods.period().encodeABI(),
            "uint256",
            "supporters",
            "period"
        );
        multiCallRequest.aggregate(
            supporters,
            supporters.methods.totalMoc().encodeABI(),
            "uint256",
            "supporters",
            "totalMoc"
        );
        multiCallRequest.aggregate(
            supporters,
            supporters.methods.totalToken().encodeABI(),
            "uint256",
            "supporters",
            "totalToken"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.getState().encodeABI(),
            "uint256",
            "votingmachine",
            "getState"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.getVotingRound().encodeABI(),
            "uint256",
            "votingmachine",
            "getVotingRound"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.getVoteInfo().encodeABI(),
            [
                { type: "address", name: "winnerProposal" },
                { type: "uint256", name: "inFavorVotes" },
                { type: "uint256", name: "againstVotes" },
            ],
            "votingmachine",
            "getVoteInfo"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.readyToPreVoteStep().encodeABI(),
            "uint256",
            "votingmachine",
            "readyToPreVoteStep"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.readyToVoteStep().encodeABI(),
            "uint256",
            "votingmachine",
            "readyToVoteStep"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.getProposalCount().encodeABI(),
            "uint256",
            "votingmachine",
            "getProposalCount"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.getVotingData().encodeABI(),
            [
                { type: "address", name: "winnerProposal" },
                { type: "uint256", name: "inFavorVotes" },
                { type: "uint256", name: "againstVotes" },
                { type: "uint256", name: "votingExpirationTime" },
            ],
            "votingmachine",
            "getVotingData"
        );
        multiCallRequest.aggregate(
            tg,
            tg.methods.totalSupply().encodeABI(),
            "uint256",
            "votingmachine",
            "totalSupply"
        );

        // Proposals
        let indexProp;
        for (let i = 1; i < 30; i++) {
            if (proposalCountVoting - i >= 0) {
                indexProp = proposalCountVoting - i;
                multiCallRequest.aggregate(
                    votingmachine,
                    votingmachine.methods
                        .getProposalByIndex(indexProp)
                        .encodeABI(),
                    [
                        { type: "address", name: "proposalAddress" },
                        { type: "uint256", name: "votingRound" },
                        { type: "uint256", name: "votes" },
                        { type: "uint256", name: "expirationTimeStamp" },
                    ],
                    "votingmachine",
                    "getProposalByIndex",
                    indexProp,
                    onErrorProposal
                );
            }
        }

        // OMOC REGISTRY CONSTANT
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(omoc.RegistryConstants.MOC_VOTING_MACHINE_MIN_STAKE)
                .encodeABI(),
            "uint256",
            "votingmachine",
            "MIN_STAKE"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants
                        .MOC_VOTING_MACHINE_PRE_VOTE_EXPIRATION_TIME_DELTA
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "PRE_VOTE_EXPIRATION_TIME_DELTA"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants.MOC_VOTING_MACHINE_MAX_PRE_PROPOSALS
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "MAX_PRE_PROPOSALS"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants
                        .MOC_VOTING_MACHINE_PRE_VOTE_MIN_PCT_TO_WIN
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "PRE_VOTE_MIN_PCT_TO_WIN"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants
                        .MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_VETO
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "VOTE_MIN_PCT_TO_VETO"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants
                        .MOC_VOTING_MACHINE_VOTE_MIN_PCT_FOR_QUORUM
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "MIN_PCT_FOR_QUORUM"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants
                        .MOC_VOTING_MACHINE_VOTE_MIN_PCT_TO_ACCEPT
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "VOTE_MIN_PCT_TO_ACCEPT"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants.MOC_VOTING_MACHINE_PCT_PRECISION
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "PCT_PRECISION"
        );
        multiCallRequest.aggregate(
            iregistry,
            iregistry.methods
                .getUint(
                    omoc.RegistryConstants.MOC_VOTING_MACHINE_VOTING_TIME_DELTA
                )
                .encodeABI(),
            "uint256",
            "votingmachine",
            "VOTING_TIME_DELTA"
        );
    }

    let PP_CA;
    let CA;
    let countRC20 = 0
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        PP_CA = dContracts.contracts.PP_CA[ca];
        Moc = dContracts.contracts.Moc[ca];
        contractMocType = settings.tokens.CA[ca].type

        if (contractMocType === "coinbase") {
            multiCallRequest.aggregate(
                multicall,
                multicall.methods
                    .getEthBalance(Moc.options.address)
                    .encodeABI(),
                "uint256",
                ca,
                "getACBalance"
            );
        } else {
            CA = dContracts.contracts.CA[countRC20];
            multiCallRequest.aggregate(
                CA,
                CA.methods.balanceOf(Moc.options.address).encodeABI(),
                "uint256",
                ca,
                "getACBalance"
            );
            countRC20++;
        }
        multiCallRequest.aggregate(
            PP_CA,
            PP_CA.methods.peek().encodeABI(),
            [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                },
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            ca,
            "PP_CA"
        );
    }

    const status = await multiCallRequest.tryBlockAndAggregate();
    console.log(`Reading contract status: OK!. Block: ${status.blockHeight}`);

    let getCtargemaCA;
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        // If calcCtargemaCA is a huge number cannot operate
        getCtargemaCA = new BigNumber(
            fromContractPrecisionDecimals(status[ca].getCtargemaCA, 18)
        );
        if (getCtargemaCA.gt(100000000)) {
            status.canOperate = false;
            break;
        }
    }


    // History Price (24hs ago)
    const d24BlockHeights = status.blockHeight - BigInt(2880);
    const multiCallRequestHistory = new Multicall(multicall, web3);

    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        Moc = dContracts.contracts.Moc[ca];
        multiCallRequestHistory.aggregate(
            Moc,
            Moc.methods.getPTCac().encodeABI(),
            "uint256",
            ca,
            "getPTCac"
        );
        multiCallRequestHistory.aggregate(
            PP_CA,
            PP_CA.methods.peek().encodeABI(),
            [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                },
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            ca,
            "PP_CA"
        );
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
            PP_TP = dContracts.contracts.PP_TP[ca][tp];
            multiCallRequestHistory.aggregate(
                PP_TP,
                PP_TP.methods.peek().encodeABI(),
                [
                    {
                        "internalType": "bytes32",
                        "name": "",
                        "type": "bytes32"
                    },
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                ca,
                "PP_TP",
                tp
            );
        }
    }
    multiCallRequestHistory.aggregate(
        PP_COINBASE,
        PP_COINBASE.methods.peek().encodeABI(),
        [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            },
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "PP_COINBASE"
    );
    multiCallRequestHistory.aggregate(
        PP_FeeToken,
        PP_FeeToken.methods.peek().encodeABI(),
        [
            {
                "internalType": "bytes32",
                "name": "",
                "type": "bytes32"
            },
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "PP_FeeToken"
    );

    const historic =
        await multiCallRequestHistory.tryBlockAndAggregate(d24BlockHeights);
    console.log(`Reading contract status HISTORY: OK!. Block: ${historic.blockHeight}`);
    historic.blockHeight = d24BlockHeights;
    status.canHistoric = historic.canOperate;
    status.historic = historic;

    return status;
};

const userBalance = async (web3, dContracts, userAddress) => {
    if (!dContracts) return;

    const multicall = dContracts.contracts.multicall;

    let stakingmachine;
    let delaymachine;
    let tg;
    let vestingmachine;
    let vestingfactory;
    let votingmachine;
    let IncentiveV2;

    if (typeof import.meta.env.REACT_APP_CONTRACT_IREGISTRY !== "undefined") {
        stakingmachine = dContracts.contracts.StakingMachine;
        delaymachine = dContracts.contracts.DelayMachine;
        tg = dContracts.contracts.TG;
        vestingmachine = dContracts.contracts.VestingMachine;
        vestingfactory = dContracts.contracts.VestingFactory;
        IncentiveV2 = dContracts.contracts.IncentiveV2;
        votingmachine = dContracts.contracts.VotingMachine;
    }

    const multiCallRequest = new Multicall(multicall, web3);
    multiCallRequest.aggregate(
        multicall,
        multicall.methods.getEthBalance(userAddress).encodeABI(),
        "uint256",
        "coinbase"
    );

    let Moc
    let CollateralToken
    let FeeToken
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        Moc = dContracts.contracts.Moc[ca]
        CollateralToken = dContracts.contracts.CollateralToken[ca]
        FeeToken = dContracts.contracts.FeeToken[ca]

        multiCallRequest.aggregate(
            CollateralToken,
            CollateralToken.methods.balanceOf(userAddress).encodeABI(),
            "uint256",
            ca,
            "TC",
            "balance"
        );
        multiCallRequest.aggregate(
            CollateralToken,
            CollateralToken.methods
                .allowance(userAddress, Moc.options.address)
                .encodeABI(),
            "uint256",
            ca,
            "TC",
            "allowance"
        );
        multiCallRequest.aggregate(
            FeeToken,
            FeeToken.methods.balanceOf(userAddress).encodeABI(),
            "uint256",
            ca,
            "FeeToken",
            "balance"
        );
        multiCallRequest.aggregate(
            FeeToken,
            FeeToken.methods
                .allowance(userAddress, Moc.options.address)
                .encodeABI(),
            "uint256",
            ca,
            "FeeToken",
            "allowance"
        );
    }

    if (typeof stakingmachine !== "undefined") {
        // OMOC
        multiCallRequest.aggregate(
            stakingmachine,
            stakingmachine.methods.getBalance(userAddress).encodeABI(),
            "uint256",
            "stakingmachine",
            "getBalance"
        );
        multiCallRequest.aggregate(
            stakingmachine,
            stakingmachine.methods.getLockedBalance(userAddress).encodeABI(),
            "uint256",
            "stakingmachine",
            "getLockedBalance"
        );
        multiCallRequest.aggregate(
            stakingmachine,
            stakingmachine.methods.getLockingInfo(userAddress).encodeABI(),
            [
                { type: "uint256", name: "amount" },
                { type: "uint256", name: "untilTimestamp" },
            ],
            "stakingmachine",
            "getLockingInfo"
        );
        multiCallRequest.aggregate(
            delaymachine,
            delaymachine.methods.getTransactions(userAddress).encodeABI(),
            [
                { type: "uint256[]", name: "ids" },
                { type: "uint256[]", name: "amounts" },
                { type: "uint256[]", name: "expirations" },
            ],
            "delaymachine",
            "getTransactions"
        );
        multiCallRequest.aggregate(
            delaymachine,
            delaymachine.methods.getBalance(userAddress).encodeABI(),
            "uint256",
            "delaymachine",
            "getBalance"
        );
        multiCallRequest.aggregate(
            tg,
            tg.methods.balanceOf(userAddress).encodeABI(),
            "uint256",
            "TG",
            "balance"
        );
        multiCallRequest.aggregate(
            tg,
            tg.methods
                .allowance(userAddress, stakingmachine.options.address)
                .encodeABI(),
            "uint256",
            "stakingmachine",
            "tgAllowance"
        );
        multiCallRequest.aggregate(
            votingmachine,
            votingmachine.methods.getUserVote(userAddress).encodeABI(),
            [
                { type: "address", name: "voteAddress" },
                { type: "uint256", name: "voteRound" },
            ],
            "votingmachine",
            "getUserVote"
        );

        if (typeof vestingmachine !== "undefined") {
            multiCallRequest.aggregate(
                vestingfactory,
                vestingfactory.methods.isTGEConfigured().encodeABI(),
                "bool",
                "vestingfactory",
                "isTGEConfigured"
            );
            multiCallRequest.aggregate(
                vestingfactory,
                vestingfactory.methods.getTGETimestamp().encodeABI(),
                "uint256",
                "vestingfactory",
                "getTGETimestamp"
            );
            multiCallRequest.aggregate(
                vestingmachine,
                vestingmachine.methods.getParameters().encodeABI(),
                [
                    { type: "uint256[]", name: "percentages" },
                    { type: "uint256[]", name: "timeDeltas" },
                ],
                "vestingmachine",
                "getParameters"
            );
            multiCallRequest.aggregate(
                vestingmachine,
                vestingmachine.methods.getHolder().encodeABI(),
                "address",
                "vestingmachine",
                "getHolder"
            );
            multiCallRequest.aggregate(
                vestingmachine,
                vestingmachine.methods.getLocked().encodeABI(),
                "uint256",
                "vestingmachine",
                "getLocked"
            );
            multiCallRequest.aggregate(
                vestingmachine,
                vestingmachine.methods.getAvailable().encodeABI(),
                "uint256",
                "vestingmachine",
                "getAvailable"
            );
            multiCallRequest.aggregate(
                vestingmachine,
                vestingmachine.methods.isVerified().encodeABI(),
                "bool",
                "vestingmachine",
                "isVerified"
            );
            multiCallRequest.aggregate(
                vestingmachine,
                vestingmachine.methods.getTotal().encodeABI(),
                "uint256",
                "vestingmachine",
                "getTotal"
            );
            multiCallRequest.aggregate(
                tg,
                tg.methods
                    .balanceOf(vestingmachine.options.address)
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "tgBalance"
            );
            multiCallRequest.aggregate(
                tg,
                tg.methods
                    .allowance(userAddress, vestingmachine.options.address)
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "tgAllowance"
            );
            multiCallRequest.aggregate(
                stakingmachine,
                stakingmachine.methods
                    .getBalance(vestingmachine.options.address)
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "staking",
                "balance"
            );
            multiCallRequest.aggregate(
                tg,
                tg.methods
                    .allowance(
                        vestingmachine.options.address,
                        stakingmachine.options.address
                    )
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "staking",
                "allowance"
            );
            multiCallRequest.aggregate(
                delaymachine,
                delaymachine.methods
                    .getBalance(vestingmachine.options.address)
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "delay",
                "balance"
            );
            multiCallRequest.aggregate(
                tg,
                tg.methods
                    .allowance(
                        vestingmachine.options.address,
                        delaymachine.options.address
                    )
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "delay",
                "allowance"
            );
            multiCallRequest.aggregate(
                stakingmachine,
                stakingmachine.methods
                    .getBalance(vestingmachine.options.address)
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "staking",
                "getBalance"
            );
            multiCallRequest.aggregate(
                stakingmachine,
                stakingmachine.methods
                    .getLockedBalance(vestingmachine.options.address)
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "staking",
                "getLockedBalance"
            );
            multiCallRequest.aggregate(
                stakingmachine,
                stakingmachine.methods
                    .getLockingInfo(vestingmachine.options.address)
                    .encodeABI(),
                [
                    { type: "uint256", name: "amount" },
                    { type: "uint256", name: "untilTimestamp" },
                ],
                "vestingmachine",
                "staking",
                "getLockingInfo"
            );
            multiCallRequest.aggregate(
                delaymachine,
                delaymachine.methods
                    .getTransactions(vestingmachine.options.address)
                    .encodeABI(),
                [
                    { type: "uint256[]", name: "ids" },
                    { type: "uint256[]", name: "amounts" },
                    { type: "uint256[]", name: "expirations" },
                ],
                "vestingmachine",
                "delay",
                "getTransactions"
            );
            multiCallRequest.aggregate(
                delaymachine,
                delaymachine.methods
                    .getBalance(vestingmachine.options.address)
                    .encodeABI(),
                "uint256",
                "vestingmachine",
                "delay",
                "getBalance"
            );
        }

        // Incentive V2
        if (typeof IncentiveV2 !== "undefined") {
            multiCallRequest.aggregate(
                tg,
                tg.methods.balanceOf(IncentiveV2.options.address).encodeABI(),
                "uint256",
                "incentiveV2",
                "contractBalance"
            );
            multiCallRequest.aggregate(
                IncentiveV2,
                IncentiveV2.methods.get_balance(userAddress).encodeABI(),
                "uint256",
                "incentiveV2",
                "userBalance"
            );
        }
    }

    let TP;
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
            TP = dContracts.contracts.TP[tp];
            Moc = dContracts.contracts.Moc[ca]
            multiCallRequest.aggregate(
                TP,
                TP.methods.balanceOf(userAddress).encodeABI(),
                "uint256",
                ca,
                "TP_balance",
                tp
            );
            multiCallRequest.aggregate(
                TP,
                TP.methods
                    .allowance(userAddress, Moc.options.address)
                    .encodeABI(),
                "uint256",
                ca,
                "TP_allowance",
                tp
            );
        }
    }

    let CA;
    let contractMocType
    let countRC20 = 0

    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        // RC-20 collateral Only
        contractMocType = settings.tokens.CA[ca].type
        if (contractMocType !== 'coinbase')  {

            Moc = dContracts.contracts.Moc[ca];
            CA = dContracts.contracts.CA[countRC20];
            multiCallRequest.aggregate(
                CA,
                CA.methods.balanceOf(userAddress).encodeABI(),
                "uint256",
                ca,
                "CA_balance"
            );
            multiCallRequest.aggregate(
                CA,
                CA.methods
                    .allowance(userAddress, Moc.options.address)
                    .encodeABI(),
                "uint256",
                ca,
                "CA_allowance"
            );
            countRC20++
        }
    }

    // Token migrator
    if (dContracts.contracts.tp_legacy) {
        const tpLegacy = dContracts.contracts.tp_legacy;
        const tokenMigrator = dContracts.contracts.token_migrator;
        multiCallRequest.aggregate(
            tpLegacy,
            tpLegacy.methods.balanceOf(userAddress).encodeABI(),
            "uint256",
            "tpLegacy",
            "balance"
        );
        multiCallRequest.aggregate(
            tpLegacy,
            tpLegacy.methods
                .allowance(userAddress, tokenMigrator.options.address)
                .encodeABI(),
            "uint256",
            "tpLegacy",
            "allowance"
        );
    }

    const userBalance = await multiCallRequest.tryBlockAndAggregate();
    console.log(`Reading user balance: OK. Block: ${userBalance.blockHeight}`);

    let TPca = [];
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        let TPtp = [];
        for (let tp = 0; tp < settings.tokens.TP.length; tp++) {
            TPtp.push({
                balance: userBalance[ca]["TP_balance"][tp],
                allowance: userBalance[ca]["TP_allowance"][tp],
            });
        }
        TPca.push(TPtp)
    }
    userBalance.TP = TPca;

    CA = [];
    for (let ca = 0; ca < settings.tokens.CA.length; ca++) {
        contractMocType = settings.tokens.CA[ca].type
        if (contractMocType === 'coinbase')  {
            CA.push({
                balance: userBalance["coinbase"],
                allowance: userBalance["coinbase"],
            });

        } else {
            CA.push({
                balance: userBalance[ca]["CA_balance"],
                allowance: userBalance[ca]["CA_allowance"],
            });
        }
    }
    userBalance.CA = CA;

    // Vesting machine added address
    if (typeof vestingmachine !== "undefined") {
        userBalance.vestingmachine.address = vestingmachine.options.address;
    }

    return userBalance;
};

const registryAddresses = async (web3, dContracts) => {
    const multicall = dContracts.contracts.multicall;
    const iregistry = dContracts.contracts.IRegistry;

    const multiCallRequest = new Multicall(multicall, web3);
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.MOC_STAKING_MACHINE)
            .encodeABI(),
        "address",
        "MOC_STAKING_MACHINE"
    );
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.SUPPORTERS_ADDR)
            .encodeABI(),
        "address",
        "SUPPORTERS_ADDR"
    );
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.MOC_DELAY_MACHINE)
            .encodeABI(),
        "address",
        "MOC_DELAY_MACHINE"
    );
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.MOC_VESTING_MACHINE)
            .encodeABI(),
        "address",
        "MOC_VESTING_MACHINE"
    );
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.MOC_VOTING_MACHINE)
            .encodeABI(),
        "address",
        "MOC_VOTING_MACHINE"
    );
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.MOC_PRICE_PROVIDER_REGISTRY)
            .encodeABI(),
        "address",
        "MOC_PRICE_PROVIDER_REGISTRY"
    );
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.ORACLE_MANAGER_ADDR)
            .encodeABI(),
        "address",
        "ORACLE_MANAGER_ADDR"
    );
    multiCallRequest.aggregate(
        iregistry,
        iregistry.methods
            .getAddress(omoc.RegistryConstants.MOC_TOKEN)
            .encodeABI(),
        "address",
        "MOC_TOKEN"
    );

    return await multiCallRequest.tryBlockAndAggregate();
};

const mocAddresses = async (web3, dContracts, contractMoc, contractMocType) => {
    const multicall = dContracts.contracts.multicall;

    const multiCallRequest = new Multicall(multicall, web3);
    multiCallRequest.aggregate(
        contractMoc,
        contractMoc.methods.feeToken().encodeABI(),
        "address",
        "feeToken"
    );
    multiCallRequest.aggregate(
        contractMoc,
        contractMoc.methods.feeTokenPriceProvider().encodeABI(),
        "address",
        "feeTokenPriceProvider"
    );
    if (contractMocType !== "coinbase") {
        multiCallRequest.aggregate(
            contractMoc,
            contractMoc.methods.acToken().encodeABI(),
            "address",
            "acToken"
        );
    }
    multiCallRequest.aggregate(
        contractMoc,
        contractMoc.methods.tcToken().encodeABI(),
        "address",
        "tcToken"
    );
    multiCallRequest.aggregate(
        contractMoc,
        contractMoc.methods.maxAbsoluteOpProvider().encodeABI(),
        "address",
        "maxAbsoluteOpProvider"
    );
    multiCallRequest.aggregate(
        contractMoc,
        contractMoc.methods.maxOpDiffProvider().encodeABI(),
        "address",
        "maxOpDiffProvider"
    );
    multiCallRequest.aggregate(
        contractMoc,
        contractMoc.methods.mocQueue().encodeABI(),
        "address",
        "mocQueue"
    );
    multiCallRequest.aggregate(
        contractMoc,
        contractMoc.methods.mocVendors().encodeABI(),
        "address",
        "mocVendors"
    );

    for (let i = 0; i < settings.tokens.TP.length; i++) {
        multiCallRequest.aggregate(
            contractMoc,
            contractMoc.methods.tpTokens(i).encodeABI(),
            "address",
            "tpTokens",
            i,
            null,
            onErrorTP
        );
    }

    return await multiCallRequest.tryBlockAndAggregate();
};

export { contractStatus, userBalance, registryAddresses, mocAddresses };
