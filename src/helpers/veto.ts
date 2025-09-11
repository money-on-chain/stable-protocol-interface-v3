export function tcLockedByVeto(userVeto: any, contractStatusOmoc: any, userAddress: string): {tcAddress: string, proposal: string, amount: bigint}[] {
    if (!userVeto || !contractStatusOmoc || !userAddress) return [];
    const [winnerProposal] = contractStatusOmoc.votingmachine.getVotingData;
    const state = contractStatusOmoc.votingmachine.getState;
    let proposalOnGoing = "";
    if (state == 1) proposalOnGoing = winnerProposal;   
    const lockedTokens: {tcAddress: string, proposal: string, amount: bigint}[] = [];
    Object.entries(userVeto.vetoMachine.getUserLockedAmount[userAddress]).forEach(([tcAddress, proposals]) => {
        Object.entries(proposals).forEach(([proposal, amount]) => {
            if (amount && amount > 0n && proposal !== proposalOnGoing) {
                lockedTokens.push({ tcAddress, proposal, amount  });
            }
        });
    });
    return lockedTokens;
}

export function isSomeTCLockedByVeto(userVeto: any, contractStatusOmoc: any, userAddress: string): boolean {
    const lockedTokens = tcLockedByVeto(userVeto, contractStatusOmoc, userAddress);
    return lockedTokens.length > 0;
}
