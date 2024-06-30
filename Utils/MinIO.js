const {Utils, logLevel, logModule} = require("./Utils.js");
const config = require("../config.json");
const minio = require('minio');

let s3 = null;

class MinIO {
    constructor(config, noLog = false) {
        Utils.log(logLevel.INFO, logModule.MinIO, "Connecting to MinIO");
        this.s3 = new minio.Client({
            endPoint: config.s3.endPoint,
            port: config.s3.port,
            useSSL: false,
            accessKey: config.s3.accessKey,
            secretKey: config.s3.secretKey
        });

        s3 = this.s3;
        Utils.log(logLevel.SUCCESS, logModule.MinIO, "Connected to MinIO");
    }

    getS3() {
        return this.s3;
    }

    static getS3() {
        return s3;
    }

}


module.exports = { MinIO };