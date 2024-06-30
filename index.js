const { exec } = require("child_process");
const WebServer = require('./WebServer.js');
const config = require("./config.json");
const {Utils, logLevel, logModule} = require("./Utils/Utils");
const {Min} = require("@tensorflow/tfjs-node");
const {MinIO} = require("./Utils/MinIO");
const {NSFW} = require("./Utils/NSFW");

console.log("Ready!")
exec("clear", async (err, output) => {
    // once the command has completed, the callback function is called
    if (err) {
        // log and return if we encounter an error
        console.error("could not execute command: ", err)
        return
    }
    // log the output received from the command
    console.log(output)
    Utils.log(logLevel.INFO, logModule.GALAXYBOT, "Starting GalaxyBot V4 - NSFW Classifier");

    new MinIO(config);
    await new NSFW().init(config.nsfw.model);
    new WebServer().start();
})

