import "./Styles.scss";

import langEn from "../../assets/icons/lang_en.svg";
import langEs from "../../assets/icons/lang_es.svg";

const LANGUAGE_FLAGS: Record<string, string> = {
    en: langEn,
    es: langEs,
};

interface LanguageLabelProps {
    code: string;
    name: string;
}

export default function LanguageLabel({
    code,
    name,
}: LanguageLabelProps): JSX.Element {
    const flag = LANGUAGE_FLAGS[code];

    return (
        <span className="language-label">
            {flag ? (
                <img
                    alt=""
                    aria-hidden="true"
                    className="language-label__flag"
                    src={flag}
                />
            ) : null}
            <span>{name}</span>
        </span>
    );
}
