import React from "react";
import ThemeMode from "../ThemeMode";
import DappVersion from "../DappVersion";
import "./Styles.scss";

export default function DappFooter(): React.ReactElement {
    return (
        <>
            <div className="dashboard-footer desktop-only">
                <DappVersion />
                <ThemeMode />
            </div>
        </>
    );
} 