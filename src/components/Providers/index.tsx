import React, { useContext, useState, useEffect } from "react";
import { notification, Switch, Select, Input } from "antd";
import PropTypes from "prop-types";
import { useProjectTranslation } from "../../helpers/translations";
import { Connector, useConnect } from 'wagmi'

// Type definitions
interface ProvidersProps {
    onCloseModal: () => void;    
}

export default function WalletProviders(props: ProvidersProps): JSX.Element {
    const { onCloseModal } = props;
    const { connectors, connect } = useConnect()

    const { t } = useProjectTranslation();    
    
    const onClose = (): void => {
        onCloseModal();
    };

    const onConnect = (connector: Connector): void => {
        connect({ connector });
        onClose();
    };
  

    return (
        <div className="providers__settings">
            <div className="providers__connectors">
                {connectors.map((connector) => (
                    <WalletOption
                        key={connector.id}
                        connector={connector}
                        onClick={() => onConnect(connector)}
                    />
                ))}
            </div>            
        </div>
    );
}


function WalletOption({
    connector,
    onClick,
  }: {
    connector: Connector
    onClick: () => void
  }) {
    const [ready, setReady] = React.useState(false)
  
    React.useEffect(() => {
      ;(async () => {
        const provider = await connector.getProvider()
        setReady(!!provider)
      })()
    }, [connector])
  
    return (
      <button disabled={!ready} onClick={onClick}>
        {connector.name}
      </button>
    )
  }

WalletProviders.propTypes = {
    onCloseModal: PropTypes.func.isRequired,    
}; 