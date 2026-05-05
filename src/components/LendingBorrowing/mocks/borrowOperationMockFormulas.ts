import {
    clampRiskDelta,
} from "../Borrow/operationUtils";
const MOCK_EFFECT_REFERENCE_FALLBACK = 1;

// TODO(api): These helpers are only for mock previews. Replace them with API/contract
// simulations or freshly computed protocol metrics when block-by-block data is wired.

function normalizeMockAmount(value: number): number {
    return Math.max(0, value);
}

function resolveMockEffectReference(
    primaryReference: number,
    fallbackReference: number
): number {
    if (primaryReference > 0) {
        return primaryReference;
    }

    if (fallbackReference > 0) {
        return fallbackReference;
    }

    return MOCK_EFFECT_REFERENCE_FALLBACK;
}


export function getBorrowMockRatio(
    amountValue: number,
    maxAvailableValue: number
): number {
    return clampRiskDelta(
        normalizeMockAmount(amountValue) /
            resolveMockEffectReference(
                maxAvailableValue,
                MOCK_EFFECT_REFERENCE_FALLBACK
            )
    );
}

export function getDepositCollateralMockRatio(
    amountValue: number,
    currentDepositedCollateralValue: number,
    walletCollateralBalanceValue: number
): number {
    return clampRiskDelta(
        normalizeMockAmount(amountValue) /
            resolveMockEffectReference(
                currentDepositedCollateralValue,
                walletCollateralBalanceValue
            )
    );
}

export function getWithdrawCollateralMockRatio(
    amountValue: number,
    currentDepositedCollateralValue: number
): number {
    return clampRiskDelta(
        normalizeMockAmount(amountValue) /
            resolveMockEffectReference(
                currentDepositedCollateralValue,
                MOCK_EFFECT_REFERENCE_FALLBACK
            )
    );
}

export function getRepayMockRatio(
    amountValue: number,
    currentDebtValue: number
): number {
    return clampRiskDelta(
        normalizeMockAmount(amountValue) /
            resolveMockEffectReference(
                currentDebtValue,
                MOCK_EFFECT_REFERENCE_FALLBACK
            )
    );
}

export function getRepayWithCollateralMockRatio(
    amountValue: number,
    currentDepositedCollateralValue: number
): number {
    return clampRiskDelta(
        normalizeMockAmount(amountValue) /
            resolveMockEffectReference(
                currentDepositedCollateralValue,
                MOCK_EFFECT_REFERENCE_FALLBACK
            )
    );
}

export function getBorrowOperationMockRiskDelta(
    borrowAmountValue: number,
    maxAvailableValue: number,
    collateralAmountValue: number,
    currentDepositedCollateralValue: number,
    walletCollateralBalanceValue: number
): number {
    const borrowRatio = getBorrowMockRatio(
        borrowAmountValue,
        maxAvailableValue
    );
    const collateralRatio = getDepositCollateralMockRatio(
        collateralAmountValue,
        currentDepositedCollateralValue,
        walletCollateralBalanceValue
    );

    return clampRiskDelta(collateralRatio - borrowRatio);
}
