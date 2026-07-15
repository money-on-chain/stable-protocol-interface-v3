import "../Home/Styles.scss";

import React from "react";

import PortfolioV1 from "../../components/Dashboards/PortfolioV1";

// LastOperations is deliberately left out here — moc-v1's operations history
// is being built last (see project_v1_support_plan.md Epic 4). Once it lands,
// this should gain the same mobile HomeTabs split as pages/Home/index.tsx.
// No desktop-only/mobile-only split for now either: those classes exist to
// swap in the mobile tab switcher between Portfolio and LastOperations, not to
// hide Portfolio itself — Styles.scss already has a responsive override for
// .dashboard-portfolio, so this renders fine on both without it.
export default function HomeV1(): React.ReactElement {
    return (
        <div className="section-container notification-container">
            <PortfolioV1 />
        </div>
    );
}
