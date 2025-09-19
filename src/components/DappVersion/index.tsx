import React from "react";

import { useProjectTranslation } from "../../helpers/translations";

export default function DappVersion(): React.ReactElement {
    const { t } = useProjectTranslation();

    return (
        <>
            <div className="dappVersion">
                {t("settings.protocolName")} {import.meta.env.REACT_APP_VERSION}
            </div>
        </>
    );
} 