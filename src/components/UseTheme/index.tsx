import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | string;

interface UseThemeResult {
    theme: Theme;
    toggleTheme: () => void;
}

const useTheme = (): UseThemeResult => {
    const [theme, setTheme] = useState<Theme>(() => {
        // Verificar si el tema está guardado en localStorage
        const root = document.querySelector(":root");
        let defaulTheme = "light";
        if (root) {
            defaulTheme = getComputedStyle(root)
                .getPropertyValue("--default-theme")
                .split('"')
                .join("");
        }
        const storedTheme = localStorage.getItem("preferredColorScheme");
        return storedTheme ? storedTheme : defaulTheme;
    });

    useEffect(() => {
        // Aplicar el tema al atributo `data-theme` del elemento `html`
        document.documentElement.setAttribute("data-theme", theme);
        // Guardar la preferencia en localStorage
        localStorage.setItem("preferredColorScheme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
    };

    return { theme, toggleTheme };
};

export default useTheme;
