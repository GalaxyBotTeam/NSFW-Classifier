import {MinIO} from "../Utils/MinIO";
import config from "../../config.json";
import openAI from "openai";
import {Client} from "minio";
import {logLevel, logModule, Utils} from "../Utils/Utils";
import {WebServerResponse} from "../WebServer";

type metaData = {
    userID: string,
    guildID: string
}

type ModerationCategory =
    | "harassment"
    | "harassment/threatening"
    | "sexual"
    | "hate"
    | "hate/threatening"
    | "illicit"
    | "illicit/violent"
    | "self-harm/intent"
    | "self-harm/instructions"
    | "self-harm"
    | "sexual/minors"
    | "violence"
    | "violence/graphic";

type ModerationCategories = {
    [category in ModerationCategory]: boolean;
};

type ModerationScores = {
    [category in ModerationCategory]: number;
};

type ModerationResult = {
    flagged: boolean;
    categories: ModerationCategories;
    scores: ModerationScores;
};

export class ImageClassificationHandler {
    private readonly bucket: string;
    private readonly s3: Client;
    private openAI: any;


    constructor() {
        this.s3 = MinIO.getS3();
        this.bucket = config.s3.bucket;
        this.openAI = new openAI({
            apiKey: config.openAI.key
        });

    }

    /**
     * Classify an image from the S3 Bucket
     * @param key - S3 Key of the image
     * @param metaData - MetaData from the request (userID, guildID)
     * @param deleteImage - Delete the image in S3 if it's NSFW
     * @returns {Promise<unknown>} - Returns the classification results
     */
    async classifyImage(key: string, metaData: metaData, deleteImage = false): Promise<WebServerResponse> {
        return new Promise(async (resolve, reject) => {
            Utils.log(logLevel.INFO, logModule.MinIO, `Downloading Image: ${key}`);
            this.s3.getObject(this.bucket, key).then(async (data) => {
                const buffer = await this.streamToBuffer(data);

                // Create a DataURI from the buffer depending on the file type
                const dataURI = `data:image/${key.split(".")[1]};base64,${buffer.toString('base64')}`;

                Utils.log(logLevel.INFO, logModule.OPENAI, `Classifying Image: ${key}`);

                return await this.openAI.moderations.create({
                    model: "omni-moderation-latest",
                    input: [
                        {
                            type: "image_url",
                            image_url: {
                                url: dataURI
                            }
                        }
                    ]
                }).then(async (data: any) => {
                    if (data?.results[0]) {
                        const predictions = data.results[0];
                        Utils.log(logLevel.INFO, logModule.OPENAI, `Image has ${predictions.flagged ? "been flagged" : "not been flagged"} as NSFW`);

                        if (predictions.flagged) {
                            if (deleteImage) {
                                // Delete the image from the S3 Bucket
                                this.s3.removeObject(this.bucket, key).then(() => {
                                    Utils.log(logLevel.INFO, logModule.MinIO, `Deleted Image by classification: ${key}`);
                                });
                            }

                            this.logToDiscord(metaData, key, {
                                flagged : predictions.flagged,
                                categories: predictions.categories,
                                scores: predictions.category_scores,
                            }, deleteImage);
                        }

                        resolve({
                            status: 200,
                            message: "Image Classified",
                            data: {
                                key: key,
                                bucket: this.bucket,
                                flagged: predictions.flagged,
                                categories: predictions.categories,
                                scores: predictions.category_scores,
                                deletedImage: predictions.flagged && deleteImage
                            }
                        })
                    } else {
                        reject({
                            status: 500,
                            message: "Error Classifying Image with OpenAI",
                            data: {
                                key: key,
                                bucket: this.bucket,
                                error: "No results found"
                            }
                        })
                    }
                }).catch((err: any) => {
                    Utils.log(logLevel.ERROR, logModule.OPENAI, err);
                    reject({
                        status: 500,
                        message: "Error Classifying Image with OpenAI",
                        data: {
                            key: key,
                            bucket: this.bucket,
                            error: err?.message
                        }
                    })
                })
            }).catch((e) => {
                console.log(e)
                reject({
                    status: 404,
                    message: "Image not found in S3 Bucket",
                    data: {
                        key: key,
                        bucket: this.bucket,
                        error: e?.message
                    }
                });
            });

        });

    }

    streamToBuffer(stream: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: any[] = [];
            stream.on('data', (chunk: any) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    logToDiscord(metaData: metaData, key: string, predictions: ModerationResult, deleteImage: boolean) {
        const embedData = {
            "content": null,
            "embeds": [
                {
                    "title": "Image has been Flagged",
                    "description": `Uploaded Image by <@${metaData.userID}> has been flagged with following details`,
                    "color": null,
                    "fields": [
                        {name: "User", value: `<@${metaData.userID}>`, inline: true},
                        {
                            name: "Guild",
                            value: `[${metaData.guildID}](https://dash.galaxybot.app/server/${metaData.guildID})`,
                            inline: true
                        },
                        {
                            name: "Image",
                            value: deleteImage ? "*Deleted*" : `[Link](https://s3.galaxybot.app/${this.bucket}/${key})`,
                            inline: true
                        },
                        {
                            name: "Action",
                            value: deleteImage ? "Image has been deleted" : "Image has been kept",
                            inline: true
                        },
                        ...Object.entries(predictions.scores).map(([name, value]) => ({
                            name,
                            value: Math.floor(value * 100) + "%",
                            inline: true
                        }))],
                    "timestamp": new Date().toISOString(),
                    "image": {
                        "url": deleteImage ? null : `https://s3.galaxybot.app/${this.bucket}/${key}`
                    }
                }
            ],
            "attachments": []
        };

        // Send the embed to the Discord Webhook
        Utils.sendDiscordWebhook(config.discord.webhook, embedData);
    }
}