export interface ReplayConfig {
    roles: string[];
    categories: CategoryConfig[];
}

export interface CategoryConfig {
    name: string;
    channels: string[];
}