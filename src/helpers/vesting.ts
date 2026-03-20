import type { PublicClient } from "viem";
import { readContract } from "viem/actions";

import VestingMachine from "../contracts/omoc/VestingMachine.json";

const loadVestingAddressesFromLocalStorage = (
    accountAddress: string
): string[] => {
    if (
        !accountAddress ||
        accountAddress === "" ||
        accountAddress === undefined
    ) {
        return [];
    }
    const storageVestingAddresses = localStorage.getItem(
        `vesting-addresses-${accountAddress.toLowerCase()}`
    );
    if (storageVestingAddresses === null) return [];
    try {
        const parsed = JSON.parse(storageVestingAddresses) as unknown;
        return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
        return [];
    }
};

const saveVestingAddressesToLocalStorage = (
    accountAddress: string,
    vAddresses: string[]
): void => {
    // Store vesting addresses
    const sVestingAddresses = JSON.stringify(vAddresses);
    // save to storage addresses
    localStorage.setItem(
        `vesting-addresses-${accountAddress.toLowerCase()}`,
        sVestingAddresses
    );
};

const saveDefaultVestingToLocalStorage = (
    accountAddress: string,
    vAddress: string
): void => {
    // Save as the default vesting also
    localStorage.setItem(
        `default-vesting-address-${accountAddress.toLowerCase()}`,
        vAddress
    );
};

const loadDefaultVestingFromLocalStorage = (
    accountAddress: string
): string | null => {
    // Save as the default vesting also
    if (accountAddress === undefined) return null;
    return localStorage.getItem(
        `default-vesting-address-${accountAddress.toLowerCase()}`
    );
};

const loadVesting = async (
    publicClient: PublicClient,
    vAddress: `0x${string}`
): Promise<boolean> => {
    let loaded = false;
    try {
        const holder = (await readContract(publicClient, {
            address: vAddress,
            abi: VestingMachine.abi,
            functionName: "getHolder",
            args: [],
        })) as string;

        void holder; // confirm the contract call succeeded
        loaded = true;
    } catch (error) {
        console.error(`Invalid Vesting address: ${String(error)}`);
    }

    return loaded;
};

const onValidateVestingAddress = async (
    publicClient: PublicClient,
    addVestingAddress: `0x${string}`
): Promise<boolean> => {
    // 1. Input address valid
    if (addVestingAddress === undefined || addVestingAddress === null) {
        return false;
    } else if (addVestingAddress.length < 42 || addVestingAddress.length > 42) {
        return false;
    }

    try {
        const holder = (await readContract(publicClient, {
            address: addVestingAddress,
            abi: VestingMachine.abi,
            functionName: "getHolder",
            args: [],
        })) as string;

        void holder;
        return true;
    } catch (error) {
        console.error(`Invalid Vesting address: ${String(error)}`);
    }

    return false;
};

export {
    loadDefaultVestingFromLocalStorage,
    loadVesting,
    loadVestingAddressesFromLocalStorage,
    onValidateVestingAddress,
    saveDefaultVestingToLocalStorage,
    saveVestingAddressesToLocalStorage,
};
