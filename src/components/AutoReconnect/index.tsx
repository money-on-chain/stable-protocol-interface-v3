import { useEffect } from 'react'
import { useAccount, useConnect } from 'wagmi'

export function AutoReconnect() {
  const { isConnected } = useAccount()
  const { connectors, connectAsync } = useConnect()

  useEffect(() => {
    // Only attempt if not connected and we have a saved connector id
    if (isConnected) return
    const last = localStorage.getItem('last-connector')
    if (!last) return

    const connector = connectors.find(c => c.id === last)
    if (!connector) return

    // Fire and forget; swallow errors (user may have removed the wallet)
    connectAsync({ connector }).catch(() => {})
  }, [isConnected, connectors, connectAsync])

  return null
}
