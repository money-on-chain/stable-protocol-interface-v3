import React, { useState, useContext, Fragment, useEffect } from "react";
import { Button } from "antd";
import PropTypes from "prop-types";

import { TokenSettings, AmountToVisibleValue } from "../../helpers/currencies";
import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers3";
import { tokenStake } from "../../helpers/staking";
import CurrencyPopUp from "../CurrencyPopUp";
import StakingOptionsModal from "../Modals/StakingOptionsModal/index";
import OperationStatusModal from "../Modals/OperationStatusModal/OperationStatusModal";
import InputAmount from "../InputAmount";
import settings from "../../settings/settings.json";
import { useWalletContext } from "../../context/Wallet";

interface StakeProps {
    activeTab: string;
    userInfoStaking: {
        tgBalance: bigint;
        unstakeBalance: bigint;
        [key: string]: any;
    };
}

interface OperationModalInfo {
    operationStatus: string;
    txHash: string;
}

type ModalMode = "staking" | "unstaking" | null;

const Stake = (props: StakeProps): JSX.Element => {
    const { activeTab, userInfoStaking } = props;
    const { t, i18n, ns } = useProjectTranslation();

    const { contractProtocolStatus } = useWalletContext()

    const defaultTokenStake: string = tokenStake()[0];
    const [isUnstaking, setIsUnstaking] = useState<boolean>(false);
    const [inputValidationErrorText, setInputValidationErrorText] =
        useState<string>("");
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [modalAmount, setModalAmount] = useState<string>("0");
    const [operationModalInfo, setOperationModalInfo] = useState<OperationModalInfo>({
        operationStatus: "",
        txHash: ""
    });
    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const [inputValidationError, setInputValidationError] = useState<boolean>(true);
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
    }, [contractProtocolStatus.data, activeTab]);

    useEffect(() => {
        onValidate();
    }, [amountToStake, amountToUnstake]);

    const onValidate = (): void => {
        let amountInputError: boolean = false;

        const totalBalance: bigint = isUnstaking
            ? userInfoStaking["unstakeBalance"]
            : userInfoStaking["tgBalance"];
        const amountToProcess: bigint = isUnstaking
            ? amountToUnstake
            : amountToStake;

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
        } else if (isNaN(parseFloat(amountToProcess))) {
            if (amountToStake !== "" || amountToUnstake !== "") {
                setInputValidationErrorText("Invalid amount");
                amountInputError = true;
            }
        } else if (amountToProcess.toString().length < 1) {
            setInputValidationErrorText("Amount field cannot be empty");
            amountInputError = true;
        }
        if (!amountInputError) {
            setInputValidationErrorText("");
        }
        setInputValidationError(amountInputError);
    };

    const onChangeCurrency = (/*newCurrency*/): void => {
        onClear();
    };

    const onClear = (): void => {
        setAmountToStake("");
        setAmountToUnstake("");
    };
    
    const setAddTotalAvailable = (): void => {
        const total: bigint = isUnstaking
            ? userInfoStaking["unstakeBalance"]
            : userInfoStaking["tgBalance"];
        if (isUnstaking) setAmountToUnstake(total.toString()); 
        else setAmountToStake(total.toString());
    };
    
    const getAmount = (): number => {
        if (isUnstaking) {
            if (amountToUnstake === "0") {
                return 0;
            }
        } else {
            if (amountToStake === "0") {
                return 0;
            }
        }
        return AmountToVisibleValue(
            isUnstaking ? amountToUnstake : amountToStake,
            defaultTokenStake,
            4,
            false
        );
    };
    
    const onStakeButton = (): void => {
        if (getAmount() > 0) {
            setModalAmount(getAmount().toString());
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
    
    const onStakingModalConfirm = (operationStatus: string, txHash: string): void => {
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
                        <CurrencyPopUp
                            className="select-token"
                            value={defaultTokenStake}
                            currencyOptions={tokenStake()}
                            onChange={onChangeCurrency}
                            action={"staking"}
                            disabled={true}
                        />
                        <InputAmount
                            balanceText={t("staking.staking.inputAvailable")}
                            action={
                                isUnstaking
                                    ? t("staking.staking.inputUnstake")
                                    : t("staking.staking.inputStake")
                            }
                            balance={PrecisionNumbers({
                                amount: isUnstaking
                                    ? userInfoStaking["unstakeBalance"]
                                    : userInfoStaking["tgBalance"],
                                token: TokenSettings(defaultTokenStake),
                                decimals: t("staking.staking.input_decimals"),
                                t: t,
                                i18n: i18n,
                                ns: ns                                
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
                            setAddTotalAvailable={setAddTotalAvailable}
                            validateError={false}
                        />
                        <div className="amountInput__feedback amountInput__feedback--error">
                            {inputValidationErrorText}
                        </div>
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
                    ns: ns
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
                                      amount: amountToUnstake,
                                      token: settings.tokens.TG[0],
                                      decimals: t("staking.display_decimals"),
                                      t: t,
                                      i18n: i18n,
                                      ns: ns                                      
                                  })
                            : amountToStake === ""
                              ? ""
                              : PrecisionNumbers({
                                    amount: amountToStake,
                                    token: settings.tokens.TG[0],
                                    decimals: t("staking.display_decimals"),
                                    t: t,
                                    i18n: i18n,
                                    ns: ns                                    
                                })}
                        {t("staking.governanceToken")}
                    </div>
                    <div className="cta-info-detail">
                        {t("staking.staking.cta.explanation")}
                    </div>
                </div>
                <div className="cta-options-group">
                    <Button
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
                    withdrawalId={null}
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

Stake.propTypes = {
    activeTab: PropTypes.string,
    userInfoStaking: PropTypes.object,
};
