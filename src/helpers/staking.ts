interface TokenMap {
    [key: string]: string[];
}

interface DelayMachine {
    getTransactions: [bigint[], bigint[], bigint[]];
}

interface Withdrawal {
    id: bigint;
    amount: bigint;
    expiration: bigint;
}

function loadTokenMap(): TokenMap {
    const tMap: TokenMap = {};
    tMap["TG"] = ["TG"];
    return tMap;
}

const tokenMap = loadTokenMap();
const tokenStake = (): string[] => Object.keys(tokenMap);

const pendingWithdrawalsFormat = (delaymachine: DelayMachine): Withdrawal[] => {
    const [ids, amounts, expirations] = delaymachine.getTransactions;
    const withdraws: Withdrawal[] = [];
    for (let i = 0; i < ids.length; i++) {
        withdraws.push({
            id: ids[i],
            amount: amounts[i],
            expiration: expirations[i],
        });
    }
    return withdraws;
};

const formatTimestamp = (timestamp: number): string => {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(timestamp);
};

export { formatTimestamp, pendingWithdrawalsFormat, tokenStake };
