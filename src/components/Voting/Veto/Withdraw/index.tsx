import "../../Styles.scss";

import React, { useEffect, useState } from "react";

import { PrecisionNumbers } from "@/components/PrecisionNumbers";

import { useWalletContext } from "../../../../context/Wallet";
import type {
    TokenConfig} from "../../../../helpers/currencies";
import {
    getCurrencyByValue,
    getTCTokenIndex,
    TokenSettings,
} from "../../../../helpers/currencies";
import { useProjectTranslation } from "../../../../helpers/translations";
import { tcLockedByVeto } from "../../../../helpers/veto";
import VetoStatusModal from "../../../Modals/VetoStatusModal/VetoStatusModal";

interface InfoUser {
    Voting_Power: bigint;
    Voting_Power_PCT: bigint;
    Total_Veto_Power: bigint;
    Total_Veto_Power_PCT: bigint;
    InfoUserTC: InfoUserTC[];
}

interface InfoUserTC {
    address: string;
    settings: TokenConfig;
    image: any;
    lockedAmount: bigint;
    proposal: string;
}

const VetoWithdraw: React.FC = () => {
    const { t, i18n } = useProjectTranslation();

    const {
        interfaceVetoWithdraw,
        userOmocBalance,
        contractStatusOmoc,
        address,
        contractsAddress,
        userVeto,
    } = useWalletContext();

    const [isOperationModalVisible, setIsOperationModalVisible] =
        useState<boolean>(false);
    const [modalTitle, setModalTitle] = useState<string>("Veto Withdraw");
    const [txHash, setTxHash] = useState<string>("");
    const [operationStatus, setOperationStatus] = useState<string>("sign");

    const defaultInfoUser: InfoUser = {
        Voting_Power: 0n,
        Voting_Power_PCT: 0n,
        Total_Veto_Power: 0n,
        Total_Veto_Power_PCT: 0n,
        InfoUserTC: [],
    };
    const [infoUser, setInfoUser] = useState<InfoUser>(defaultInfoUser);

    useEffect(() => {
        if (contractStatusOmoc.data && userOmocBalance.data && userVeto.data) {
            refreshData();
        }
    }, [contractStatusOmoc.data, userOmocBalance.data, userVeto.data]);

    const refreshData = (): void => {
        if (!contractStatusOmoc.data) return;
        if (!userOmocBalance.data) return;
        if (!userVeto.data) return;
        if (!address) return;

        const cDataUser: InfoUser = { ...infoUser };
        cDataUser["InfoUserTC"] = [];

        const lockedByVeto = tcLockedByVeto(userVeto.data, contractStatusOmoc.data, address);
        lockedByVeto.forEach((locked) => {
            const tcIndex = getTCTokenIndex(
                contractsAddress.CollateralToken,
                locked.tcAddress
            );
            const tokenInfo: InfoUserTC = {
                address: locked.tcAddress,
                settings: TokenSettings("TC_" + tcIndex),
                image: getCurrencyByValue("TC_" + tcIndex).image,
                lockedAmount: locked.amount,
                proposal: locked.proposal,
            };
            cDataUser["InfoUserTC"].push(tokenInfo);
        });
        setInfoUser(cDataUser);
    };

    const onVetoWithdraw = async (
        proposal: string,
        tcAddress: string
    ): Promise<void> => {
        setModalTitle("Veto withdraw");

        setOperationStatus("sign");
        setIsOperationModalVisible(true);

        const onTransaction = (txHash: string): void => {
            console.log("Sent transaction in Favor proposal...: ", txHash);
            setTxHash(txHash);
            setOperationStatus("pending");
        };
        const onReceipt = (/*receipt*/): void => {
            console.log("Transaction in Favor proposal mined!...");
            setOperationStatus("success");
        };
        const onError = (error: any): void => {
            console.log("Transaction in Favor proposal error!...:", error);
            setOperationStatus("error");
        };

        await interfaceVetoWithdraw(
            proposal,
            tcAddress,
            onTransaction,
            onReceipt,
            onError
        )
            .then((/*res*/) => {
                // Refresh status
                userOmocBalance.refetch();
                contractStatusOmoc.refetch();
                userVeto.refetch();
            })
            .catch((e) => {
                console.error(e);
                setOperationStatus("error");
            });
    };

    const VetoWithdrawTokenCard: React.FC<{ token: any }> = ({ token }) => {
        const { t } = useProjectTranslation();

        return (
            <div className="vetoWithdrawRow">
                <div className="withdrawItem">
                    <div className="vetoWithdrawToken">
                        <div className="token__icon">{token.image}</div>
                        <div className="token__name">{token.name}</div>
                    </div>
                    <div className="vetoWithdrawAmount">
                        <div className="token__amount">
                            {PrecisionNumbers({
                                amount: token.lockedAmount,
                                token: token.settings,
                                decimals: parseInt(
                                    t("staking.display_decimals")
                                ),
                                i18n: i18n,
                            })}
                        </div>
                    </div>
                    <div className="cta">
                        <div className="cta-container">
                            <button
                                className="button--small"
                                onClick={() =>
                                    onVetoWithdraw(
                                        token.proposal,
                                        token.address
                                    )
                                }
                            >
                                {t(`voting.veto.vetoWithdraw.button`)}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="section-container">
            <div className="layout-card">
                <div className="layout-card-title">
                    <h1>Withdraw tokens after vetoing</h1>
                </div>
                <div className="vetoWithdraw">
                    <div className="vetoWithdrawContainer">
                        <div className="vetoWithdrawList">
                            <div className="vetoWithdrawHeader">
                                <div className="vetoWithdrawToken">
                                    {t(`voting.veto.vetoWithdraw.headerToken`)}
                                </div>
                                <div className="vetoWithdrawAmount">
                                    {t(`voting.veto.vetoWithdraw.headerAmount`)}
                                </div>
                            </div>
                            {infoUser.InfoUserTC.map((token, index) => (
                                <VetoWithdrawTokenCard
                                    key={index}
                                    token={token}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="cta">
                        <div className="cta-container">
                            <div className="cta-info-group">
                                <div className="cta-info-detail">
                                    {t(`voting.veto.vetoWithdraw.note`)}
                                </div>
                            </div>
                            {/* <button className="button">Back to previous????</button> */}
                        </div>
                    </div>
                    {isOperationModalVisible && (
                        <VetoStatusModal
                            title={modalTitle}
                            visible={isOperationModalVisible}
                            onCancel={() => setIsOperationModalVisible(false)}
                            operationStatus={operationStatus}
                            txHash={txHash}
                        />
                    )}
                </div>
                {/* </div> */}
            </div>
        </div>
    );
};

export default VetoWithdraw;
