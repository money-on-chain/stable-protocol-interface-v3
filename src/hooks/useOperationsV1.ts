import { useCallback, useEffect, useRef, useState } from "react";

import { useWalletContext } from "../context/Wallet";
import type { RawOperationsListV1 } from "../helpers/operationsV1";
import { tokenNameNewToOldV1 } from "../helpers/operationsV1";
import api from "../services/api";
import { API_OPERATIONS_BASE } from "../services/apiConfig";

interface UseOperationsV1Result {
    operations: RawOperationsListV1["transactions"];
    total: number;
    ready: boolean;
}

// Fetch/poll logic ported from v3's LastOperations (same dedup-via-refs +
// 20s-poll pattern), but pointed at moc-v1's legacy `webapp/transactions/list/`
// endpoint/contract instead of v3's `v1/operations/list/`.
export function useOperationsV1(
    token: string,
    page: number,
    pageSize: number
): UseOperationsV1Result {
    const { isConnected, address } = useWalletContext();
    const [dataJson, setDataJson] = useState<RawOperationsListV1>({
        transactions: [],
        total: 0,
    });
    const [ready, setReady] = useState(false);

    const isLoadingRef = useRef(false);
    const hasInitialLoadRef = useRef(false);
    const pageRef = useRef(page);
    const pageSizeRef = useRef(pageSize);
    const tokenRef = useRef(token);
    const addressRef = useRef(address);
    const isConnectedRef = useRef(isConnected);

    useEffect(() => {
        pageRef.current = page;
    }, [page]);
    useEffect(() => {
        pageSizeRef.current = pageSize;
    }, [pageSize]);
    useEffect(() => {
        tokenRef.current = token;
    }, [token]);
    useEffect(() => {
        addressRef.current = address;
    }, [address]);
    useEffect(() => {
        isConnectedRef.current = isConnected;
    }, [isConnected]);

    useEffect(() => {
        if (!isConnected || !address) {
            hasInitialLoadRef.current = false;
            setReady(false);
        }
    }, [isConnected, address]);

    const fetchOperations = useCallback(() => {
        if (
            !isConnectedRef.current ||
            !addressRef.current ||
            isLoadingRef.current
        ) {
            return;
        }
        if (!API_OPERATIONS_BASE) {
            console.error(
                "[useOperationsV1] API_OPERATIONS_BASE is not configured or failed allowlist validation"
            );
            hasInitialLoadRef.current = true;
            setReady(true);
            return;
        }

        isLoadingRef.current = true;
        const skip = (pageRef.current - 1) * pageSizeRef.current;
        const params: Record<string, string | number> = {
            address: addressRef.current,
            limit: pageSizeRef.current,
            skip,
        };
        if (tokenRef.current !== "all") {
            params.token = tokenNameNewToOldV1(tokenRef.current);
        }

        api<RawOperationsListV1>(
            "get",
            `${API_OPERATIONS_BASE}webapp/transactions/list/`,
            params
        )
            .then((response) => {
                setDataJson(response as RawOperationsListV1);
                setReady(true);
                hasInitialLoadRef.current = true;
            })
            .catch((error: unknown) => {
                console.error(error);
            })
            .finally(() => {
                isLoadingRef.current = false;
            });
    }, []);

    useEffect(() => {
        if (isConnected && address && !hasInitialLoadRef.current) {
            fetchOperations();
        }
    }, [isConnected, address, fetchOperations]);

    useEffect(() => {
        if (isConnected && address && hasInitialLoadRef.current) {
            fetchOperations();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, token]);

    useEffect(() => {
        if (!isConnected || !address) return undefined;

        const interval = setInterval(() => fetchOperations(), 20000);
        return () => clearInterval(interval);
    }, [isConnected, address, fetchOperations]);

    return {
        operations: dataJson.transactions,
        total: dataJson.total,
        ready,
    };
}
