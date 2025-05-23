import { parseEventLogs, decodeEventLog } from "viem";
import { abi as abi_MocQueue } from "../../contracts/MocQueue.json";
import { abi as abi_Moc } from "../../contracts/MocCACoinbase.json";
import { abi as abi_MocVendors } from "../../contracts/MocVendors.json";
import { abi as abi_VestingFactory } from "../../contracts/omoc/VestingFactory.json";

const renderEvent = (evente) => {
    console.log("");
    console.log("\x1b[35m%s\x1b[0m", `Event: ${evente.eventName}`);
    console.log("");

    for (const [eveName, eveValue] of Object.entries(evente.args)) {
        console.log("\x1b[32m%s\x1b[0m", `${eveName}: ${eveValue}`);
    }
};

const getContractAbi = (contractName) => {
    let abi = abi_MocQueue;
    switch (contractName) {
        case "MocQueue":
            abi = abi_MocQueue;
            break;
        case "Moc":
            abi = abi_Moc;
            break;
        case "MocVendors":
            abi = abi_MocVendors;
            break;
        case "VestingFactory":
            abi = abi_VestingFactory;
            break;
        default:
            throw new Error("Invalid contract name");
    }
    return abi;
};

const filterEvents = (logs, contractName, filterEvents) => {
    const contractAbi = getContractAbi(contractName);

    const parsedLogs = parseEventLogs({
        abi: contractAbi,
        logs: logs,
    });

    const topics = [];
    for (let i = 0; i < parsedLogs.length; i++) {
        const topic = decodeEventLog({
            abi: contractAbi,
            data: parsedLogs[i].data,
            topics: parsedLogs[i].topics,
            strict: false,
        });

        if (filterEvents.includes(topic.eventName)) topics.push(topic);
    }

    return topics;
};

const decodeEvents = (receipt, contractName, filter) => {
    if (!receipt.logs) return;

    const filteredEvents = filterEvents(receipt.logs, contractName, filter);

    filteredEvents.forEach((evente) => renderEvent(evente));

    return filteredEvents;
};

export { decodeEvents };
