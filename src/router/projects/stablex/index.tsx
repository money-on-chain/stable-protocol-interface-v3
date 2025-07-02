import React from "react";
import { Navigate, useRoutes } from "react-router-dom";

import NotFound from "../../../pages/NotFound";
const Skeleton = React.lazy(
    () => import("../../../layouts/projects/stablex/Skeleton")
);
const Home = React.lazy(() => import("../../../pages/Home/index"));
const Exchange = React.lazy(() => import("../../../pages/Exchange/index"));
const Send = React.lazy(() => import("../../../pages/Send/index"));
const Performance = React.lazy(
    () => import("../../../pages/Performance/index")
);
const Staking = React.lazy(() => import("../../../pages/Staking/index"));
const Vesting = React.lazy(() => import("../../../pages/Vesting/index"));
const Voting = React.lazy(() => import("../../../pages/Voting/index"));

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
                { path: "404", element: <NotFound /> },
                { path: "*", element: <Navigate to="/404" /> },
            ],
        },
        { path: "*", element: <Navigate to="/404" replace /> },
    ]);
}
