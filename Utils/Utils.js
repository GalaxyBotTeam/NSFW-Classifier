const chalk = require("chalk");
const fs = require('fs');
const axios = require("axios");

const logLevel = {
    SUCCESS: " [ " + chalk.greenBright("SUCCESS") + " ]",                      // [ SUCCESS ]#
    DEBUG:   " [ " + chalk.cyan("DEBUG")        + " ]  ",                      // [ DEBUG ]  #
    INFO:    " [ " + chalk.blueBright("INFO")  + " ]   ",                      // [ INFO ]   #
    WARN:    " [ " + chalk.yellow("WARN")      + " ]   ",                      // [ WARN ]   #
    ERROR:   " [ " + chalk.bgRed.bold.white("ERROR")         + " ]  "     // [ ERROR ]  #

}
const logModule = {
    ERROR:              " [ "+ chalk.red("ERROR") +" ]    ",
    WEBSERVER:          " [ "+ chalk.bold.magenta("WebServer") +" ]",
    DATABASE:           " [ "+ chalk.bold.cyan("DATABASE") +" ] ",
    GALAXYBOT:          " [ "+ chalk.bold.blue("GalaxyBot") +" ]",
    NSFW:               " [ "+ chalk.bold.yellow("NSFW") +" ]     ",
    MinIO:              " [ "+ chalk.bold.red("MinIO") +" ]    ",
}


class Utils {
    static #client = null;


    /**
     *
     * @param logLevel {logLevel} The Loglevel with the messages should be logged
     * @param logModule {logModule} The LogModule is the Type or the Module where the Log are from
     * @param messages {String} Messages can be an Array of messages like console.log (e.g. "message1", "message2", "message3", ...)
     * @returns {void}
     */
    static log(logLevel, logModule, ...messages) {
        let message = null;
        messages.forEach((msg) => {
            if(message == null) {
                message = msg;
            } else {
                message += " " + msg;
            }
        });


        let date = new Date().toISOString().toString().split("T")[0];
        let logFile = fs.createWriteStream('logs/logfile-'+ date +'.log', { flags: 'a' });
        let logLevel2 = logLevel.toString().replaceAll(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
        let logModule2 = logModule.toString().replaceAll(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")

        if(!logModule2.includes("REDIS")) {
            logFile.write(Utils.getTimestamp() + logLevel2 + logModule2 + ": " + message + '\n');
        }
        console.log(this.getTimestamp() + logLevel + logModule + ":", message)


        let dateBefore2Weeks = new Date(new Date() - 1209600000).toISOString().toString().split("T")[0];
        if(fs.existsSync('logs/logfile-' + dateBefore2Weeks + '.log')) {
            fs.unlink('logs/logfile-' + dateBefore2Weeks + '.log', (err) => {
                console.log(err)
            });
        }
    }


    static getTimestamp() {
        let dateOptions = {
            timeZone: "Europe/Berlin",
            year: 'numeric',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }


        return new Date().toLocaleString('de-DE', dateOptions)
            ?.replace(".", '-')
            ?.replace(".", '-')
            ?.replace(",", "");
    }

    /**
     * @description Log Errors to Console and write it in the Error Log File
     *
     *
     * @param error {any} Any Error from Process or from others
     * @param processEnd {boolean} Should the Bot be stopped with `errorCode`
     * @param errorCode {Number} [errorCode=-1]The Error Code which should the process be ended?
     * @returns {void}
     * @type {error : any, processEnd : Boolean, errorCode: Number}
     */
    static logError(error, processEnd = false, errorCode = -1) {
        let date = new Date().toISOString().toString().split("T")[0];
        let errorFile = fs.createWriteStream('logs/error-'+ date +'.log', { flags: 'a' });

        if(error.message.toString() == "buffer.File is an experimental feature and might change at any time") return;

        console.log(this.getTimestamp() + ": " + error.message);
        console.log(error.stack)

        errorFile.write(this.getTimestamp() + ": " + error.message + '\n');
        errorFile.write(error.stack + "\n", () => {
            if(processEnd) {
                //process.exit(errorCode)
            }
        });
    }

    static sendDiscordWebhook(webhook, data) {
        let options = {
            method: 'POST',
            url: webhook,
            data: data
        };

        axios.request(options).then(function (response) {
        }).catch(function (error) {
            console.error(error);
        });
    }

}

module.exports = {Utils, logModule, logLevel};
