import {Utils, logLevel, logModule} from "./Utils";
import * as Minio from 'minio'
import {Client} from "minio";
let s3: Client | null | undefined = null;

export class MinIO {
    private readonly s3: Client;
    constructor(config: { s3: { endPoint: any; accessKey: any; secretKey: any; port?: number; useSSL: boolean }; }, noLog = false) {
        Utils.log(logLevel.INFO, logModule.MinIO, "Connecting to MinIO");
        this.s3 = new Minio.Client({
            endPoint: config.s3.endPoint,
            port: config.s3.useSSL ? undefined : config.s3.port,
            region: 'eu-central-1',
            useSSL: true,
            accessKey: config.s3.accessKey,
            secretKey: config.s3.secretKey
        });
        s3 = this.s3;
        Utils.log(logLevel.SUCCESS, logModule.MinIO, "Connected to MinIO");
    }

    getS3() {
        return this.s3;
    }

    static getS3(): Client {
        return <Client>s3;
    }

}