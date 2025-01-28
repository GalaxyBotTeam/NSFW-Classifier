const chalk = require("chalk");
const fs = require('fs');
const axios = require("axios");

export const logLevel = {
    SUCCESS: " [ " + chalk.greenBright("SUCCESS") + " ]",                      // [ SUCCESS ]#
    DEBUG: " [ " + chalk.cyan("DEBUG") + " ]  ",                      // [ DEBUG ]  #
    INFO: " [ " + chalk.blueBright("INFO") + " ]   ",                      // [ INFO ]   #
    WARN: " [ " + chalk.yellow("WARN") + " ]   ",                      // [ WARN ]   #
    ERROR: " [ " + chalk.bgRed.bold.white("ERROR") + " ]  "     // [ ERROR ]  #

}
export const logModule = {
    ERROR: " [ " + chalk.red("ERROR") + " ]    ",
    WEBSERVER: " [ " + chalk.bold.magenta("WebServer") + " ]",
    GALAXYBOT: " [ " + chalk.bold.blue("GalaxyBot") + " ]",
    NSFW: " [ " + chalk.bold.yellow("NSFW") + " ]     ",
    MinIO: " [ " + chalk.bold.red("MinIO") + " ]    ",
}


export class Utils {
    static #client = null;


    /**
     *
     * @param logLevel {logLevel} The Loglevel with the messages should be logged
     * @param logModule {logModule} The LogModule is the Type or the Module where the Log are from
     * @param messages {String} Messages can be an Array of messages like console.log (e.g. "message1", "message2", "message3", ...)
     * @returns {void}
     */
    static log(logLevel: string, logModule: string, ...messages: string[]): void {
        let message: string | null = null;
        messages.forEach((msg) => {
            if (message == null) {
                message = msg;
            } else {
                message += " " + msg;
            }
        });


        let date = new Date().toISOString().toString().split("T")[0];
        let logFile = fs.createWriteStream('logs/logfile-' + date + '.log', {flags: 'a'});
        let logLevel2 = logLevel.toString().replaceAll(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")
        let logModule2 = logModule.toString().replaceAll(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "")

        if (!logModule2.includes("REDIS")) {
            logFile.write(Utils.getTimestamp() + logLevel2 + logModule2 + ": " + message + '\n');
        }
        console.log(this.getTimestamp() + logLevel + logModule + ":", message)


        let dateBefore2Weeks = new Date(new Date().getTime() - 1209600000).toISOString().toString().split("T")[0];
        if (fs.existsSync('logs/logfile-' + dateBefore2Weeks + '.log')) {
            fs.unlink('logs/logfile-' + dateBefore2Weeks + '.log', (err: any) => {
                console.log(err)
            });
        }
    }


    static getTimestamp() {

        return new Date().toLocaleString('de-DE', {
            timeZone: "Europe/Berlin",
            year: 'numeric',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })?.replace(".", '-')?.replace(".", '-')?.replace(",", "");
    }

    static sendDiscordWebhook(webhook: any, data: any) {
        let options = {
            method: 'POST',
            url: webhook,
            data: data
        };

        axios.request(options).then(function () {
        }).catch(function (error: any) {
            console.error(error);
        });
    }

}
