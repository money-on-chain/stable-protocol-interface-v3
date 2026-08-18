import menuOptionsData from "../components/Header/menuOptions.json";

export interface RawMenuOption {
    path: string;
    nameKey: string;
    className: string;
    allowedProjects: string[];
    children?: RawMenuChildOption[];
}

export interface RawMenuChildOption {
    path: string;
    nameKey: string;
    className?: string;
    allowedProjects?: string[];
}

const isLendingBorrowingEnabled = Boolean(import.meta.env.REACT_APP_LENDING_READER);

function isLendingBorrowingOption(option: { nameKey: string }): boolean {
    return option.nameKey === "menuOptions.lendingBorrowing";
}

export function getProjectMenuOptions(project: string): RawMenuOption[] {
    return (menuOptionsData as RawMenuOption[])
        .filter(
            (option: RawMenuOption) =>
                option.allowedProjects.includes(project) || option.allowedProjects.includes("all")
        )
        .filter((option: RawMenuOption) => isLendingBorrowingEnabled || !isLendingBorrowingOption(option))
        .map((option: RawMenuOption) => ({
            ...option,
            children: option.children?.filter(
                (child: RawMenuChildOption) =>
                    (!child.allowedProjects ||
                        child.allowedProjects.includes(project) ||
                        child.allowedProjects.includes("all")) &&
                    (isLendingBorrowingEnabled || !isLendingBorrowingOption(child))
            ),
        }));
}

export function getProjectDefaultMenuPath(project: string): string {
    return getProjectMenuOptions(project)[0]?.path ?? "/";
}
