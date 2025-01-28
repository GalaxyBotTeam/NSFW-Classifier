import {WebServer} from './WebServer';
import config from "./config.json";
import {Utils, logLevel, logModule} from "./Utils/Utils";
import {MinIO} from "./Utils/MinIO";

async function start() {
    Utils.log(logLevel.INFO, logModule.GALAXYBOT, "Starting GalaxyBot V4 - NSFW Classifier");
    new MinIO(config);
    new WebServer().start();
}

start().then(() => {
    // Ready for Pterodactyl JS Egg
    console.log("Ready!")
    Utils.log(logLevel.SUCCESS, logModule.GALAXYBOT, "GalaxyBot V4 - NSFW Classifier started");
}).catch((e) => {
    Utils.log(logLevel.ERROR, logModule.GALAXYBOT, e);
    process.exit(1);
});

