import VestingMachine from "../contracts/omoc/VestingMachine.json";

interface Auth {
    web3: {
        eth: {
            Contract: new (abi: any, address: string) => any;
        };
    };
    loadContractsStatusAndUserBalance: () => Promise<any>;
}

const loadVestingAddressesFromLocalStorage = (accountAddress: string): string[] => {
    const storageVestingAddresses = localStorage.getItem(
        `vesting-addresses-${accountAddress.toLowerCase()}`
    );
    let vestingAddresses: string[] = [];
    if (storageVestingAddresses !== null) {
        vestingAddresses = JSON.parse(storageVestingAddresses);
    }
    return vestingAddresses;
};

const saveVestingAddressesToLocalStorage = (accountAddress: string, vAddresses: string[]): void => {
    // Store vesting addresses
    const sVestingAddresses = JSON.stringify(vAddresses);
    // save to storage addresses
    localStorage.setItem(
        `vesting-addresses-${accountAddress.toLowerCase()}`,
        sVestingAddresses
    );
};

const saveDefaultVestingToLocalStorage = (accountAddress: string, vAddress: string): void => {
    // Save as the default vesting also
    localStorage.setItem(
        `default-vesting-address-${accountAddress.toLowerCase()}`,
        vAddress
    );
};

const loadDefaultVestingFromLocalStorage = (accountAddress: string): string | null => {
    // Save as the default vesting also
    return localStorage.getItem(
        `default-vesting-address-${accountAddress.toLowerCase()}`
    );
};

const loadVesting = async (auth: Auth, vAddress: string): Promise<boolean> => {
    let loaded = false;
    try {
        const vestingMachine = new auth.web3.eth.Contract(
            VestingMachine.abi,
            vAddress
        );
        const holder = await vestingMachine.methods.getHolder().call();
        console.log(`Loaded Vesting Machine: ${vAddress} Holder: ${holder} `);
        (window as any).dContracts.contracts.VestingMachine = vestingMachine;
        loaded = true;

        auth.loadContractsStatusAndUserBalance().then((/*value*/) => {
            console.log("Refresh user balance OK!");
        });
    } catch (error) {
        console.log(`Invalid Vesting address: ${error}`);
    }

    return loaded;
};

const onValidateVestingAddress = async (auth: Auth, addVestingAddress: string): Promise<boolean> => {
    // 1. Input address valid
    if (addVestingAddress === "") {
        return false;
    } else if (addVestingAddress.length < 42 || addVestingAddress.length > 42) {
        return false;
    }

    try {
        const vestingMachine = new auth.web3.eth.Contract(
            VestingMachine.abi,
            addVestingAddress
        );
        const holder = await vestingMachine.methods.getHolder().call();
        console.log("Holder: ", holder);

        return true;
    } catch (error) {
        console.log(`Invalid Vesting address: ${error}`);
    }

    return false;
};

export {
    loadVestingAddressesFromLocalStorage,
    saveVestingAddressesToLocalStorage,
    saveDefaultVestingToLocalStorage,
    loadVesting,
    onValidateVestingAddress,
    loadDefaultVestingFromLocalStorage,
};
