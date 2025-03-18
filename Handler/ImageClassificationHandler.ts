import {MinIO} from "../Utils/MinIO";
import config from "../config.json";
import openAI from "openai";
import {Client} from "minio";

type metaData = {
    userID: string,
    guildID: string
}

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

            this.s3.getObject(this.bucket, key).then(async (data) => {
                const buffer = await this.streamToBuffer(data);

                // Create a DataURI from the buffer depending on the file type
                const dataURI = `data:image/${key.split(".")[1]};base64,${buffer.toString('base64')}`;

                console.log(dataURI)

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
                    console.log(data)
                }).catch((err: any) => {
                    console.error(err)
                })

            }).catch((e) => {
                reject(e);
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