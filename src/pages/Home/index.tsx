import "./Styles.scss";

import React from "react";

import Portfolio from "../../components/Dashboards/Portfolio";
import { AppNotification } from "../../components/Notifications/AppNotification";
import HomeTabs from "../../components/PortfolioOperationsTabs";
import LastOperations from "../../components/Tables/LastOperations";

export default function Home(): React.ReactElement {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    return (
        <>
            {isMobile ? (
                <div className="mobile-only">
                    <AppNotification
                        type="error"
                        title="Temporal Message"
                        icon={"icon-status-warning"}
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        autoCloseAfterMs={90000}
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />{" "}
                    <AppNotification
                        type="info"
                        title="Info Message"
                        icon={"icon-status-warning"}
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <AppNotification
                        type="warning"
                        title="Warning Message"
                        // icon={"icon-status-warning"}
                        noIcon
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <AppNotification
                        type="success"
                        title="Success Message"
                        // icon={"icon-status-success"}
                        // noIcon
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <HomeTabs />
                </div>
            ) : (
                <div className="section-container notification-container desktop-only ">
                    <AppNotification
                        type="error"
                        title="Temporal Message"
                        // icon={"icon-status-warning"}
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        autoCloseAfterMs={90000}
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />{" "}
                    <AppNotification
                        type="info"
                        title="Info Message"
                        // icon={"icon-status-warning"}
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <AppNotification
                        type="warning"
                        title="Warning Message"
                        // icon={"icon-status-warning"}
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <AppNotification
                        type="success"
                        title="Success Message"
                        // noicon
                        // icon={"icon-status-success"}
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <AppNotification
                        type="neutral"
                        title="Neutral Message"
                        // icon={"icon-swap-arrow"}
                        // noIcon
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                                onClick: () => {
                                    console.log("Wiki link clicked");
                                },
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <AppNotification
                        type="error"
                        title="Error Message"
                        // icon={"icon-status-error"}
                        content={
                            <>
                                This is a sample of an error notification <br />
                                Using HTML. You may even display a image banner.
                            </>
                        }
                        details={
                            <div className="notification-details-text">
                                Lorem ipsum dolor sit amet, consectetur
                                adipiscing elit. Vivamus efficitur, sapien non
                                aliquet ultricies, neque odio cursus lorem, eget
                                tincidunt justo urna sit amet nunc.
                                <div
                                    style={{ width: "32px", height: "32px" }}
                                    className="icon-status-success"
                                ></div>
                                Integer sit amet velit vel orci commodo
                                tincidunt. Morbi vehicula feugiat dui, a
                                pulvinar risus viverra a.
                            </div>
                        }
                        detailsInitiallyOpen={false}
                        dismissible
                        actions={[
                            {
                                key: "retry",
                                label: "Reintenta",
                                type: "primary",
                            },
                            {
                                key: "details",
                                label: "Ver detalles",
                                type: "secondary",
                            },
                            {
                                key: "wiki",
                                label: "Wiki",
                                type: "link",
                                href: "https://google.com",
                                target: "_blank",
                            },
                        ]}
                    />
                    <Portfolio />
                    <div className="content-last-operations">
                        <LastOperations token={"all"} />
                    </div>
                </div>
            )}
        </>
    );
}
