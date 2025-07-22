import React, { useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Layout } from "antd";

import { WagmiProvider, useAccount, useConnect, useDisconnect, useReadContract, usePublicClient } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '../../../wagmiConfig'


import { AuthenticateContext } from "../../../context/Auth";
import SectionHeader from "../../../components/Header";
import NotificationBody from "../../../components/Notification";
import { CheckStatusGlobal } from "../../../helpers/checkStatus";
import DappFooter from "../../../components/Footer/index";
import W3ErrorAlert from "../../../components/Notification/W3ErrorAlert";

import { useWalletContext } from "../../../context/Wallet";
import { readContracts } from "../../../lib/backend/contracts";
//import { contractStatus } from "../../../lib/backend/multicall";
import { useContractProtocolStatus } from "../../../hooks/useContractProtocolStatus";
import { useLatestBlockNumber } from "../../../hooks/useLatestBlockNumber";
import { useProposalCount } from "../../../hooks/useProposalCount";
import { useContractsOmocStatus } from "../../../hooks/useContractsOmocStatus";
import { useUserBalance } from "../../../hooks/useUserBalance";
import { useOffchainPrices } from "../../../hooks/useOffchainPrices";

const { Content, Footer } = Layout;
const queryClient = new QueryClient()


// Type definitions
interface NotificationStatus {
    id: number;
    title: string;
    textContent: string;
    notifClass: string;
    iconLeft: string;
    isDismisable: boolean;
    dismissTime: number;
}

interface AuthContext {
    contractStatusData: any;
    userBalanceData: any;
    web3Error: any;
    isLoggedIn: boolean;
}



function Wallet(): JSX.Element {
    const { isConnected, address, connect, disconnect, readContractsAddresses } = useWalletContext()
    // const { address, isConnected } = useAccount()
    // const { connect } = useConnect()
    // const { disconnect } = useDisconnect()
    // const publicClient = usePublicClient()
    // const [contractsAddress, setContractsAddress] = useState(null);
    // const [contractsAddressLoaded, setContractsAddressLoaded] = useState(false);
    // const [offChainPrices, setOffChainPrices] = useState(null);

    // const { blockNumber } = useLatestBlockNumber(5_000)

    // const offChainPricesAPI = useOffchainPrices()

    // const contractProtocolStatus = useContractProtocolStatus(
    //     contractsAddressLoaded ? contractsAddress : undefined,
    //     Number(blockNumber),
    //     offChainPrices ? offChainPrices : undefined
    // )
    // const { proposalCount } = useProposalCount( 
    //     contractsAddressLoaded ? contractsAddress.VotingMachine : undefined, 
    //     30_000
    // )
    // const contractStatusOmoc = useContractsOmocStatus(
    //     contractsAddressLoaded ? contractsAddress : undefined,
    //     proposalCount
    // )

    // const userBalance = useUserBalance(
    //     contractsAddressLoaded ? contractsAddress : undefined,
    //     address
    // )

    // useEffect(() => {
    //     if (offChainPricesAPI.parsedPrices) {            
    //         setOffChainPrices(offChainPricesAPI.parsedPrices)
    //     }
    // }, [offChainPricesAPI.parsedPrices])  
    
    // useEffect(() => {
    //     if (contractProtocolStatus.storage) {
    //         console.log('Protocol:', contractProtocolStatus.storage)
    //     }
    // }, [contractProtocolStatus.storage])  

    // useEffect(() => {
    //     if (contractStatusOmoc.storage) {
    //         console.log('Omoc:', contractStatusOmoc.storage)
    //     }
    // }, [contractStatusOmoc.storage])

    // useEffect(() => {
    //     if (userBalance.storage) {
    //         console.log('User balance:', userBalance.storage)
    //     }
    // }, [userBalance.storage])

    // const initContractsConnection = async (): Promise<void> => {
    //     let error = false;
    //     if (!isConnected) {
    //         return;
    //     }

    //     if (contractsAddressLoaded) {
    //         return;
    //     }

    //     try {
    //         const contracts = await readContracts(publicClient);
    //         setContractsAddress(contracts);
    //     } catch (e) {
    //         console.error(e);
    //         error = true;
    //     }

    //     if (!error) {
    //         setContractsAddressLoaded(true);
    //     }

    //     /*if (!error) {
    //         await loadContractsStatusAndUserBalance();
    //     } else {
    //         setWeb3Error(true);
    //     }*/
    // };

      
    return (
        // <WagmiProvider config={config}>
        //     <QueryClientProvider client={queryClient}>        
                <div>
                    {isConnected ? (
                    <>
                        <p>Connected as: {address}</p>
                        <button onClick={() => disconnect()}>Disconnect</button>
                        <button onClick={() => readContractsAddresses()}>Init Contracts</button>            
                    </>
                    ) : (
                    <button onClick={() => connect({ connector: config.connectors[0] })}>Connect Wallet</button>
                    )}
                </div>
        //     </WagmiProvider>
        // </QueryClientProvider>
    )
  }

export default function Skeleton(): JSX.Element {
    const auth = useContext(AuthenticateContext) as AuthContext;
    
    const [notifStatus, setNotifStatus] = useState<NotificationStatus | null>(null);
    const { checkerStatus } = CheckStatusGlobal();
    
    useEffect(() => {
        if (auth.contractStatusData && auth.userBalanceData) {
            readProtocolStatus();
        }
    }, [auth.contractStatusData, auth.userBalanceData]);

    const readProtocolStatus = (): void => {
        const { globalStatus, statusLabel, statusText } = checkerStatus();
        if (globalStatus > 1) {
            setNotifStatus({
                id: -1,
                title: `Warning, protocol status is ${statusLabel}`,
                textContent: statusText,
                notifClass: "warning",
                iconLeft: "warning-icon", // Default icon since statusIcon doesn't exist
                isDismisable: false,
                dismissTime: 0,
            });
        } else {
            setNotifStatus(null);
        }
    };

    return (
    <Layout>
        <SectionHeader />
        <Wallet />
        <Content>
            {/* TODO load an array of notifStatus items, and load a mapping for showing notifs here in this section , interact with a React Context */}
            {notifStatus && <NotificationBody notifStatus={notifStatus} />}

            {auth.web3Error && <W3ErrorAlert />}

            {!auth.web3Error && auth.isLoggedIn && <Outlet />}
        </Content>
        <Footer>
            <div className="footer-container">
                <DappFooter></DappFooter>
            </div>
        </Footer>
    </Layout>
    );
}
