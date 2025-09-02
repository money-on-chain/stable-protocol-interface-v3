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
                </div>
            </div>
        </div>
    );
};

export default VetoWithdraw;

const VetoWithdrawTokenCard: React.FC<{ token: any }> = ({ token }) => {
    return (
        <div className="vetoPage__tokenTitle">
            {token.name} available to withdraw
            <div className="voting__status__container">
                        <div className="token__icon">
                            {token.image}
                        </div>
                        <div className="token__amount">
                            amount 100.00
                        </div>
                <div className="cta">
                    <div className="cta-container">
                        <button className="button">
                            Withdraw
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
