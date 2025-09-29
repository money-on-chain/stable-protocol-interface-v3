import { LoadingOutlined } from "@ant-design/icons";
import { Button, Checkbox, Modal, notification, Spin } from "antd";
import React, { Fragment, useEffect, useState } from "react";

import { useWalletContext } from "../../../context/Wallet";
import { useProjectTranslation } from "../../../helpers/translations";
import settings from "../../../settings/settings.json";
import type { UserOmocBalance,UserVesting } from "../../../types/status";
import { PrecisionNumbers } from "../../PrecisionNumbers";

interface StakingOptionsModalProps {
    mode?: string;
    onClose: () => void;
    visible?: boolean;
    amount?: bigint;
    onConfirm: (status: string, txHash: string) => void;
    withdrawalId?: string;
}

const PRECISION_DECIMALS = 18n;
const DECIMALS_18 = 10n ** PRECISION_DECIMALS;

type StepType = 0 | 1 | 2 | 3 | 99;
type ModeType = "staking" | "unstaking" | "withdraw" | "restake";

export default function StakingOptionsModal(
    props: StakingOptionsModalProps
): React.ReactElement {
    const {
        address,
        userOmocBalance,
        userVesting,
        isVestingLoaded,
        interfaceStakingApprove,
        interfaceStakingAddStake,
        interfaceStakingDelayMachineCancelWithdraw,
        interfaceStakingUnStake,
        interfaceStakingDelayMachineWithdraw,
    } = useWalletContext();
    const { t, i18n, ns } = useProjectTranslation();
    const { mode, onClose, visible, amount, onConfirm, withdrawalId } = props;

    const [step, setStep] = useState<StepType>(0);

    const amountInEth = amount;

    let infinityAllowance = false;

    useEffect(() => {
        if (
            (userOmocBalance.data && amountInEth) ||
            (userVesting.data && amountInEth)
        )
            checkAllowance();
    }, [userOmocBalance.data, amountInEth, userVesting.data]);

    const onChangeInfinity = (e: any): void => {
        console.log(`checked = ${e.target.checked}`);
        infinityAllowance = e.target.checked;
    };

    const checkAllowance = (): void => {
        if (!amountInEth) return;

        const allowanceAmount = isVestingLoaded()
            ? (userVesting.data as UserVesting).vestingmachine?.staking?.allowance
            : (userOmocBalance.data as UserOmocBalance).stakingmachine?.tgAllowance;

        if (allowanceAmount >= amountInEth) setStep(3);
    };

    if (!mode) return <></>;

    //methods
    const setAllowance = async (): Promise<void> => {
        setStep(1);

        let amountAllowance;
        if (infinityAllowance) {
            amountAllowance = 100000000000n * DECIMALS_18;
        } else {
            amountAllowance = amount;
        }

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction allowance...: ", txHash);
            setStep(2);
        };
        const onReceipt = (): void => {
            console.log("Transaction allowance mined!...");
        };
        const onError = (error: any): void => {
            console.log("Transaction allowance error!...:", error);
        };

        if (!amountAllowance) return;

        await interfaceStakingApprove(
            amountAllowance,
            onTransaction,
            onReceipt,
            onError
        )
            .then((/*res*/) => {
                setStep(3);
                return null;
            })
            .catch((e) => {
                console.error(e);
                notification["error"]({
                    message: "Operations",
                    description: "Something went wrong! Transaction rejected!",
                    duration: 10,
                });
            });
    };

    const addStake = async (): Promise<void> => {
        onClose();
        onConfirm("sign", "");
        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction add stake...");
            onConfirm("pending", txHash);
        };
        const onReceipt = (): void => {
            console.log("Transaction add stake mined!...");
        };
        const onError = (error: any): void => {
            console.log("Transaction add stake error!...:", error);
        };
        if (!amount || !address) return;

        setStep(99);
        const receipt = await interfaceStakingAddStake(
            amount,
            address,
            onTransaction,
            onReceipt,
            onError
        )
        if (!receipt) return;
        
        const status = receipt.status ? "success" : "error";
        onConfirm(status, receipt.transactionHash);
        
        // const status = res.status ? "success" : "error";
        // onConfirm(status, res.transactionHash);

        if (isVestingLoaded()) {
            void userVesting.refetch();
        } else {
            void userOmocBalance.refetch();
        }
        
        // .catch((/*e*/) => {
        //     notification["error"]({
        //         message: t("global.RewardsError_Title"),
        //         description: t("global.RewardsError_Message"),
        //         duration: 10,
        //     });
        //     onConfirm("error", "");
        // });
    };

    const CancelWithdraw = async (): Promise<void> => {
        onClose();
        onConfirm("sign", "");
        const onTransaction = (txHash: string): void => {
            console.log("Sent cancel withdraw ...: ", txHash);
            onConfirm("pending", txHash);
        };
        const onReceipt = (): void => {
            console.log("Transaction cancel withdraw mined!...");
        };
        const onError = (error: any): void => {
            console.log("Transaction cancel withdraw error!...:", error);
        };
        await interfaceStakingDelayMachineCancelWithdraw(
            withdrawalId || "",
            onTransaction,
            onReceipt,
            onError
        )
            .then((res) => {
                const status = res.status ? "success" : "error";
                onConfirm(status, res.transactionHash);

                // Refresh user balance
                isVestingLoaded()
                    ? void userVesting.refetch()
                    : void userOmocBalance.refetch();

                return null;
            })
            .catch((e) => {
                console.error(e);
                notification["error"]({
                    message: t("global.RewardsError_Title"),
                    description: t("global.RewardsError_Message"),
                    duration: 10,
                });
                onConfirm("error", "");
            });
    };

    const UnStake = async (): Promise<void> => {
        onClose();
        onConfirm("sign", "");
        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction unStake...: ", txHash);
            onConfirm("pending", txHash);
        };
        const onReceipt = (): void => {
            console.log("Transaction unStake mined!...");
        };
        const onError = (error: any): void => {
            console.log("Transaction unStake error!...:", error);
        };
        if (!amount) return;

        await interfaceStakingUnStake(amount, onTransaction, onReceipt, onError)
            .then((res) => {
                const status = res.status ? "success" : "error";
                onConfirm(status, res.transactionHash);

                // Refresh user balance
                isVestingLoaded()
                    ? void userVesting.refetch()
                    : void userOmocBalance.refetch();

                return null;
            })
            .catch((e) => {
                console.error("error unstaking is", e);
                notification["error"]({
                    message: t("global.RewardsError_Title"),
                    description: t("global.RewardsError_Message"),
                    duration: 10,
                });
                onConfirm("error", "");
            });
    };

    const withdraw = (): void => {
        onClose();

        onConfirm("sign", "");
        const onTransaction = (txHash: string): void => {
            console.log("Sent withdraw...: ", txHash);
            onConfirm("pending", txHash);
        };
        const onReceipt = (): void => {
            console.log("Transaction withdraw mined!...");
        };
        const onError = (error: any): void => {
            console.log("Transaction withdraw error!...:", error);
        };
        interfaceStakingDelayMachineWithdraw(
            withdrawalId || "",
            onTransaction,
            onReceipt,
            onError
        )
            .then((res) => {
                const status = res.status ? "success" : "error";
                onConfirm(status, res.transactionHash);

                // Refresh user balance
                isVestingLoaded()
                    ? void userVesting.refetch()
                    : void userOmocBalance.refetch();

                return null;
            })
            .catch((e) => {
                console.error(e);
                notification["error"]({
                    message: t("global.RewardsError_Title"),
                    description: t("global.RewardsError_Message"),
                    duration: 10,
                });
                onConfirm("error", "");
            });
    };

    // renders
    const renderStaking = (): React.ReactElement | null => {
        const steps: Record<StepType, () => React.ReactElement> = {
            0: () => {
                return (
                    <Fragment>
                        {/* Asks user to authorize governance tokens */}
                        <div className="">
                            <h1 className="">
                                {t("allowance.cardTitle")}
                                {"  "} {"  "}
                                {t("staking.tokens.TG.label")}
                            </h1>
                            <div className="modal-content">
                                <div className="tx-info-container">
                                    <p>{t("allowance.statusText1")}</p>{" "}
                                    <p>{t("allowance.statusText2")}</p>
                                </div>
                                <div className="tx-options-container">
                                    <Checkbox
                                        className="check-unlimited"
                                        onChange={onChangeInfinity}
                                    >
                                        {t("allowance.setUnlimited")}
                                    </Checkbox>
                                </div>
                                <div className="cta-container">
                                    <div className="cta-options-group">
                                        <Button
                                            type="default"
                                            className="button secondary"
                                            onClick={onClose}
                                        >
                                            {t("allowance.confirm.cancel")}
                                        </Button>
                                        <Button
                                            type="primary"
                                            className="button"
                                            onClick={setAllowance}
                                        >
                                            {t("allowance.confirm.authorize")}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            },
            1: () => {
                return (
                    <Fragment>
                        {/* Asks user to sign authorization transaction on the wallet */}
                        <div className="AllowanceDialog">
                            <h1>
                                {t("allowance.cardTitle")}
                                {"  "}
                                {"  "}
                                {t("staking.tokens.TG.label")}
                            </h1>
                            <div className="modal-content">
                                <div className="tx-feedback-container">
                                    <p className="status-text">
                                        {t("allowance.feedback.sign")}
                                    </p>
                                    <div className="tx-feedback-icon icon-tx-signWallet"></div>{" "}
                                </div>

                                <div className="cta-container">
                                    <div className="tx-cta-buttons">
                                        <Button
                                            type="default"
                                            className="button secondary"
                                            onClick={setAllowance}
                                        >
                                            {t("allowance.confirm.cancel")}
                                        </Button>
                                    </div>{" "}
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            },
            2: () => {
                return (
                    <Fragment>
                        {/* Authorization is being mined, asks the user to wait */}
                        <div className="AllowanceDialog">
                            <h1>
                                {t("allowance.cardTitle")}
                                {"  "}
                                {"  "}
                                {t("staking.tokens.TG.label")}
                            </h1>{" "}
                            <div className="tx-amount-group">
                                <div className="StakingOptionsModal_Content AllowanceLoading">
                                    <p>{t("allowance.feedback.waiting")}</p>
                                </div>
                                <div className="icon-tx-waiting"></div>
                                <div className="cta-container">
                                    <div className="cta-options-group">
                                        <Button
                                            type="default"
                                            className="button secondary"
                                            onClick={setAllowance}
                                        >
                                            {t("allowance.confirm.cancel")}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            },
            3: () => {
                return (
                    <Fragment>
                        {/* Asks the user to confirm the staking */}
                        <div className="ModalAllowance">
                            <h1 className="StakingOptionsModal_Title">
                                {t("staking.confirmation.cardTitle")}
                            </h1>
                            <div className="tx-amount-group">
                                <div className="tx-amount-container">
                                    <div className="tx-amount-data">
                                        <div className="tx-amount">
                                            {PrecisionNumbers({
                                                amount: amount || 0n,
                                                token: settings.tokens.TG[0],
                                                decimals: Number(
                                                    t(
                                                        "staking.display_decimals"
                                                    )
                                                ),
                                                //numericLabelParams: {},
                                                i18n: i18n,
                                                //skipContractConvert: true,
                                            })}
                                        </div>
                                        <div className="tx-token">
                                            {t("staking.tokens.TG.label", {
                                                ns: ns,
                                            })}
                                        </div>
                                    </div>
                                    <div className="cta-container">
                                        <div className="cta-info-group">
                                            <div className="cta-info-detail">
                                                {t(
                                                    "staking.modal.StakingOptionsModal_StakingDescription"
                                                )}
                                            </div>
                                        </div>{" "}
                                        <div className="cta-options-group">
                                            <Button
                                                type="default"
                                                onClick={onClose}
                                                className="button secondary"
                                            >
                                                {t(
                                                    "staking.modal.StakingOptionsModal_Cancel"
                                                )}
                                            </Button>
                                            <Button
                                                type="primary"
                                                onClick={addStake}
                                                className="button"
                                            >
                                                {t(
                                                    "staking.modal.StakingOptionsModal_Comfirm"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Fragment>
                );
            },
            99: () => {
                return (
                    <Fragment>
                        <h1 className="StakingOptionsModal_Title">
                            {t(
                                "staking.modal.StakingOptionsModal_ReviewYourWallet"
                            )}
                        </h1>
                        <div className="StakingOptionsModal_Content AllowanceLoading">
                            <Spin indicator={<LoadingOutlined />} />
                            <p>
                                {t(
                                    "staking.modal.StakingOptionsModal_ReviewYourWalletDescription"
                                )}
                            </p>
                        </div>
                    </Fragment>
                );
            },
        };

        return steps[step] ? steps[step]() : null;
    };

    const renderUnstaking = (): React.ReactElement => {
        return (
            <Fragment>
                {/* Asks the user to confirm the Unstaking */}
                <h1 className="StakingOptionsModal_Title">
                    {t("staking.modal.StakingOptionsModal_UnstakeTitle")}
                </h1>
                <div className="tx-amount-group">
                    <div className="tx-amount-container">
                        <div className="tx-amount-data">
                            {/* {t('staking.modal.StakingOptionsModal_AmountToUnstake')} */}
                            <div className="tx-amount">
                                {PrecisionNumbers({
                                    amount: amount || 0n,
                                    token: settings.tokens.TG[0],
                                    decimals: Number(
                                        t("staking.display_decimals")
                                    ),
                                    //numericLabelParams: {},
                                    i18n: i18n,
                                    //skipContractConvert: true,
                                })}
                                <div className="tx-token">
                                    {t("staking.tokens.TG.abbr", {
                                        ns: ns,
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="cta-container">
                        <div className="cta-info-group">
                            <div className="cta-info-detail">
                                {t(
                                    "staking.modal.StakingOptionsModal_UnstakingDescription"
                                )}
                            </div>
                        </div>
                        <div className="cta-options-group">
                            <Button
                                type="default"
                                onClick={onClose}
                                className="button secondary"
                            >
                                {t("staking.modal.StakingOptionsModal_Cancel")}
                            </Button>
                            <Button
                                type="primary"
                                onClick={UnStake}
                                className="button"
                            >
                                {t("staking.modal.StakingOptionsModal_Comfirm")}
                            </Button>
                        </div>
                    </div>
                </div>
            </Fragment>
        );
    };

    const renderWithdraw = (): React.ReactElement => {
        return (
            <Fragment>
                {/* Asks the user to confirm Withdraw */}
                <h1 className="StakingOptionsModal_Title">
                    {t("staking.modal.StakingOptionsModal_WithdrawTitle")}
                </h1>
                <div className="ant-modal-body">
                    <div className="tx-amount-group">
                        <div className="tx-amount-container">
                            <div className="tx-amount-data">
                                <div className="tx-amount">
                                    {PrecisionNumbers({
                                        amount: amount || 0n,
                                        token: settings.tokens.TG[0],
                                        decimals: Number(
                                            t("staking.display_decimals")
                                        ),
                                        //numericLabelParams: {},
                                        i18n: i18n,
                                        //skipContractConvert: false,
                                    })}{" "}
                                    <div className="tx-token">
                                        {t("staking.tokens.TG.abbr", {
                                            ns: ns,
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="tx-amount-info">
                                {t(
                                    "staking.modal.StakingOptionsModal_AmountToWithdraw"
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="cta-container">
                        <div className="cta-info-group">
                            <div className="cta-info-detail">
                                {t(
                                    "staking.modal.StakingOptionsModal_WithdrawDescription"
                                )}
                            </div>
                        </div>
                        <div className="cta-options-group">
                            <Button
                                type="default"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("staking.modal.StakingOptionsModal_Cancel")}
                            </Button>
                            <Button
                                type="primary"
                                className="button"
                                onClick={withdraw}
                            >
                                {t("staking.modal.StakingOptionsModal_Comfirm")}
                            </Button>
                        </div>
                    </div>
                </div>
            </Fragment>
        );
    };

    const renderRestaking = (): React.ReactElement => {
        return (
            <Fragment>
                {/* Asks to confirm RESTAKE */}
                <h1 className="StakingOptionsModal_Title">
                    {t("staking.modal.StakingOptionsModal_RestakeTitle")}
                </h1>
                <div className="ant-modal-body">
                    <div className="tx-amount-group">
                        <div className="tx-amount-container">
                            <div className="tx-amount-data">
                                <div className="tx-amount">
                                    {PrecisionNumbers({
                                        amount: amount || 0n,
                                        token: settings.tokens.TG[0],
                                        decimals: Number(
                                            t("staking.display_decimals")
                                        ),
                                        i18n: i18n,
                                    })}
                                    <div className="tx-token">
                                        {t("staking.tokens.TG.abbr", {
                                            ns: ns,
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="tx-amount-info">
                                {t(
                                    "staking.modal.StakingOptionsModal_AmountToRestake"
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="cta-container">
                        <div className="cta-info-detail">
                            {t(
                                "staking.modal.StakingOptionsModal_RestakeDescription"
                            )}
                        </div>

                        <div className="cta-options-group">
                            <Button
                                type="default"
                                className="button secondary"
                                onClick={onClose}
                            >
                                {t("staking.modal.StakingOptionsModal_Cancel")}
                            </Button>
                            <Button
                                type="primary"
                                className="button"
                                onClick={CancelWithdraw}
                            >
                                {t("staking.modal.StakingOptionsModal_Comfirm")}
                            </Button>
                        </div>
                    </div>
                </div>
            </Fragment>
        );
    };

    const render = (): React.ReactElement | null => {
        const modes: Record<ModeType, () => React.ReactElement | null> = {
            staking: renderStaking,
            unstaking: renderUnstaking,
            withdraw: renderWithdraw,
            restake: renderRestaking,
        };
        return modes[mode as ModeType] ? modes[mode as ModeType]() : null;
    };

    return (
        <Modal
            className="StakingOptionsModal"
            open={visible}
            onCancel={onClose}
            footer={null}
            centered={true}
            maskClosable={false}
            maskStyle={{}}
        >
            {render()}
        </Modal>
    );
}
