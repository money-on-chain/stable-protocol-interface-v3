import menuOptionsData from "../components/Header/menuOptions.json";

export interface RawMenuOption {
    path: string;
    nameKey: string;
    className: string;
    allowedProjects: string[];
}

export function getProjectMenuOptions(project: string): RawMenuOption[] {
    return (menuOptionsData as RawMenuOption[]).filter(
        (option: RawMenuOption) =>
            option.allowedProjects.includes(project) ||
            option.allowedProjects.includes("all")
    );
}

export function getProjectDefaultMenuPath(project: string): string {
    return getProjectMenuOptions(project)[0]?.path ?? "/";
}
