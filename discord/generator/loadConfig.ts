import fs from "fs";
import path from "path";
import { ReplayConfig } from "./types.js";

export function loadConfig(): ReplayConfig {

    const file = path.join(
        process.cwd(),
        "config",
        "replay.config.json"
    );

    const json = fs.readFileSync(file, "utf8");

    return JSON.parse(json);
}