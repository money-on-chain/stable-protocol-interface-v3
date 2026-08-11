import React, { Fragment, useCallback, useEffect, useState } from "react";

import { useWalletContext } from "../../context/Wallet";
import { TokenSettings } from "../../helpers/currencies";
import { bigIntToInputValue } from "../../helpers/currencies";
import { toBigIntPrecision } from "../../helpers/precision";
import { tokenStake } from "../../helpers/staking";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings";
import Button from "../Button";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import StakingOptionsModal from "../Modals/StakingOptionsModal/index";
import { PrecisionNumbers } from "../PrecisionNumbers";
import TokenAmountInput from "../TokenAmountInput";

interface StakeProps {
    activeTab: string;
    userInfoStaking: {
        tgBalance: bigint;
        unstakeBalance: bigint;
        [key: string]: unknown;
    };
}

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

type ModalMode = "staking" | "unstaking" | null;

const QUICK_ACTIONS = [25, 50, 75, 100];

const Stake = (props: StakeProps): JSX.Element => {
    const { activeTab, userInfoStaking } = props;
    const { t, i18n } = useProjectTranslation();

    const { contractStatusOmoc } = useWalletContext();

    const defaultTokenStake: string = tokenStake()[0];
    const [isUnstaking, setIsUnstaking] = useState<boolean>(false);
    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [modalAmount, setModalAmount] = useState<bigint>(0n);
    const [operationModalInfo, setOperationModalInfo] =
        useState<OperationModalInfo>({
            operationStatus: "",
            txHash: "",
        });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const [inputValidationError, setInputValidationError] =
        useState<boolean>(true);
    //const [cleanInputCount, setUntouchCount] = useState(0);

    const [amountToStake, setAmountToStake] = useState<string>("");
    const [amountToUnstake, setAmountToUnstake] = useState<string>("");

    const [currentTab, setCurrentTab] = useState<string>(activeTab);

    useEffect(() => {
        // if(amountToStake === '' && amountToUnstake === '') return;
        setIsUnstaking(activeTab === "tab2");
        //setAmountToStake('');
        //setAmountToUnstake('');
        // console.log(activeTab);
        if (activeTab !== currentTab) {
            onClear();
            setCurrentTab(activeTab);
        }
    }, [contractStatusOmoc.data, activeTab, currentTab]);

    const onValidate = useCallback((): void => {
        let amountInputError: boolean = false;

        const totalBalance: bigint = isUnstaking
            ? userInfoStaking["unstakeBalance"]
            : userInfoStaking["tgBalance"];
        const amountToProcess: bigint = isUnstaking
            ? toBigIntPrecision(amountToUnstake)
            : toBigIntPrecision(amountToStake);

        //1. Input amount valid
        if (isNaN(parseFloat(isUnstaking ? amountToUnstake : amountToStake))) {
            //setInputValidationErrorText('Invalid amount');
            amountInputError = true;
        } else if (amountToProcess > totalBalance) {
            setInputValidationErrorText("Not enough balance in your wallet");
            amountInputError = true;
        } else if (amountToProcess <= 0) {
            if (amountToStake !== "" || amountToUnstake !== "") {
                setInputValidationErrorText("Amount must be greater than 0");
                amountInputError = true;
            } else {
                amountInputError = true;
            }
        } else if (
            (isUnstaking ? amountToUnstake : amountToStake).toString().length <
            1
        ) {
            setInputValidationErrorText("Amount field cannot be empty");
            amountInputError = true;
        }
        if (!amountInputError) {
            setInputValidationErrorText("");
        }
        setInputValidationError(amountInputError);
    }, [amountToStake, amountToUnstake, isUnstaking, userInfoStaking]);

    useEffect(() => {
        onValidate();
    }, [
        amountToStake,
        amountToUnstake,
        isUnstaking,
        userInfoStaking,
        onValidate,
    ]);

    const onClear = (): void => {
        setAmountToStake("");
        setAmountToUnstake("");
    };

    const setAddTotalAvailable = (): void => {
        const total: bigint = isUnstaking
            ? userInfoStaking["unstakeBalance"]
            : userInfoStaking["tgBalance"];
        if (isUnstaking) setAmountToUnstake(bigIntToInputValue(total, "TG", 2));
        else setAmountToStake(bigIntToInputValue(total, "TG", 2));
    };

    const onQuickActionClick = (percentage: number): void => {
        const total: bigint = isUnstaking
            ? userInfoStaking["unstakeBalance"]
            : userInfoStaking["tgBalance"];
        const partial = (total * BigInt(percentage)) / 100n;
        if (isUnstaking) setAmountToUnstake(bigIntToInputValue(partial, "TG", 2));
        else setAmountToStake(bigIntToInputValue(partial, "TG", 2));
    };

    const getAmount = (): bigint => {
        if (isUnstaking) {
            if (amountToUnstake === "0") {
                return 0n;
            }
        } else {
            if (amountToStake === "0") {
                return 0n;
            }
        }
        return toBigIntPrecision(isUnstaking ? amountToUnstake : amountToStake);
    };

    const onStakeButton = (): void => {
        if (getAmount() > 0n) {
            setModalAmount(getAmount());
            setModalMode(isUnstaking ? "unstaking" : "staking");
        } else {
            alert("Please fill amount you want to stake");
        }
    };

    const resetBalancesAndValues = (): void => {
        //setStakingBalances();
        setAmountToStake("");
        setAmountToUnstake("");
        //setUntouchCount((prev) => prev + 1);
    };

    const onStakingModalConfirm = (
        operationStatus: string,
        txHash: string
    ): void => {
        const operationInfo: OperationModalInfo = {
            operationStatus,
            txHash,
        };

        setOperationModalInfo(operationInfo);
        setIsOperationModalVisible(true);
        resetBalancesAndValues();
    };

    return (
        <Fragment>
            <div className="sectionStaking__Content">
                <div className="inputFields">
                    <div className="tokenSelector">
                        <TokenAmountInput
                            testId={
                                isUnstaking
                                    ? "staking-unstake-amount"
                                    : "staking-stake-amount"
                            }
                            label={
                                isUnstaking
                                    ? t("staking.staking.inputUnstake")
                                    : t("staking.staking.inputStake")
                            }
                            balanceLabel={t("staking.staking.inputAvailable")}
                            balanceValue={PrecisionNumbers({
                                amount: isUnstaking
                                    ? userInfoStaking["unstakeBalance"] || 0n
                                    : userInfoStaking["tgBalance"] || 0n,
                                token: TokenSettings(defaultTokenStake),
                                decimals: Number(
                                    t("staking.staking.input_decimals")
                                ),
                                i18n: i18n,
                                compact: true,
                            })}
                            placeholder={"0.0"}
                            inputValue={
                                isUnstaking ? amountToUnstake : amountToStake
                            }
                            onValueChange={
                                isUnstaking
                                    ? setAmountToUnstake
                                    : setAmountToStake
                            }
                            onMaxClick={setAddTotalAvailable}
                            validateError={false}
                            feedbackMessage={inputValidationErrorText || undefined}
                            feedbackState="negative"
                            preserveSpaceWhenNoFeedback
                            currencyOptions={tokenStake()}
                            action="staking"
                            selectedTokenValue={defaultTokenStake}
                            quickActions={QUICK_ACTIONS.filter(
                                (percentage) => percentage !== 100
                            )}
                            onQuickActionClick={onQuickActionClick}
                        />
                    </div>
                </div>
            </div>

            {/* <div className="staked-text">
                {t('staking.staking.stakedAmount')}:{' '}
                {PrecisionNumbers({
                    amount: new BigNumber(stakedBalance),
                    token: settings.tokens.TG[0],
                    decimals: t('staking.display_decimals'),
                    t: t,
                    i18n: i18n,
                    ns: ns,
                    compact: true,
                })}
                {TokenSettings(defaultTokenStake).name}
            </div> */}
            <div className="cta-container">
                <div className="cta-info-group">
                    <div className="cta-info-summary">
                        {isUnstaking
                            ? t("staking.staking.cta.unstaking")
                            : t("staking.staking.cta.staking")}{" "}
                        {t("staking.staking.cta.stakingSign")}{" "}
                        {isUnstaking
                            ? amountToUnstake === ""
                                ? ""
                                : PrecisionNumbers({
                                      amount: toBigIntPrecision(
                                          amountToUnstake
                                      ),
                                      token: settings.tokens.TG[0],
                                      decimals: Number(
                                          t("staking.display_decimals")
                                      ),
                                      i18n: i18n,
                                      compact: true,
                                  })
                            : amountToStake === ""
                              ? ""
                              : PrecisionNumbers({
                                    amount: toBigIntPrecision(amountToStake),
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    i18n: i18n,
                                    compact: true,
                                })}
                        {t("staking.governanceToken")}
                    </div>
                    <div className="cta-info-detail">
                        {t("staking.staking.cta.explanation")}
                    </div>
                </div>
                <div className="cta-options-group">
                    <Button
                        data-testid={
                            isUnstaking
                                ? "staking-unstake-open-modal"
                                : "staking-stake-open-modal"
                        }
                        type="primary"
                        className={"button"}
                        onClick={onStakeButton}
                        disabled={inputValidationError}
                    >
                        {isUnstaking
                            ? t("staking.staking.cta.unstakeButton")
                            : t("staking.staking.cta.stakeButton")}
                    </Button>
                </div>
            </div>

            {modalMode !== null && (
                <StakingOptionsModal
                    mode={modalMode}
                    visible={modalMode !== null}
                    onClose={() => setModalMode(null)}
                    withdrawalId={undefined}
                    amount={modalAmount}
                    onConfirm={onStakingModalConfirm}
                />
            )}
            {isOperationModalVisible && (
                <OperationStatusModal
                    visible={isOperationModalVisible}
                    onCancel={() => setIsOperationModalVisible(false)}
                    operationStatus={operationModalInfo.operationStatus}
                    txHash={operationModalInfo.txHash}
                />
            )}
        </Fragment>
    );
};

export default Stake;
