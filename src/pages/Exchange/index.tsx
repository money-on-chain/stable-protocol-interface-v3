import React, { Fragment, useState, useEffect } from "react";
import { useContext } from "react";
import { Skeleton } from "antd";
import { AuthenticateContext } from "../../context/Auth";
import LastOperations from "../../components/Tables/LastOperations";
import { useProjectTranslation } from "../../helpers/translations";
import Exchange from "../../components/Exchange";
import "./Styles.scss";

export default function SectionExchange(): React.ReactElement {
    const { t } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);
    const [ready, setReady] = useState<boolean>(false);
    
    useEffect(() => {
        if (auth.contractStatusData && auth.userBalanceData) {
            setReady(true);
        }
    }, [auth]);

    return (
        <Fragment>
            <div className="section-container">
                {/* Exchange */}
                <div className={"layout-card"}>
                    <div className={"layout-card-title"}>
                        <h1>{t("exchange.cardTitle")}</h1>
                    </div>

                    <div className={"content-body layout-card-content"}>
                        {ready ? <Exchange /> : <Skeleton active />}
                    </div>
                </div>

                <div className="section__innerCard--big content-last-operations">
                    <LastOperations token={"all"}></LastOperations>
                </div>
            </div>
        </Fragment>
    );
}
