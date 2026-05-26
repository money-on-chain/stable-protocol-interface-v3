import "./Styles.scss";

import { Layout } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useWalletContext } from "../../context/Wallet";
import {
    getProjectMenuOptions,
    type RawMenuOption,
} from "../../helpers/menuOptions";
import { useProjectTranslation } from "../../helpers/translations";
import settings from "../../settings/settings.json";
import DappVersion from "../DappVersion";
import ThemeMode from "../ThemeMode";
import Brand from "./Brand";
import HeaderCenter from "./HeaderCenter";

const { Header } = Layout;

interface MenuOption {
    path: string;
    nameKey: string;
    className: string;
    allowedProjects: string[];
    name: () => string;
}

interface LanguageOption {
    name: string;
    code: string;
}

const truncateAddress = (address: string): string => {
    return (
        address.substring(0, 6) +
        "..." +
        address.substring(address.length - 4, address.length)
    );
};

export default function SectionHeader(): JSX.Element {
    const navigate = useNavigate();
    const location = useLocation();
    const { isConnected, address, onShowModalAccount, onShowModalProviders } =
        useWalletContext();
    //const [css_disable, setCssDisable] = useState("disable-nav-item");
    const [showMoreDropdown, setShowMoreDropdown] = useState<boolean>(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState<boolean>(false);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
    const [showLanguageSubmenu, setShowLanguageSubmenu] =
        useState<boolean>(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const { t, i18n, ns } = useProjectTranslation();
    const [lang, setLang] = useState<string>("en");

    const MAX_MAIN_MENU_ITEMS: number = 5;

    // Filter options based on project and language changes
    const [displayOptions, setDisplayOptions] = useState<MenuOption[]>([]);
    const currentProject: string = settings.project;
    useEffect(() => {
        const filteredOptions: MenuOption[] = getProjectMenuOptions(
            currentProject
        ).map((option: RawMenuOption) => ({
            ...option,
            name: () => t(option.nameKey), // Traducimos el nombre dinámicamente
        }));
        setDisplayOptions(filteredOptions);
    }, [currentProject, lang, t]);

    // Manage main and more menu options
    const mainMenuOptions: MenuOption[] = displayOptions.slice(
        0,
        MAX_MAIN_MENU_ITEMS
    );
    const moreMenuOptions: MenuOption[] =
        displayOptions.slice(MAX_MAIN_MENU_ITEMS);

    const handleOptionClick = (path: string): void => {
        setShowMoreDropdown(false);
        navigate(path);
        // Swap selected "More" option to main menu if it's in the "More" list
        const indexInMoreMenu: number = moreMenuOptions.findIndex(
            (opt: MenuOption) => opt.path === path
        );
        if (indexInMoreMenu > -1) {
            const newDisplayOptions: MenuOption[] = [...displayOptions];
            const selectedOption: MenuOption = newDisplayOptions.splice(
                MAX_MAIN_MENU_ITEMS + indexInMoreMenu,
                1
            )[0];
            newDisplayOptions.splice(
                MAX_MAIN_MENU_ITEMS - 1,
                0,
                selectedOption
            );
            setDisplayOptions(newDisplayOptions);
        }
    };

    const toggleLanguageMenu = (): void => {
        setShowLanguageMenu((prevState: boolean) => !prevState);
    };
    const toggleLanguageSubmenu = (): void =>
        setShowLanguageSubmenu(!showLanguageSubmenu);
    const pickLanguage = (code: string): void => {
        void i18n.changeLanguage(code);
        setLang(code);
        setShowLanguageMenu(false);
        localStorage.setItem("PreferredLang", code);
    };

    const languageOptions: LanguageOption[] = [
        { name: t("language.en", { ns: ns }), code: "en" },
        { name: t("language.es", { ns: ns }), code: "es" },
    ];

    useEffect(() => {
        const preferredLanguage: string =
            localStorage.getItem("PreferredLang") || "en";
        void i18n.changeLanguage(preferredLanguage);
        setLang(preferredLanguage);
        // Only run once on mount to load saved language preference
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Header>
            <div className="header-container">
                <Brand />
                <HeaderCenter
                    currentPath={location.pathname}
                    mainMenuOptions={mainMenuOptions}
                    moreMenuOptions={moreMenuOptions}
                    onMenuOptionClick={handleOptionClick}
                    onMoreMenuToggle={() =>
                        setShowMoreDropdown(!showMoreDropdown)
                    }
                    showMoreDropdown={showMoreDropdown}
                    moreLabel={t("menuOptions.more")}
                />
                <div className="wallet-user">
                    <div
                        className="wallet-translation"
                        onClick={toggleLanguageMenu}
                    >
                        <a className="translation-selector">
                            {
                                languageOptions.find(
                                    (option: LanguageOption) =>
                                        option.code === lang
                                )?.name
                            }
                        </a>
                        <div className="logo-translation"></div>
                    </div>
                    <div
                        className={`wallet-address ${isConnected ? "walletConnected" : "walletDisconnected"}`}
                    >
                        {isConnected ? (
                            <>
                                <a onClick={onShowModalAccount}>
                                    {truncateAddress(address || "")}
                                </a>
                            </>
                        ) : (
                            <a onClick={() => onShowModalProviders()}>
                                {t("walletProviders.connectWalletButton")}
                            </a>
                        )}
                        <div className="logo-wallet"></div>
                    </div>
                    {showLanguageMenu && (
                        <div className="language-menu">
                            <div>
                                {languageOptions.map(
                                    (option: LanguageOption) => {
                                        return (
                                            <div
                                                className={`menu-item${lang === option.code ? "-selected" : ""}`}
                                                onClick={() =>
                                                    pickLanguage(option.code)
                                                }
                                                key={option.code}
                                            >
                                                <span>{option.name}</span>
                                                {lang === option.code && (
                                                    <div className="icon-checked"></div>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {/* Mobile Menu Button */}
                <div
                    className="mobile__menu__button"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <div
                        className={`mobile-menu-icon ${isMobileMenuOpen ? "open" : ""}`}
                    ></div>
                </div>
                {/* Overlay & Mobile Menu*/}
                {isMobileMenuOpen && (
                    <>
                        <div className="mobile-menu-overlay"></div>
                        <div className="mobile-menu" ref={menuRef}>
                            <button
                                className="mobile-menu-close"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <div className="icon__close__menu"></div>
                            </button>
                            <div className="mobile__menu__options">
                                {displayOptions.map((option: MenuOption) => (
                                    <a
                                        onClick={() => {
                                            navigate(option.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="mobile-menu-item"
                                        key={option.path}
                                    >
                                        <div
                                            className={`${option.className} mobile__menu__icon`}
                                        ></div>
                                        <div>{option.name()}</div>{" "}
                                    </a>
                                ))}
                                <div className="language__options">
                                    <div
                                        className="mobile-language-selector"
                                        onClick={toggleLanguageSubmenu}
                                    >
                                        {showLanguageSubmenu ? (
                                            <div className="mobile-language-title">
                                                {t("language.languageCTA")}{" "}
                                            </div>
                                        ) : (
                                            languageOptions.find(
                                                (option: LanguageOption) =>
                                                    option.code === lang
                                            )?.name
                                        )}
                                        {/* Language Menu for Mobile */}
                                        {showLanguageSubmenu && (
                                            <div className="mobile-language-submenu">
                                                {/* Language Submenú for Mobile */}
                                                {languageOptions.map(
                                                    (
                                                        option: LanguageOption
                                                    ) => (
                                                        <div
                                                            key={option.code}
                                                            className={`mobile-menu-item${lang === option.code ? "-selected" : ""}`}
                                                            onClick={() =>
                                                                pickLanguage(
                                                                    option.code
                                                                )
                                                            }
                                                        >
                                                            <div>
                                                                {option.name}
                                                                <span> •</span>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <ThemeMode />
                            <DappVersion />
                        </div>
                    </>
                )}
            </div>
        </Header>
    );
}
