import React, { Fragment } from "react";
import LastOperations from "../../components/Tables/LastOperations";
import Portfolio from "../../components/Dashboards/Portfolio";
import HomeTabs from "../../components/PortfolioOperationsTabs";

import "./Styles.scss";


export default function Home(): React.ReactElement {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    
    return (
        <>
            {isMobile ? (
                <div className="mobile-only">
                    <HomeTabs />
                </div>
            ) : (
                <div className="section-container desktop-only">
                    <Portfolio />
                    <div className="content-last-operations">
                        <LastOperations token={"all"}></LastOperations>
                    </div>
                </div>
            )}
        </>
    );
}
