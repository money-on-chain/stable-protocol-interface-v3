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
import settings from "../../settings/settings.json";
import type { LendingPoolStatus } from "../../types/status";
import type { InterfaceContext } from "../../types/wallets";
import type { SettingsTokens } from "../../types/hooks";
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

export interface OperationModalState {
    isVisible: boolean;
    status: string;
    txHash: string | undefined;
    title: string;
    onClose: () => void;
}

interface LendingBorrowingActions {
    confirmBorrowDepositCollateral: (card: BorrowCardData, collateralAmount: string) => void;
    confirmBorrowOperation: (card: BorrowCardData, borrowAmount: string, collateralAmount: string) => void;
    confirmBorrowRepay: (card: BorrowCardData, repayAmount: string) => void;
    confirmBorrowRepayWithCollateral: (card: BorrowCardData, collateralAmount: string) => void;
    confirmBorrowWithdrawCollateral: (card: BorrowCardData, collateralAmount: string) => void;
    confirmLendEarn: (token: LendCardData, amount: string) => void;
    confirmLendWithdraw: (token: LendCardData, amount: string) => void;
    operationModal: OperationModalState;
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

    const [modalState, setModalState] = React.useState<Omit<OperationModalState, "onClose">>({
        isVisible: false,
        status: "sign",
        txHash: undefined,
        title: "",
    });

    const closeModal = React.useCallback(() => {
        setModalState((s) => ({ ...s, isVisible: false }));
    }, []);

    const operationModal: OperationModalState = { ...modalState, onClose: closeModal };

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
        (token: LendCardData, amount: string) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const tpIndex = parseTpIndex(token.tokenCode);
            const tpContract = contractsAddress.TP?.[tpIndex];
            if (!tpContract) return;

            const tpAmount = parseAmount(amount);
            if (tpAmount <= 0n) return;

