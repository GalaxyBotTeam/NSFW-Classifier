const WebServer = require('./WebServer.js');
const config = require("./config.json");
const {Utils, logLevel, logModule} = require("./Utils/Utils");
const {MinIO} = require("./Utils/MinIO");
const {NSFW} = require("./Utils/NSFW");

async function start() {
    Utils.log(logLevel.INFO, logModule.GALAXYBOT, "Starting GalaxyBot V4 - NSFW Classifier");
    new MinIO(config);
    await new NSFW().init(config.nsfw.model);
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

