import React, { Fragment, useContext, useEffect, useState } from "react";
import { useProjectTranslation } from "../../../../helpers/translations";
import { useWalletContext } from "../../../../context/Wallet";

import "../../Styles.scss";
import { getCurrencyByValue, TokenSettings } from "@/helpers/currencies";

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
    balance: bigint;
    vetoingPower: bigint;
    lockedAmount: bigint;
}

const VetoWithdraw: React.FC = () => {
    const { t } = useProjectTranslation();

    const {
        userOmocBalance,
        contractStatusOmoc,
        userBalance,
        contractsAddress,
        userVeto,
    } = useWalletContext();

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

        const cDataUser: InfoUser = { ...infoUser };

        cDataUser["InfoUserTC"] = [];
        contractsAddress.CollateralToken.forEach((tc, index) => {
            const tokenInfo: InfoUserTC = {
                address: tc.address,
                name: TokenSettings("TC_" + index).name,
                image: getCurrencyByValue("TC_" + index).image,
                balance: userBalance.data[index].TC.balance,
                lockedAmount: 0n,
                vetoingPower: 0n,
            };
            cDataUser["InfoUserTC"].push(tokenInfo);
        });
        setInfoUser(cDataUser);
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
                </div>
                {/* </div> */}
            </div>
        </div>
    );
};

export default VetoWithdraw;

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
                    <div className="token__amount">100.00</div>
                </div>
                <div className="cta">
                    <div className="cta-container">
                        <button className="button--small">
                            {t(`voting.veto.vetoWithdraw.button`)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
