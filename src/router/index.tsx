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
const RouterMoc: LazyRouterComponent = React.lazy(
    () => import("./projects/moc")
);
const RouterStableX: LazyRouterComponent = React.lazy(
    () => import("./projects/stablex")
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
        case "moc":
            return RouterMoc;
        case "voting":
            return RouterVoting;
        case "stablex":
            return RouterStableX;
        default:
            return RouterFlipmoney;
    }
};

export default Router();
