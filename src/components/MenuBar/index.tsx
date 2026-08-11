import "./Styles.scss";

import Branding from "./Branding";
import Configuration from "./Configuration";
import MenuOptions from "./MenuOptions";
import Wallet from "./Wallet";

export interface MenuBarProps {
    maxVisibleMenuItems?: number;
}

export default function MenuBar({ maxVisibleMenuItems = 6 }: MenuBarProps): JSX.Element {
    return (
        <header className="menu-bar">
            <Branding />
            <MenuOptions maxVisibleItems={maxVisibleMenuItems} />
            <div className="menu-bar__actions">
                <Configuration />
                <Wallet />
            </div>
        </header>
    );
}
