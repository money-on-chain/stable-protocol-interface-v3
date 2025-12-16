import "./Styles.scss";

import React from "react";

import Portfolio from "../../components/Dashboards/Portfolio";
import HomeTabs from "../../components/PortfolioOperationsTabs";
import LastOperations from "../../components/Tables/LastOperations";

export default function Home(): React.ReactElement {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    return (
        <>
            {isMobile ? (
                <div className="mobile-only">
                    <HomeTabs />
                </div>
            ) : (
                <div className="section-container notification-container desktop-only ">
                    <Portfolio />
                    <div className="content-last-operations">
                        <LastOperations token={"all"} />
                    </div>
                </div>
            )}
        </>
    );
}
