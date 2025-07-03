import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { i18n } from "i18next";

interface ProjectTranslationReturn {
    t: TFunction;
    i18n: i18n;
    ns: string;
}

export const useProjectTranslation = (): ProjectTranslationReturn => {
    const ns = "translation";
    const [t, i18n] = useTranslation();

    return { t, i18n, ns };
};
