import "./Styles.scss";

import React from "react";

import DappVersion from "../DappVersion";

export default function DappFooter(): React.ReactElement {
    return (
        <>
            <div className="dashboard-footer desktop-only">
                <DappVersion />
            </div>
        </>
    );
}
