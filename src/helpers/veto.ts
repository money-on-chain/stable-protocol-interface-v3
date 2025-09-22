export function tcLockedByVeto(
    userVeto: { vetoMachine: { getUserLockedAmount: Record<string, Record<string, bigint>> } },
    contractStatusOmoc: { votingmachine: { getVotingData: [string, bigint, bigint, bigint]; getState: number } },
    userAddress: string
): { tcAddress: string; proposal: string; amount: bigint }[] {
    if (!userVeto || !contractStatusOmoc || !userAddress) return [];
    const [winnerProposal] = contractStatusOmoc.votingmachine.getVotingData;
    const state = contractStatusOmoc.votingmachine.getState;
    let proposalOnGoing = "";
    if (state === 1) proposalOnGoing = winnerProposal;
    const lockedTokens: {
        tcAddress: string;
        proposal: string;
        amount: bigint;
    }[] = [];
    const userLockedAmount = userVeto.vetoMachine.getUserLockedAmount[userAddress];
    if (userLockedAmount) {
        Object.entries(userLockedAmount).forEach(([tcAddress, proposals]) => {
            if (proposals && typeof proposals === 'object') {
                Object.entries(proposals as Record<string, bigint>).forEach(([proposal, amount]) => {
                    if (amount && amount > 0n && proposal !== proposalOnGoing) {
                        lockedTokens.push({ tcAddress, proposal, amount });
                    }
                });
            }
        });
    }
    return lockedTokens;
}

export function isSomeTCLockedByVeto(
    userVeto: { vetoMachine: { getUserLockedAmount: Record<string, Record<string, bigint>> } },
    contractStatusOmoc: { votingmachine: { getVotingData: [string, bigint, bigint, bigint]; getState: number } },
    userAddress: string
): boolean {
    const lockedTokens = tcLockedByVeto(
        userVeto,
        contractStatusOmoc,
        userAddress
    );
    return lockedTokens.length > 0;
}
