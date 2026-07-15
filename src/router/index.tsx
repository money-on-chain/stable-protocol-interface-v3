import React from "react";

// Define the type for the lazy-loaded router components
type LazyRouterComponent = React.LazyExoticComponent<
    () => React.ReactElement | null
>;

// Define the environment variable type
declare global {
    interface ImportMetaEnv {
        REACT_APP_ENVIRONMENT_APP_PROJECT: string;
    }
}

const RouterFlipmoney: LazyRouterComponent = React.lazy(
    () => import("./projects/flipmoney")
);
const RouterRoc: LazyRouterComponent = React.lazy(
    () => import("./projects/roc")
);
const RouterLendBorrow: LazyRouterComponent = React.lazy(
    () => import("./projects/lendborrow")
);
const RouterMoc: LazyRouterComponent = React.lazy(
    () => import("./projects/moc")
);
const RouterMocV1: LazyRouterComponent = React.lazy(
    () => import("./projects/moc-v1")
);
const RouterVoting: LazyRouterComponent = React.lazy(
    () => import("./projects/voting")
);

const Router = (): LazyRouterComponent => {
    switch (import.meta.env.REACT_APP_ENVIRONMENT_APP_PROJECT.toLowerCase()) {
        case "flipmoney":
            return RouterFlipmoney;
        case "roc":
            return RouterRoc;
        case "lendborrow":
            return RouterLendBorrow;
        case "moc":
            return RouterMoc;
        case "moc-v1":
            return RouterMocV1;
        case "voting":
            return RouterVoting;
        default:
            return RouterFlipmoney;
    }
};

export default Router();
