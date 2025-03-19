import cors from "cors";
import {Utils, logLevel, logModule} from "./Utils/Utils";
import config from "../config.json";
import {ImageClassificationHandler} from "./Handler/ImageClassificationHandler";
import {json} from "express";
import express, {NextFunction, Request, Response, Express} from "express";


export class WebServer {
    start() {
        Utils.log(logLevel.INFO, logModule.WEBSERVER, "Starting Webserver");

        const app = express()
        const port = config.webServer.port
        const imageClassificationHandler = new ImageClassificationHandler();

        //
        // Init Webserver for own requests
        //
        app.use(express.json())
        app.use(cors(), (req: Request, res: Response, next: NextFunction) => {
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

        // Body = {key: "key", metaData: {userID: "userID", guildID: "guildID"}, deleteByClassification: true}
        // Key must be an object key from the S3 Bucket
        //
        // ID's in metaData are Discord snowflakes for de Logging Channel
        app.post("/api/v1/classifyImage", checkHost, (req: Request, res: Response) => {
            // Check if all required parameters are given
            if (req.body.key && req.body.metaData.userID && req.body.metaData.guildID && req.body.deleteByClassification != null){
                // Call the ImageClassificationHandler
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


        //Start the WebServer
        app.listen(port, () => {
            Utils.log(logLevel.SUCCESS, logModule.WEBSERVER, "WebServer started on port " + port)
        });


        //
        // Middleware
        //
        /**
         * Check the Host Header
         * @param req - Request Object from Express
         * @param res - Response Object from Express
         * @param next - Next Function from Express
         *
         * We use this function to check if the request is coming from the right host for security reasons you can remove this if you want
         */
        function checkHost(req: Request, res: Response, next: NextFunction) {
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
