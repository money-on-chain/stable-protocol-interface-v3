/// <reference types="vite/client" />

declare module "react-dom/client" {
    interface Root {
        render(children: React.ReactNode): void;
        unmount(): void;
    }

    export function createRoot(container: Element | DocumentFragment): Root;
}

// requestIdleCallback types
interface IdleDeadline {
    didTimeout: boolean;
    timeRemaining(): number;
}

type IdleRequestCallback = (deadline: IdleDeadline) => void;

interface Window {
    requestIdleCallback(
        callback: IdleRequestCallback,
        options?: { timeout: number }
    ): number;
    cancelIdleCallback(handle: number): void;
}
