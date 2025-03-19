import {MinIO} from "../Utils/MinIO";
import config from "../config.json";
import openAI from "openai";
import {Client} from "minio";
import {logLevel, logModule, Utils} from "../Utils/Utils";

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
    async classifyImage(key: string, metaData: metaData, deleteImage = false): Promise<unknown> {
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

                        if (deleteImage) {
                            if (predictions.flagged) {
                                // Delete the image from the S3 Bucket
                                this.s3.removeObject(this.bucket, key).then(() => {
                                    Utils.log(logLevel.INFO, logModule.MinIO, `Deleted Image by classification: ${key}`);
                                });
                            }
                        }

                        this.logToDiscord(metaData, key, predictions.scores, deleteImage);

                        resolve({
                            flagged: predictions.flagged,
                            categories: predictions.categories,
                            scores: predictions.category_scores,
                            deletedImage: predictions.flagged && deleteImage
                        })
                    } else {
                        reject({
                            error: "No Results",
                            message: "No results found from the OpenAI API"
                        })
                    }
                }).catch((err: any) => {
                    Utils.log(logLevel.ERROR, logModule.OPENAI, err);
                    reject({
                        error: "OpenAI Error",
                        message: err
                    })
                })
            }).catch((e) => {
                reject({
                    error: "MinIO Error",
                    message: e
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
                            value: deleteImage ? null : `[Link](https://s3.galaxybot.app/${this.bucket}/${key})`,
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

    // /**
    //  * Validate the image classification results
    //  * @param predictions - Raw predictions from the model
    //  * @param metaData - MetaData from the request
    //  * @param key - S3 Key of the image
    //  * @param deleteImage - Delete the image in S3 if it's NSFW
    //  * @returns {{result: string, data, nsfw: boolean, deletedImage: boolean}}
    //  */
    // validateImageClassification(predictions, metaData, key, deleteImage = false) {
    //     const isNSFW = predictions[0].className !== "Neutral" && predictions[0].className !== "Drawing";
    //     const isSexyButNotExplicit =
    //         (predictions[0].className === "Sexy" && predictions[0].probability < 0.6) ||
    //         (predictions[0].probability < 0.6 && predictions[0].className !== "Neutral" && predictions[1].className === "Neutral");
    //
    //     const shouldDeleteImage = deleteImage && isNSFW && !isSexyButNotExplicit;
    //
    //     if (isNSFW && !isSexyButNotExplicit) {
    //         Utils.log(logLevel.INFO, logModule.NSFW, `NSFW Image Detected: ${key} - ${predictions[0].className} - ${predictions[0].probability}`);
    //         if (shouldDeleteImage) {
    //             // Delete the image from the S3 Bucket
    //             this.s3.removeObject(this.bucket, key).then(() => {
    //                 Utils.log(logLevel.INFO, logModule.NSFW, `Deleted Image: ${key}`);
    //             });
    //         }
    //     }
    //
    //     const embedData = {
    //         "content": null,
    //         "embeds": [
    //             {
    //                 "title": "Image has been Flagged",
    //                 "description": `Uploaded Image by <@${metaData.userID}> has been flagged with following details`,
    //                 "color": null,
    //                 "fields": [
    //                     { name: "User", value: `<@${metaData.userID}>`, inline: true },
    //                     { name: "Guild", value: `[${metaData.guildID}](https://dash.galaxybot.app/server/${metaData.guildID})`, inline: true },
    //                     { name: "Image", value: shouldDeleteImage ? null : `[Link](https://s3.galaxybot.app/${this.bucket}/${key})`, inline: true },
    //                     { name: "Action", value: shouldDeleteImage ? "Image has been deleted" : "Image has been kept", inline: true },
    //                     ...predictions.map(prediction => ({ name: prediction.className, value: Math.floor(prediction.probability * 100) + "%", inline: true }))
    //                 ],
    //                 "timestamp": new Date().toISOString(),
    //                 "image": {
    //                     "url": shouldDeleteImage ? null : `https://s3.galaxybot.app/${this.bucket}/${key}`
    //                 }
    //             }
    //         ],
    //         "attachments": []
    //     };
    //
    //     // Send the embed to the Discord Webhook
    //     if (isNSFW && !isSexyButNotExplicit) {
    //         Utils.sendDiscordWebhook(config.discord.webhook, embedData);
    //     }
    //
    //     return {
    //         nsfw: isNSFW && !isSexyButNotExplicit,
    //         deletedImage: shouldDeleteImage,
    //         result: predictions[0].className.toLowerCase(),
    //         // Convert the predictions to a more readable format
    //         data: predictions.reduce((acc, prediction) => ({ ...acc, [prediction.className.toLowerCase()]: prediction.probability }), {})
    //     };
    // }
}