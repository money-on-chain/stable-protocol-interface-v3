import "./Styles.scss";

import { useEffect, useRef, useState } from "react";

import { useProjectTranslation } from "../../../helpers/translations";
import useTheme from "../../UseTheme";

const SUPPORTED_LANGUAGES = ["en", "es"] as const;

export default function Configuration(): JSX.Element {
    const [isOpen, setIsOpen] = useState(false);
    const configurationRef = useRef<HTMLDivElement>(null);
    const { t, i18n } = useProjectTranslation();
    const { theme, toggleTheme } = useTheme();

    const currentLanguage = (i18n.resolvedLanguage ?? i18n.language).split("-")[0];
    const settingsLabel = t("settings.configuration", { defaultValue: "Settings" });

    useEffect(() => {
        if (!isOpen) return;

        const closeOnOutsideClick = (event: MouseEvent): void => {
            if (!configurationRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        const closeOnEscape = (event: KeyboardEvent): void => {
            if (event.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isOpen]);

    const selectLanguage = (language: (typeof SUPPORTED_LANGUAGES)[number]): void => {
        void i18n.changeLanguage(language);
        localStorage.setItem("PreferredLang", language);
        setIsOpen(false);
    };

    return (
        <div className="menu-bar-configuration" ref={configurationRef}>
            <button
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-label={settingsLabel}
                className="menu-bar-configuration__trigger"
                onClick={() => setIsOpen((open) => !open)}
                title={settingsLabel}
                type="button"
            >
                <span aria-hidden="true" className="icon-preferences" />
            </button>

            {isOpen && (
                <div aria-label={settingsLabel} className="menu-bar-configuration__popover" role="dialog">
                    <button className="menu-bar-configuration__theme" onClick={toggleTheme} type="button">
                        <span className="menu-bar-configuration__theme-name">{t(`settings.themeMode.${theme}`)}</span>
                        <span
                            aria-hidden="true"
                            className={`menu-bar-configuration__theme-switch menu-bar-configuration__theme-switch--${theme}`}
                        >
                            <span />
                        </span>
                    </button>

                    <div className="menu-bar-configuration__languages">
                        <span className="menu-bar-configuration__label">{t("language.languageCTA")}</span>
                        <div className="menu-bar-configuration__language-options">
                            {SUPPORTED_LANGUAGES.map((language) => (
                                <button
                                    aria-pressed={currentLanguage === language}
                                    className={
                                        currentLanguage === language
                                            ? "menu-bar-configuration__language menu-bar-configuration__language--active"
                                            : "menu-bar-configuration__language"
                                    }
                                    key={language}
                                    onClick={() => selectLanguage(language)}
                                    type="button"
                                >
                                    {t(`language.${language}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
