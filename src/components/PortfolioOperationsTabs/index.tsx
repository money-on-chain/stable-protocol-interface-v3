import "./Styles.scss";

import React, { useState } from "react";

import Portfolio from "../../components/Dashboards/Portfolio";
import { useProjectTranslation } from "../../helpers/translations";
import ListOperationsMobile from "../Tables/LastOperations";

interface Tab {
    id: number;
    name: string;
}

export default function HomeTabs(): React.ReactElement {
    const { t } = useProjectTranslation();
    
    //const [ready, setReady] = useState(false);

    /*
    useEffect(() => {
        if (auth.contractStatusData) {
            setReady(true);
        }
    }, [auth]);*/

    // Tabs for mobile
    const tabs: Tab[] = [
        { id: 0, name: t(`portfolio.mobileTabs.portfolio`) },
        { id: 1, name: t(`portfolio.mobileTabs.lastOperations`) },
    ];

    // Active tab status control

    const [activeTab, setActiveTab] = useState<number>(tabs[0].id);

    return (
        <>
            {/* TabBar Buttons*/}
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

            {/* Content based on selected tab */}
            <div>
                {activeTab === tabs[0].id ? (
                    <div className="section-container">
                        <Portfolio />
                    </div>
                ) : (
                    <div className="content-last-operations">
                        <ListOperationsMobile
                            token={"all"}
                        ></ListOperationsMobile>
                    </div>
                )}
            </div>
        </>
    );
}
