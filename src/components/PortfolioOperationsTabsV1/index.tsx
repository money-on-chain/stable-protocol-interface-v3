import "../PortfolioOperationsTabs/Styles.scss";

import React, { useState } from "react";

import { useProjectTranslation } from "../../helpers/translations";
import PortfolioV1 from "../Dashboards/PortfolioV1";
import ListOperationsV1 from "../Tables/ListOperationsV1";

interface Tab {
    id: number;
    name: string;
}

// v1 port of PortfolioOperationsTabs (mobile Portfolio/LastOperations tab
// switcher), swapping in PortfolioV1 + ListOperationsV1.
export default function HomeTabsV1(): React.ReactElement {
    const { t } = useProjectTranslation();

    const tabs: Tab[] = [
        { id: 0, name: t("portfolio.mobileTabs.portfolio") },
        { id: 1, name: t("portfolio.mobileTabs.lastOperations") },
    ];

    const [activeTab, setActiveTab] = useState<number>(tabs[0].id);

    return (
        <>
            <div className="tab__container">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={
                            activeTab === tab.id
                                ? "tab__button tab__selected"
                                : "tab__button"
                        }
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.name}
                    </button>
                ))}
            </div>

            <div>
                {activeTab === tabs[0].id ? (
                    <div className="section-container">
                        <PortfolioV1 />
                    </div>
                ) : (
                    <div className="content-last-operations">
                        <ListOperationsV1 token="all" />
                    </div>
                )}
            </div>
        </>
    );
}
