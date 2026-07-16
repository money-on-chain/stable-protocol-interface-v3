import React from "react";
import { Navigate, useRoutes } from "react-router-dom";

import NotFound from "../../../pages/NotFound";
// Reused as-is from the moc flavor — same MoC branding, and Skeleton only
// touches the shared wallet-connection fields (isConnected, contractProtocolStatus/
// userBalance/userOmocBalance/userVeto/contractStatusOmoc, which all stay idle
// for moc-v1 since they're v3-only — see feedback_shared_wallet_context memory).
const Skeleton = React.lazy(
    () => import("../../../layouts/projects/moc/Skeleton")
);
const HomeV1 = React.lazy(() => import("../../../pages/HomeV1/index"));
const ExchangeV1 = React.lazy(() => import("../../../pages/ExchangeV1/index"));

export default function Router(): React.ReactElement | null {
    return useRoutes([
        {
            path: "/",
            element: <Skeleton />,
            children: [
                {
                    path: "/",
                    element: <HomeV1 />,
                },
                {
                    path: "exchange",
                    element: <ExchangeV1 />,
                },
                { path: "404", element: <NotFound /> },
                { path: "*", element: <Navigate to="/404" /> },
            ],
        },
        { path: "*", element: <Navigate to="/404" replace /> },
    ]);
}
