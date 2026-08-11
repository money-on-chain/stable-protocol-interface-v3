import "./Styles.scss";

import settings from "../../../settings";

export default function Branding(): JSX.Element {
    return (
        <div className="menu-bar-branding">
            <div aria-label={settings.dapp.name} className="menu-bar-branding__logo" role="img" />
        </div>
    );
}
