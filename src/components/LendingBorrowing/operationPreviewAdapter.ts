import {
    getBorrowMockRatio,
    getBorrowOperationMockRiskDelta,
    getDepositCollateralMockRatio,
    getRepayMockRatio,
    getRepayWithCollateralMockRatio,
    getWithdrawCollateralMockRatio,
} from "./mocks/borrowOperationMockFormulas";

// TODO(api): This is the operation preview boundary. Replace the mock helpers
// below with API/contract simulations or freshly computed protocol metrics, and
// keep these exported function names stable so operation screens do not need to
// know where the live preview data comes from.
export const getBorrowRatio = getBorrowMockRatio;
export const getBorrowOperationRiskDelta = getBorrowOperationMockRiskDelta;
export const getDepositCollateralRatio = getDepositCollateralMockRatio;
export const getRepayRatio = getRepayMockRatio;
export const getRepayWithCollateralRatio = getRepayWithCollateralMockRatio;
export const getWithdrawCollateralRatio = getWithdrawCollateralMockRatio;
