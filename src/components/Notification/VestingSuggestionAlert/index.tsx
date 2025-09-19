import React from "react";
import { Alert, Button } from "antd";

import { useProjectTranslation } from "../../../helpers/translations";
import { useWalletContext } from "../../../context/Wallet";
import "./Styles.scss";

interface VestingSuggestionAlertProps {
    /** Vesting address that is available to be enabled/selected */
    vestingAddress?: string;
    /** Whether the vesting address is currently selected/active */
    isVestingSelected: boolean;
}

export default function VestingSuggestionAlert(
    props: VestingSuggestionAlertProps
): React.ReactElement | null {
    const { t } = useProjectTranslation();
    const { onShowModalAccount } = useWalletContext();

    const truncateAddress = (address: string): string => {
        if (!address) return "";
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const space = "\u00A0";

    const onDisplayAccount = (): void => {
        // Opens the accounts/modal so the user can enable/select the vesting address
        onShowModalAccount();
    };

    // If vesting is already selected, do not show the suggestion alert
    if (props.isVestingSelected) return null;

    return (
        <Alert
            className="alert alert-info"
            type="error"
            showIcon
            message={
                // New i18n key suggesting vesting can be enabled
                "VESTING DISPONIBLE, USALA " +
                t("vesting.suggestion.title", "Vesting address available")
            }
            description={
                <div>
                    <div className="address desktop-only">
                        {
                            // Label for the address row
                            t(
                                "vesting.suggestion.addressLabel",
                                "Available vesting address:"
                            )
                        }
                        {space}
                        {props.vestingAddress ||
                            t("common.notAvailable", "N/A")}
                    </div>

                    <div className="address mobile-only">
                        {t(
                            "vesting.suggestion.addressLabel",
                            "Available vesting address:"
                        )}
                        {space}
                        {truncateAddress(props.vestingAddress || "") ||
                            t("common.notAvailable", "N/A")}
                    </div>

                    <div>
                        {
                            // Short explanation prompting the user to switch
                            t(
                                "vesting.suggestion.explanation",
                                "You can switch to your vesting address to receive vested rewards."
                            )
                        }
                    </div>
                </div>
            }
            action={
                <Button size="small" type="default" onClick={onDisplayAccount}>
                    {
                        // CTA to open the account modal and enable vesting address
                        t("vesting.suggestion.cta", "Enable vesting address")
                    }
                </Button>
            }
        />
    );
}
