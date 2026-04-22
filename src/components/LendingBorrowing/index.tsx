import "./Styles.scss";

import React from "react";

import LendEarn from "./LendEarn";
import Overview from "./Overview";
import type { LendingBorrowingView } from "./types";

const LendingBorrowing: React.FC = () => {
    const [view, setView] = React.useState<LendingBorrowingView>({
        screen: "overview",
    });

    return (
        <div className="section-container">
            {view.screen === "overview" ? (
                <Overview
                    onOpenLendEarn={(token) =>
                        setView({ screen: "lend-earn", token })
                    }
                />
            ) : (
                <LendEarn
                    onBack={() => setView({ screen: "overview" })}
                    token={view.token}
                />
            )}
        </div>
    );
};

export default LendingBorrowing;
