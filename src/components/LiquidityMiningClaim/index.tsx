import React, { Fragment } from "react";
import { useProjectTranslation } from "../../helpers/translations";
import { Button } from "antd";
import PerformanceChart from "../Staking/performanceChart";
//import { AuthenticateContext } from '../../context/Auth';
import LiquidityMiningClaims from "../Tables/LiquidityMiningClaims";
import "./Styles.scss";

export default function LiquidityMiningClaim(): React.ReactElement {
    //const auth = useContext(AuthenticateContext);
    const { t } = useProjectTranslation();

    const space = "\u00A0";

    return (
        <Fragment>
            <div className="section row-section">
                <div className="firstCardsGroup">
                    <div id="claimCard" className="layout-card">
                        <div className="layout-card-title">
                            <h1>{t("liquidityMining.cardTitle")}</h1>
                        </div>

                        <div className="cta-container">
                            <div className="cta-info-group">
                                <div className="cta-info-detail">
                                    {t("liquidityMining.cta.infoDetail")}
                                </div>
                                <div className="cta-info-summary">
                                    23984723948{space}
                                    {t("liquidityMining.cta.infoSummary")}
                                </div>
                            </div>
                            <div className="cta-options-group">
                                <Button type="primary" className={"button"}>
                                    {t("liquidityMining.cta.button")}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div id="performanceCard" className="layout-card">
                        <div className="layout-card-title">
                            <h1>{t("staking.performance.title")}</h1>
                        </div>
                        <div className="tab-content">
                            <div className="stakeCTA">
                                {t("liquidityMining.stakingCTA.explanation")}
                                <button className="button secondary">
                                    {t("liquidityMining.stakingCTA.button")}
                                </button>
                            </div>
                            <PerformanceChart />
                        </div>
                    </div>
                </div>
                <div className="secondCardsGroup">
                    <LiquidityMiningClaims />
                </div>
            </div>
        </Fragment>
    );
}
