import "./Styles.scss";

import { useEffect, useRef, useState } from "react";

import settings from "../../settings";
import Branding from "./Branding";
import Configuration from "./Configuration";
import MenuOptions from "./MenuOptions";
import Wallet from "./Wallet";

export interface MenuBarProps {
    maxVisibleMenuItems?: number;
}

interface ProjectSettingsWithMenuBar {
    menuBar?: {
        maxVisibleItems?: number;
    };
}

export default function MenuBar({ maxVisibleMenuItems }: MenuBarProps): JSX.Element {
    const shellRef = useRef<HTMLDivElement>(null);
    const lastScrollYRef = useRef(0);
    const animationFrameRef = useRef<number | null>(null);
    const [isFloating, setIsFloating] = useState(false);
    const visibleMenuItems =
        maxVisibleMenuItems ?? (settings as unknown as ProjectSettingsWithMenuBar).menuBar?.maxVisibleItems ?? 6;

    useEffect(() => {
        lastScrollYRef.current = window.scrollY;

        const updateMenuBar = (): void => {
            animationFrameRef.current = null;

            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollYRef.current;
            const isPastMenuBar = (shellRef.current?.getBoundingClientRect().bottom ?? 0) <= 0;

            if (!isPastMenuBar || currentScrollY <= 0) {
                setIsFloating(false);
                lastScrollYRef.current = currentScrollY;
                return;
            }

            if (Math.abs(scrollDelta) < 8) return;

            setIsFloating(scrollDelta < 0);
            lastScrollYRef.current = currentScrollY;
        };

        const handleScroll = (): void => {
            if (animationFrameRef.current !== null) return;
            animationFrameRef.current = window.requestAnimationFrame(updateMenuBar);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (animationFrameRef.current !== null) {
                window.cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <div className="menu-bar-shell" ref={shellRef}>
            <header className={`menu-bar${isFloating ? " menu-bar--floating" : ""}`}>
                <Branding />
                <MenuOptions maxVisibleItems={visibleMenuItems} />
                <div className="menu-bar__actions">
                    <Configuration />
                    <Wallet />
                </div>
            </header>
        </div>
    );
}
