const cors = require("cors");
const {Utils, logLevel, logModule} = require("./Utils/Utils");
const config = require("./config.json");
const { ImageClassificationHandler } = require("./Handler/ImageClassificationHandler");
const {json} = require("express");

class WebServer {
    start() {
        Utils.log(logLevel.INFO, logModule.WEBSERVER, "Starting Webserver");
        const express = require('express');
        const cors = require('cors');

        const app = express()
        const port = config.webServer.port
        const imageClassificationHandler = new ImageClassificationHandler();

        //
        // Init Webserver for own requests
        //
        app.use(express.json())
        app.use(cors(), (req, res, next) => {
            res.setHeader("X-Powered-By", "GalaxyBot")
            res.setHeader("Access-Control-Allow-Origin", "127.0.0.1");
            res.setHeader("Content-Type", "application/json");
            let reqUri = req.originalUrl.toString().length > 61 ? req.originalUrl.toString().substring(0, 61) + "..." : req.originalUrl
            if(config.debug) Utils.log(logLevel.DEBUG, logModule.WEBSERVER, "RequestURI " + reqUri)
            next();
        });


        //
        //Routes
        //
        app.post("/api/v1/classifyImage", checkHost, (req, res) => {
            if (req.body.key && req.body.metaData.userID && req.body.metaData.guildID && req.body.deleteByClassification != null){
                imageClassificationHandler.classifyImage(req.body.key, req.body.metaData, req.body.deleteByClassification).then((results) => {
                    res.status(200)
                    res.write(JSON.stringify(results))
                    res.end()
                }).catch((error) => {
                    Utils.log(logLevel.ERROR, logModule.WEBSERVER, error?.message)
                    res.status(500)
                    res.write(JSON.stringify({
                        "error": "Internal Server Error",
                        "message": error?.message
                    }))
                    res.end()
                })
            } else {
                res.status(400)
                res.write('{"error": "Missing Parameters"}')
                res.end()
            }

        });


        app.listen(port, () => {
            Utils.log(logLevel.SUCCESS, logModule.WEBSERVER, "WebServer started on port " + port)
        });


        //
        // Middleware
        //
        function checkHost(req, res, next) {
            // Localhost == Testing with Insomnia
            // 172.18.0.1 == Bot
            if(req.headers.host === `localhost:${config.webServer.port}` || req.headers.host === `172.18.0.1:${config.webServer.port}`) {
                next();
            } else {
                res.status(403)
                res.write('{"error": "Invalid Host"}')
                res.end()
            }
        }

    }
}

module.exports = WebServer