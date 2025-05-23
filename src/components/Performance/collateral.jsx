import React, { useContext } from "react";
import BigNumber from "bignumber.js";

import { useProjectTranslation } from "../../helpers/translations";
import { PrecisionNumbers } from "../PrecisionNumbers";
import { TokenSettings } from "../../helpers/currencies";
import { AuthenticateContext } from "../../context/Auth";
import settings from "../../settings/settings.json";

export default function CollateralAssets() {
    const { i18n } = useProjectTranslation();
    const auth = useContext(AuthenticateContext);

    return (
        <div className="list-tokens">
            {settings.tokens.CA.map(function (token, i) {
                return (
                    <div className="row-token" key={i}>
                        <div className="coll-1">
                            <div className="token">
                                <div
                                    className={`icon-token-ca_${i} token__icon`}
                                ></div>
                                <div className="token__name">
                                    {settings.tokens.CA?.[i]?.fullName ??
                                        settings.tokens.CA?.[i]?.name}
                                </div>
                            </div>
                        </div>
                        <div className="coll-2">
                            <div className="amount-token">
                                {!auth.contractStatusData.canOperate
                                    ? "--"
                                    : PrecisionNumbers({
                                          amount: auth.contractStatusData
                                              ? auth.contractStatusData[i]
                                                    .getACBalance
                                              : new BigNumber(0),
                                          token: TokenSettings(`CA_${i}`),
                                          decimals: 2,
                                          i18n: i18n,
                                          skipContractConvert: false,
                                      })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
