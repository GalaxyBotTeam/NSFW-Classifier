const WebServer = require('./WebServer.js');
const config = require("./config.json");
const {Utils, logLevel, logModule} = require("./Utils/Utils");
const {MinIO} = require("./Utils/MinIO");
const {NSFW} = require("./Utils/NSFW");
const request = require("request3");

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
    sendPing();
}).catch((e) => {
    Utils.log(logLevel.ERROR, logModule.GALAXYBOT, e);
    process.exit(1);
});


function sendPing() {
    Utils.log(logLevel.INFO, logModule.NSFW, "Sending heartbeat to Monitoring");
    setInterval(async () => {
        const options = {
            method: "GET",
            url: config.status.kumaBase + "/api/push/" + config.status.id,
            qs: {
                status: "up",
                msg: "Meldet_sich_zum_Dienst",
                ping: 0
            },
            headers: {
                "User-Agent": "GalaxyBot V4 - NSFW Classifier"
            }
        };

        let req = request(options);
        req.on("error", (error) => {});
    }, config.status.interval);
}

