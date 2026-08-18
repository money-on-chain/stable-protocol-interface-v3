import "../Home/Styles.scss";

import React from "react";

import PortfolioDashboardV1 from "../../components/Dashboards/PortfolioDashboardV1";
import PortfolioV1 from "../../components/Dashboards/PortfolioV1";
import HomeTabsV1 from "../../components/PortfolioOperationsTabsV1";
import ListOperationsV1 from "../../components/Tables/ListOperationsV1";

export default function HomeV1(): React.ReactElement {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    return (
        <>
            {isMobile ? (
                <div className="mobile-only">
                    <HomeTabsV1 />
                </div>
            ) : (
                <div className="section-container notification-container desktop-only">
                    <PortfolioDashboardV1 />
                    <PortfolioV1 />
                    <div className="content-last-operations">
                        <ListOperationsV1 token="all" />
                    </div>
                </div>
            )}
        </>
    );
}
