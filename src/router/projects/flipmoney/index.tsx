import React from "react";
import { Navigate, useRoutes } from "react-router-dom";

import NotFound from "../../../pages/NotFound";
const Skeleton = React.lazy(
    () => import("../../../layouts/projects/flipmoney/Skeleton")
);
const Home = React.lazy(() => import("../../../pages/Home/index"));
const Exchange = React.lazy(() => import("../../../pages/Exchange/index"));
const CombinedOperations = React.lazy(
    () => import("../../../pages/CombinedOperations/index")
);
const Send = React.lazy(() => import("../../../pages/Send/index"));
const Performance = React.lazy(
    () => import("../../../pages/Performance/index")
);
const Staking = React.lazy(() => import("../../../pages/Staking/index"));
const Vesting = React.lazy(() => import("../../../pages/Vesting/index"));
const Voting = React.lazy(() => import("../../../pages/Voting/index"));
const Veto = React.lazy(() => import("../../../pages/Veto/index"));
const VetoWithdraw = React.lazy(() => import("../../../pages/Veto/Withdraw"));
const LendingBorrowing = React.lazy(
    () => import("../../../pages/LendingBorrowing/index")
);

export default function Router(): React.ReactElement | null {
    return useRoutes([
        {
            path: "/",
            element: <Skeleton />,
            children: [
                {
                    path: "/",
                    element: <Home />,
                },
                {
                    path: "exchange",
                    element: <Exchange />,
                },
                {
                    path: "send",
                    element: <Send />,
                },
                {
                    path: "performance",
                    element: <Performance />,
                },
                {
                    path: "staking",
                    element: <Staking />,
                },
                {
                    path: "vesting",
                    element: <Vesting />,
                },
                {
                    path: "voting",
                    element: <Voting />,
                },
                {
                    path: "veto",
                    element: <Veto />,
                },
                {
                    path: "veto/withdraw",
                    element: <VetoWithdraw />,
                },
                {
                    path: "combined-operations",
                    element: <CombinedOperations />,
                },
                {
                    path: "lending-borrowing",
                    element: <LendingBorrowing />,
                },
                { path: "404", element: <NotFound /> },
                { path: "*", element: <Navigate to="/404" /> },
            ],
        },
        { path: "*", element: <Navigate to="/404" replace /> },
    ]);
}
