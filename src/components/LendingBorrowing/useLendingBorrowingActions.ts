import React from "react";
import { parseUnits } from "viem";

import {
    addACtoVault,
    approveTP,
    borrow,
    deposit,
    removeACfromVault,
    repay,
    repayWithAC,
    withdraw,
} from "../../backend/lending/manager";
import { useWalletContext } from "../../context/Wallet";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import type { LendingPoolStatus } from "../../types/status";
import type { InterfaceContext } from "../../types/wallets";
import type { SettingsTokens } from "../../types/hooks";
import type { OperationProgressStep, OperationStepStatus } from "../OperationProgressList/types";
import type { BorrowCardData } from "./Borrow/data";
import type { LendCardData } from "./Lend/data";

const WAD = 10n ** 18n;

function parseAmount(raw: string): bigint {
    return parseUnits(raw.replace(/,/g, ""), 18);
}

function parseTpIndex(tokenCode: string): number {
    return parseInt(tokenCode.split("_")[1] ?? "0", 10);
}

function parseBorrowCardIndices(id: string): { tp: number; ca: number } {
    const m = id.match(/borrow-tp-(\d+)-ca-(\d+)/);
    return { tp: parseInt(m?.[1] ?? "0", 10), ca: parseInt(m?.[2] ?? "0", 10) };
}

function makeStep(
    id: string,
    title: string,
    status: OperationStepStatus = "pending"
): OperationProgressStep {
    return { id, title, status };
}

export interface OperationProgressState {
    isVisible: boolean;
    title: string;
    steps: OperationProgressStep[];
    onClose: () => void;
}

