import React, { Fragment, useContext, useEffect, useState } from "react";
import { useProjectTranslation } from "../../../../helpers/translations";
import { useWalletContext } from "../../../../context/Wallet";

import "../../Styles.scss";
import { getCurrencyByValue, getTCTokenIndex, TokenSettings } from "@/helpers/currencies";
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
    name: string;
    image: any;
    lockedAmount: bigint;
    proposal: string;
}

const VetoWithdraw: React.FC = () => {
    const { t } = useProjectTranslation();

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
        
        const lockedByVeto = tcLockedByVeto(userVeto.data, address);
        lockedByVeto.forEach((locked) => {
            const tcIndex = getTCTokenIndex(contractsAddress.CollateralToken, locked.tcAddress);
            const tokenInfo: InfoUserTC = {
                address: locked.tcAddress,
                name: TokenSettings("TC_" + tcIndex).name,
                image: getCurrencyByValue("TC_" + tcIndex).image,
                lockedAmount: locked.amount,
                proposal: locked.proposal,
            };
            cDataUser["InfoUserTC"].push(tokenInfo);
        });
        setInfoUser(cDataUser);
    };

    const onVetoWithdraw = async (proposal: string, tcAddress: string): Promise<void> => {
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
    return (
        <div className="vetoPage__tokenTitle">
            {token.name} available to withdraw
            <div className="voting__status__container">
                        <div className="token__icon">
                            {token.image}
                        </div>
                        <div className="token__amount">
                            {`amount ${token.lockedAmount}`}
                        </div>
                <div className="cta">
                    <div className="cta-container">
                        <button 
                            className="button"
                            onClick={() => onVetoWithdraw(token.proposal, token.address)}
                        >
                            Withdraw
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

    return (
        <div className="section-container">
            {/* <div className="content-page"> */}
            <div className={"layout-card"}>
                <div className={"layout-card-title"}>
                    <h1>{"Withdraw tokens after vetoing"}</h1>
                </div>
                <div className="section voting">
                    <div className="voting__status__container">
                        {infoUser.InfoUserTC.map((token, index) => (
                            <VetoWithdrawTokenCard key={index} token={token} />
                        ))}
                    </div>
                                            {isOperationModalVisible && (
                            <VetoStatusModal
                                title={modalTitle}
                                visible={isOperationModalVisible}
                                onCancel={() =>
                                    setIsOperationModalVisible(false)
                                }
                                operationStatus={operationStatus}
                                txHash={txHash}
                            />
                        )}
                </div>
            </div>
        </div>
    );
};

export default VetoWithdraw;
