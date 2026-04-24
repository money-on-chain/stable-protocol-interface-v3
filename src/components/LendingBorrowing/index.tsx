import "./Styles.scss";

import React from "react";
import { useSearchParams } from "react-router-dom";

import { LEND_CARDS } from "./Lend/data";
import LendEarn from "./LendEarn";
import LendWithdraw from "./LendWithdraw";
import Overview from "./Overview";

const LendingBorrowing: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get("view");
    const tokenId = searchParams.get("token");
    const selectedToken =
        LEND_CARDS.find((card) => card.id === tokenId) || null;
    const isLendEarnView = view === "lend-earn" && !!selectedToken;
    const isLendWithdrawView = view === "lend-withdraw" && !!selectedToken;

    const updateSearchParams = (
        updater: (params: URLSearchParams) => void
    ) => {
        const nextParams = new URLSearchParams(searchParams);
        updater(nextParams);
        setSearchParams(nextParams);
    };

    return (
        <div className="section-container">
            {!isLendEarnView && !isLendWithdrawView ? (
                <Overview
                    onOpenLendEarn={(token) =>
                        updateSearchParams((params) => {
                            params.set("view", "lend-earn");
                            params.set("token", token.id);
                        })
                    }
                    onOpenLendWithdraw={(token) =>
                        updateSearchParams((params) => {
                            params.set("view", "lend-withdraw");
                            params.set("token", token.id);
                        })
                    }
                />
            ) : isLendEarnView ? (
                <LendEarn
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                    token={selectedToken}
                />
            ) : (
                <LendWithdraw
                    onBack={() =>
                        updateSearchParams((params) => {
                            params.delete("view");
                            params.delete("token");
                        })
                    }
                    token={selectedToken}
                />
            )}
        </div>
    );
};

export default LendingBorrowing;