interface LendingBorrowingActions {
    confirmBorrowDepositCollateral: (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => void;
    confirmBorrowOperation: (card: BorrowCardData, borrowAmount: string, collateralAmount: string, onSuccess?: () => void) => void;
    confirmBorrowRepay: (card: BorrowCardData, repayAmount: string, onSuccess?: () => void) => void;
    confirmBorrowRepayWithCollateral: (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => void;
    confirmBorrowWithdrawCollateral: (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => void;
    confirmLendEarn: (token: LendCardData, amount: string, onSuccess?: () => void) => void;
    confirmLendWithdraw: (token: LendCardData, amount: string, onSuccess?: () => void) => void;
    operationProgress: OperationProgressState;
}

export function useLendingBorrowingActions(): LendingBorrowingActions {
    const {
        address,
        contractsAddress,
        contractProtocolStatus,
        contractLendingStatus,
        userBalance,
        userLending,
        publicClient,
        walletClient,
    } = useWalletContext();

    const { t } = useProjectTranslation();

    const [progressState, setProgressState] = React.useState<Omit<OperationProgressState, "onClose">>({
        isVisible: false,
        title: "",
        steps: [],
    });

    const closeProgress = React.useCallback(() => {
        setProgressState((s) => ({ ...s, isVisible: false }));
    }, []);

    const operationProgress: OperationProgressState = { ...progressState, onClose: closeProgress };

    const setStepStatus = React.useCallback((
        id: string,
        status: OperationStepStatus,
        txHash?: string,
        errorMessage?: string
    ) => {
        setProgressState((s) => ({
            ...s,
            steps: s.steps.map((step) =>
                step.id === id ? { ...step, status, txHash, errorMessage } : step
            ),
        }));
    }, []);

    const markActiveFailed = React.useCallback(() => {
        setProgressState((s) => ({
            ...s,
            steps: s.steps.map((step) =>
                step.status === "waiting" || step.status === "processing"
                    ? { ...step, status: "failed" }
                    : step
            ),
        }));
    }, []);

    const buildCtx = React.useCallback((): InterfaceContext => ({
        publicClient,
        walletClient,
        contractProtocolStatus,
        userBalance,
        address,
        contracts: contractsAddress,
    }), [address, contractsAddress, contractProtocolStatus, publicClient, userBalance, walletClient]);

    const tokens = (settings as { tokens?: unknown }).tokens as SettingsTokens | undefined;
    const lmData = contractLendingStatus.data?.lendingmanager;
    const pools = lmData?.pools as unknown as Record<number, LendingPoolStatus> | undefined;

    const getExecutionFee = React.useCallback((): bigint => {
        if (!lmData?.useQueue) return 0n;
        return lmData.coinbaseForPayExecutions ?? 0n;
    }, [lmData]);

    const isErc20CA = React.useCallback((caIndex: number): boolean => {
        const caTokens = tokens?.CA;
        if (!caTokens) return true;
        const caToken = caTokens[caIndex] as { collateralType?: string } | undefined;
        return caToken?.collateralType !== "coinbase";
    }, [tokens]);

    const confirmLendEarn = React.useCallback(
        (token: LendCardData, amount: string, onSuccess?: () => void) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const tpIndex = parseTpIndex(token.tokenCode);
            const tpContract = contractsAddress.TP?.[tpIndex];
            if (!tpContract) return;

            const tpAmount = parseAmount(amount);
            if (tpAmount <= 0n) return;

            const tpAllowance = userLending.data?.[tpIndex]?.tpAllowance ?? 0n;
            const needsApproval = tpAllowance < tpAmount;

            const steps: OperationProgressStep[] = [
                ...(needsApproval
                    ? [makeStep("approve-tp", t("borrowing.operationProgress.approveTP"), "waiting")]
                    : []),
                makeStep("deposit-lend", t("borrowing.operationProgress.depositLend"), needsApproval ? "pending" : "waiting"),
            ];

            const run = async () => {
                setProgressState({ isVisible: true, title: token.tokenTicker, steps });
                try {
                    const ctx = buildCtx();

                    if (needsApproval) {
                        let approveHash = "";
                        await approveTP(ctx, tpContract, tpAmount,
                            (hash) => { approveHash = hash; setStepStatus("approve-tp", "processing", hash); },
                            () => { setStepStatus("approve-tp", "completed", approveHash); setStepStatus("deposit-lend", "waiting"); }
                        );
                    }

                    let depositHash = "";
                    await deposit(ctx, address, tpContract.address, tpAmount,
                        (hash) => { depositHash = hash; setStepStatus("deposit-lend", "processing", hash); },
                        () => { setStepStatus("deposit-lend", "completed", depositHash); onSuccess?.(); }
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch (error) {
                    console.error("[lending] transaction failed:", error);
                    markActiveFailed();
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, markActiveFailed, setStepStatus, t, userBalance, userLending]
    );

    const confirmLendWithdraw = React.useCallback(
        (token: LendCardData, amount: string, onSuccess?: () => void) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const tpIndex = parseTpIndex(token.tokenCode);
            const tpContract = contractsAddress.TP?.[tpIndex];
            if (!tpContract) return;

            const tpAmount = parseAmount(amount);
            if (tpAmount <= 0n) return;

            const steps: OperationProgressStep[] = [
                makeStep("withdraw-lend", t("borrowing.operationProgress.withdrawLend"), "waiting"),
            ];

            const run = async () => {
                setProgressState({ isVisible: true, title: token.tokenTicker, steps });
                try {
                    const ctx = buildCtx();
                    const priceDepositUnit = pools?.[tpIndex]?.getPriceDepositUnit ?? WAD;
                    const depositUnits = (tpAmount * WAD) / priceDepositUnit;

                    let withdrawHash = "";
                    await withdraw(ctx, address, tpContract.address, depositUnits,
                        (hash) => { withdrawHash = hash; setStepStatus("withdraw-lend", "processing", hash); },
                        () => { setStepStatus("withdraw-lend", "completed", withdrawHash); onSuccess?.(); }
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch (error) {
                    console.error("[lending] transaction failed:", error);
                    markActiveFailed();
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, markActiveFailed, pools, setStepStatus, t, userBalance, userLending]
    );

    // Internal helper: runs approve-CA (if ERC20) then addACtoVault.
    // Callers set up the step statuses; this helper drives them via callbacks.
    const depositCollateral = React.useCallback(
        async (
            ctx: InterfaceContext,
            caIndex: number,
            tpAddress: `0x${string}`,
            mocAddress: `0x${string}`,
            acAmount: bigint,
            approveStepId: string | null,
            depositStepId: string,
        ) => {
            const caContract = contractsAddress?.CA?.[caIndex];
            if (!caContract) return;

            const erc20 = isErc20CA(caIndex);
            if (erc20 && approveStepId) {
                let approveHash = "";
                await approveTP(ctx, caContract, acAmount,
                    (hash) => { approveHash = hash; setStepStatus(approveStepId, "processing", hash); },
                    () => { setStepStatus(approveStepId, "completed", approveHash); setStepStatus(depositStepId, "waiting"); }
                );
            }

            const value = erc20 ? 0n : acAmount;
            let depositHash = "";
            await addACtoVault(ctx, ctx.address!, tpAddress, mocAddress, acAmount, value,
                (hash) => { depositHash = hash; setStepStatus(depositStepId, "processing", hash); },
                () => { setStepStatus(depositStepId, "completed", depositHash); }
            );
        },
        [contractsAddress, isErc20CA, setStepStatus]
    );

    const confirmBorrowOperation = React.useCallback(
        (card: BorrowCardData, borrowAmount: string, collateralAmount: string, onSuccess?: () => void) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const tpAmount = parseAmount(borrowAmount);
            const acAmount = parseAmount(collateralAmount);
            if (tpAmount <= 0n && acAmount <= 0n) return;

            const hasCollateral = acAmount > 0n;
            const hasBorrow = tpAmount > 0n;
            const erc20 = hasCollateral && isErc20CA(ca);

            const steps: OperationProgressStep[] = [
                ...(erc20 ? [makeStep("approve-ca", t("borrowing.operationProgress.approveCA"), "waiting")] : []),
                ...(hasCollateral ? [makeStep("deposit-collateral", t("borrowing.operationProgress.depositCollateral"), erc20 ? "pending" : "waiting")] : []),
                ...(hasBorrow ? [makeStep("borrow", t("borrowing.operationProgress.borrow"), hasCollateral ? "pending" : "waiting")] : []),
            ];

            const run = async () => {
                setProgressState({ isVisible: true, title: card.borrowTokenTicker, steps });
                try {
                    const ctx = buildCtx();

                    if (hasCollateral) {
                        await depositCollateral(
                            ctx, ca, tpContract.address, mocContract.address, acAmount,
                            erc20 ? "approve-ca" : null,
                            "deposit-collateral"
                        );
                    }

                    if (hasBorrow) {
                        if (hasCollateral) {
                            setStepStatus("borrow", "waiting");
                        }
                        const execFee = getExecutionFee();
                        let borrowHash = "";
                        await borrow(ctx, address, tpContract.address, mocContract.address, tpAmount, execFee,
                            (hash) => { borrowHash = hash; setStepStatus("borrow", "processing", hash); },
                            () => { setStepStatus("borrow", "completed", borrowHash); onSuccess?.(); }
                        );
                    } else {
                        onSuccess?.();
                    }

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch (error) {
                    console.error("[lending] transaction failed:", error);
                    markActiveFailed();
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, depositCollateral, getExecutionFee, isErc20CA, markActiveFailed, setStepStatus, t, userBalance, userLending]
    );

    const confirmBorrowRepay = React.useCallback(
        (card: BorrowCardData, repayAmount: string, onSuccess?: () => void) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const tpAmount = parseAmount(repayAmount);
            if (tpAmount <= 0n) return;

            const tpAllowance = userLending.data?.[tp]?.tpAllowance ?? 0n;
            const approvalAmount = tpAmount + tpAmount / 100n;
            const needsApproval = tpAllowance < approvalAmount;

            const steps: OperationProgressStep[] = [
                ...(needsApproval
                    ? [makeStep("approve-tp", t("borrowing.operationProgress.approveTP"), "waiting")]
                    : []),
                makeStep("repay", t("borrowing.operationProgress.repay"), needsApproval ? "pending" : "waiting"),
            ];

            const run = async () => {
                setProgressState({ isVisible: true, title: card.borrowTokenTicker, steps });
                try {
                    const ctx = buildCtx();

                    if (needsApproval) {
                        let approveHash = "";
                        await approveTP(ctx, tpContract, approvalAmount,
                            (hash) => { approveHash = hash; setStepStatus("approve-tp", "processing", hash); },
                            () => { setStepStatus("approve-tp", "completed", approveHash); setStepStatus("repay", "waiting"); }
                        );
                    }

                    const priceCreditUnit = pools?.[tp]?.getPriceCreditUnit ?? WAD;
                    const creditUnits = (tpAmount * WAD) / priceCreditUnit;
                    let repayHash = "";

                    await repay(ctx, address, tpContract.address, mocContract.address, creditUnits,
                        (hash) => { repayHash = hash; setStepStatus("repay", "processing", hash); },
                        () => { setStepStatus("repay", "completed", repayHash); onSuccess?.(); }
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch (error) {
                    console.error("[repay] transaction failed:", error);
                    markActiveFailed();
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, markActiveFailed, pools, setStepStatus, t, userBalance, userLending]
    );

    const confirmBorrowRepayWithCollateral = React.useCallback(
        (card: BorrowCardData, _collateralAmount: string, onSuccess?: () => void) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const creditUnits = userLending.data?.[tp]?.[ca]?.getUserVaultCreditBalance ?? 0n;
            if (creditUnits <= 0n) return;

            const steps: OperationProgressStep[] = [
                makeStep("repay-collateral", t("borrowing.operationProgress.repayWithCollateral"), "waiting"),
            ];

            const run = async () => {
                setProgressState({ isVisible: true, title: card.borrowTokenTicker, steps });
                try {
                    const ctx = buildCtx();
                    const execFee = getExecutionFee();
                    let repayHash = "";

                    await repayWithAC(ctx, tpContract.address, mocContract.address, creditUnits, execFee,
                        (hash) => { repayHash = hash; setStepStatus("repay-collateral", "processing", hash); },
                        () => { setStepStatus("repay-collateral", "completed", repayHash); onSuccess?.(); }
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch (error) {
                    console.error("[lending] transaction failed:", error);
                    markActiveFailed();
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, getExecutionFee, markActiveFailed, setStepStatus, t, userBalance, userLending]
    );

    const confirmBorrowDepositCollateral = React.useCallback(
        (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const acAmount = parseAmount(collateralAmount);
            if (acAmount <= 0n) return;

            const erc20 = isErc20CA(ca);
            const steps: OperationProgressStep[] = [
                ...(erc20 ? [makeStep("approve-ca", t("borrowing.operationProgress.approveCA"), "waiting")] : []),
                makeStep("deposit-collateral", t("borrowing.operationProgress.depositCollateral"), erc20 ? "pending" : "waiting"),
            ];

            const run = async () => {
                setProgressState({ isVisible: true, title: card.collateralTokenTicker, steps });
                try {
                    const ctx = buildCtx();
                    await depositCollateral(
                        ctx, ca, tpContract.address, mocContract.address, acAmount,
                        erc20 ? "approve-ca" : null,
                        "deposit-collateral"
                    );
                    onSuccess?.();

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch (error) {
                    console.error("[lending] transaction failed:", error);
                    markActiveFailed();
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, depositCollateral, isErc20CA, markActiveFailed, t, userBalance, userLending]
    );

    const confirmBorrowWithdrawCollateral = React.useCallback(
        (card: BorrowCardData, collateralAmount: string, onSuccess?: () => void) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const acAmount = parseAmount(collateralAmount);
            if (acAmount <= 0n) return;

            const steps: OperationProgressStep[] = [
                makeStep("withdraw-collateral", t("borrowing.operationProgress.withdrawCollateral"), "waiting"),
            ];

            const run = async () => {
                setProgressState({ isVisible: true, title: card.collateralTokenTicker, steps });
                try {
                    const ctx = buildCtx();
                    const execFee = getExecutionFee();
                    let withdrawHash = "";

                    await removeACfromVault(ctx, address, tpContract.address, mocContract.address, acAmount, execFee,
                        (hash) => { withdrawHash = hash; setStepStatus("withdraw-collateral", "processing", hash); },
                        () => { setStepStatus("withdraw-collateral", "completed", withdrawHash); onSuccess?.(); }
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch (error) {
                    console.error("[lending] transaction failed:", error);
                    markActiveFailed();
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, getExecutionFee, markActiveFailed, setStepStatus, t, userBalance, userLending]
    );

    return {
        confirmBorrowDepositCollateral,
        confirmBorrowOperation,
        confirmBorrowRepay,
        confirmBorrowRepayWithCollateral,
        confirmBorrowWithdrawCollateral,
        confirmLendEarn,
        confirmLendWithdraw,
        operationProgress,
    };
}
