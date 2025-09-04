export function tcLockedByVeto(userVeto: any, userAddress: string): {tcAddress: string, proposal: string, amount: bigint}[] {
    if (!userVeto || !userAddress) return [];
    const lockedTokens: {tcAddress: string, proposal: string, amount: bigint}[] = [];
    Object.entries(userVeto.vetoMachine.getUserLockedAmount[userAddress]).forEach(([tcAddress, proposals]) => {
        Object.entries(proposals).forEach(([proposal, amount]) => {
            //if (amount && amount > 0n) {
                lockedTokens.push({ tcAddress, proposal, amount  });
            //}
        });
    });
    return lockedTokens;
}

export function isSomeTCLockedByVeto(userVeto: any, userAddress: string): boolean {
    const lockedTokens = tcLockedByVeto(userVeto, userAddress);
    return lockedTokens.length > 0;
}