            const run = async () => {
                setModalState({ isVisible: true, status: "sign", txHash: undefined, title: token.tokenTicker });
                try {
                    const ctx = buildCtx();
                    const tpAllowance = userLending.data?.[tpIndex]?.tpAllowance ?? 0n;

                    if (tpAllowance < tpAmount) {
                        await approveTP(ctx, tpContract, tpAmount,
                            (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                            () => setModalState((s) => ({ ...s, status: "sign", txHash: undefined }))
                        );
                    }

                    await deposit(ctx, address, tpContract.address, tpAmount,
                        (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                        () => setModalState((s) => ({ ...s, status: "success" }))
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch {
                    setModalState((s) => ({ ...s, status: "error" }));
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, userBalance, userLending]
    );

    const confirmLendWithdraw = React.useCallback(
        (token: LendCardData, amount: string) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const tpIndex = parseTpIndex(token.tokenCode);
            const tpContract = contractsAddress.TP?.[tpIndex];
            if (!tpContract) return;

            const tpAmount = parseAmount(amount);
            if (tpAmount <= 0n) return;

            const run = async () => {
                setModalState({ isVisible: true, status: "sign", txHash: undefined, title: token.tokenTicker });
                try {
                    const ctx = buildCtx();
                    const priceDepositUnit = pools?.[tpIndex]?.getPriceDepositUnit ?? WAD;
                    const depositUnits = (tpAmount * WAD) / priceDepositUnit;

                    await withdraw(ctx, address, tpContract.address, depositUnits,
                        (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                        () => setModalState((s) => ({ ...s, status: "success" }))
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch {
                    setModalState((s) => ({ ...s, status: "error" }));
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, pools, userBalance, userLending]
    );

    const depositCollateral = React.useCallback(
        async (
            ctx: InterfaceContext,
            caIndex: number,
            tpAddress: `0x${string}`,
            mocAddress: `0x${string}`,
            acAmount: bigint
        ) => {
            const caContract = contractsAddress?.CA?.[caIndex];
            if (!caContract) return;

            const erc20 = isErc20CA(caIndex);
            if (erc20) {
                await approveTP(ctx, caContract, acAmount,
                    (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                    () => setModalState((s) => ({ ...s, status: "sign", txHash: undefined }))
                );
            }

            const value = erc20 ? 0n : acAmount;
            await addACtoVault(ctx, ctx.address!, tpAddress, mocAddress, acAmount, value,
                (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                () => setModalState((s) => ({ ...s, status: "sign", txHash: undefined }))
            );
        },
        [contractsAddress, isErc20CA]
    );

    const confirmBorrowOperation = React.useCallback(
        (card: BorrowCardData, borrowAmount: string, collateralAmount: string) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const tpAmount = parseAmount(borrowAmount);
            const acAmount = parseAmount(collateralAmount);
            if (tpAmount <= 0n && acAmount <= 0n) return;

            const run = async () => {
                setModalState({ isVisible: true, status: "sign", txHash: undefined, title: card.borrowTokenTicker });
                try {
                    const ctx = buildCtx();

                    if (acAmount > 0n) {
                        await depositCollateral(ctx, ca, tpContract.address, mocContract.address, acAmount);
                    }

                    if (tpAmount > 0n) {
                        const execFee = getExecutionFee();
                        await borrow(ctx, address, tpContract.address, mocContract.address, tpAmount, execFee,
                            (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                            () => setModalState((s) => ({ ...s, status: "success" }))
                        );
                    } else {
                        setModalState((s) => ({ ...s, status: "success" }));
                    }

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch {
                    setModalState((s) => ({ ...s, status: "error" }));
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, depositCollateral, getExecutionFee, userBalance, userLending]
    );

    const confirmBorrowRepay = React.useCallback(
        (card: BorrowCardData, repayAmount: string) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const tpAmount = parseAmount(repayAmount);
            if (tpAmount <= 0n) return;

            const run = async () => {
                setModalState({ isVisible: true, status: "sign", txHash: undefined, title: card.borrowTokenTicker });
                try {
                    const ctx = buildCtx();
                    const tpAllowance = userLending.data?.[tp]?.tpAllowance ?? 0n;

                    if (tpAllowance < tpAmount) {
                        await approveTP(ctx, tpContract, tpAmount,
                            (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                            () => setModalState((s) => ({ ...s, status: "sign", txHash: undefined }))
                        );
                    }

                    const priceCreditUnit = pools?.[tp]?.getPriceCreditUnit ?? WAD;
                    const creditUnits = (tpAmount * WAD) / priceCreditUnit;

                    await repay(ctx, address, tpContract.address, mocContract.address, creditUnits,
                        (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                        () => setModalState((s) => ({ ...s, status: "success" }))
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch {
                    setModalState((s) => ({ ...s, status: "error" }));
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, pools, userBalance, userLending]
    );

    const confirmBorrowRepayWithCollateral = React.useCallback(
        (card: BorrowCardData, _collateralAmount: string) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            // repayWithAC clears the debt using vault AC; pass the full credit balance
            const creditUnits = userLending.data?.[tp]?.[ca]?.getUserVaultCreditBalance ?? 0n;
            if (creditUnits <= 0n) return;

            const run = async () => {
                setModalState({ isVisible: true, status: "sign", txHash: undefined, title: card.borrowTokenTicker });
                try {
                    const ctx = buildCtx();
                    const execFee = getExecutionFee();

                    await repayWithAC(ctx, tpContract.address, mocContract.address, creditUnits, execFee,
                        (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                        () => setModalState((s) => ({ ...s, status: "success" }))
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch {
                    setModalState((s) => ({ ...s, status: "error" }));
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, getExecutionFee, userBalance, userLending]
    );

    const confirmBorrowDepositCollateral = React.useCallback(
        (card: BorrowCardData, collateralAmount: string) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const acAmount = parseAmount(collateralAmount);
            if (acAmount <= 0n) return;

            const run = async () => {
                setModalState({ isVisible: true, status: "sign", txHash: undefined, title: card.collateralTokenTicker });
                try {
                    const ctx = buildCtx();
                    await depositCollateral(ctx, ca, tpContract.address, mocContract.address, acAmount);
                    setModalState((s) => ({ ...s, status: "success" }));

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch {
                    setModalState((s) => ({ ...s, status: "error" }));
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, depositCollateral, userBalance, userLending]
    );

    const confirmBorrowWithdrawCollateral = React.useCallback(
        (card: BorrowCardData, collateralAmount: string) => {
            if (!address || !contractsAddress?.LendingManager) return;
            const { tp, ca } = parseBorrowCardIndices(card.id);
            const tpContract = contractsAddress.TP?.[tp];
            const mocContract = contractsAddress.Moc?.[ca];
            if (!tpContract || !mocContract) return;

            const acAmount = parseAmount(collateralAmount);
            if (acAmount <= 0n) return;

            const run = async () => {
                setModalState({ isVisible: true, status: "sign", txHash: undefined, title: card.collateralTokenTicker });
                try {
                    const ctx = buildCtx();
                    const execFee = getExecutionFee();

                    await removeACfromVault(ctx, address, tpContract.address, mocContract.address, acAmount, execFee,
                        (hash) => setModalState((s) => ({ ...s, status: "pending", txHash: hash })),
                        () => setModalState((s) => ({ ...s, status: "success" }))
                    );

                    void userLending.refetch?.();
                    void userBalance.refetch?.();
                } catch {
                    setModalState((s) => ({ ...s, status: "error" }));
                }
            };
            void run();
        },
        [address, buildCtx, contractsAddress, getExecutionFee, userBalance, userLending]
    );

    return {
        confirmBorrowDepositCollateral,
        confirmBorrowOperation,
        confirmBorrowRepay,
        confirmBorrowRepayWithCollateral,
        confirmBorrowWithdrawCollateral,
        confirmLendEarn,
        confirmLendWithdraw,
        operationModal,
    };
}
