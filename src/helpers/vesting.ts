import { readContract } from 'viem/actions'
import VestingMachine from "../contracts/omoc/VestingMachine.json";



const loadVestingAddressesFromLocalStorage = (accountAddress: string): string[] => {    
    if (!accountAddress || accountAddress === "" || accountAddress === undefined) {
        return [];
    }
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
    if (accountAddress === undefined) return null;
    return localStorage.getItem(
        `default-vesting-address-${accountAddress.toLowerCase()}`
    );
};

const loadVesting = async (publicClient: any, vAddress: `0x${string}`): Promise<boolean> => {
    let loaded = false;
    try {
        
        const holder = await readContract(publicClient, {
            address: vAddress,
            abi: VestingMachine.abi,
            functionName: 'getHolder',
            args: [],
        }) as string;

        
        console.log(`Loaded Vesting Machine: ${vAddress} Holder: ${holder} `);        
        loaded = true;
        
    } catch (error) {
        console.log(`Invalid Vesting address: ${error}`);
    }

    return loaded;
};

const onValidateVestingAddress = async (publicClient: any, addVestingAddress: `0x${string}`): Promise<boolean> => {
    // 1. Input address valid
    if (addVestingAddress === "") {
        return false;
    } else if (addVestingAddress.length < 42 || addVestingAddress.length > 42) {
        return false;
    }

    try {

        const holder = await readContract(publicClient, {
            address: addVestingAddress,
            abi: VestingMachine.abi,
            functionName: 'getHolder',
            args: [],
        }) as string;
        
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
