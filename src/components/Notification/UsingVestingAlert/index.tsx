import React, { useContext } from "react";
import { Alert, Button } from "antd";

import { useProjectTranslation } from "../../../helpers/translations";
import { AuthenticateContext } from "../../../context/Auth";
import "./Styles.scss";

interface UseVestingAlertProps {
    address?: string;
}

interface AuthContext {
    onShowModalAccount: (show: boolean) => void;
}

export default function UseVestingAlert(props: UseVestingAlertProps): React.ReactElement {
    const { t } = useProjectTranslation();
    const auth = useContext(AuthenticateContext) as AuthContext;

    const truncateAddress = (address: string): string => {
        return (
            address.substring(0, 6) +
            "..." +
            address.substring(address.length - 4, address.length)
        );
    };
    const space = "\u00A0";

    const onDisplayAccount = (): void => {
        auth.onShowModalAccount(true);
    };

    return (
        <Alert
            className="alert alert-info"
            message={t("vesting.alert.title")}
            description={
                <div>
                    <div className="address desktop-only">
                        {t("vesting.alert.address")}
                        {space} {props.address}
                    </div>
                    <div className="address mobile-only">
                        {t("vesting.alert.address")}
                        {space}
                        {truncateAddress(props.address || "")}
                    </div>
                    <div>{t("vesting.alert.explanation")}</div>
                </div>
            }
            type="error"
            showIcon
            action={
                <Button size="small" type="default" onClick={onDisplayAccount}>
                    {t("vesting.alert.cta")}
                </Button>
            }
        />
    );
} 