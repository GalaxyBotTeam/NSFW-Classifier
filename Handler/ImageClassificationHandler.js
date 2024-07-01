const {MinIO} = require("../Utils/MinIO");
const {NSFW} = require("../Utils/NSFW");
const tf = require("@tensorflow/tfjs-node");
const config = require("../config.json");
const {Utils, logLevel, logModule} = require("../Utils/Utils");

class ImageClassificationHandler {

    constructor() {
        this.s3 = MinIO.getS3();
        this.nsfw = NSFW.getModel();
        this.bucket = config.s3.bucket;
    }

    /**
     * Classify an image from the S3 Bucket
     * @param key - S3 Key of the image
     * @param metaData - MetaData from the request (userID, guildID)
     * @param deleteImage - Delete the image in S3 if it's NSFW
     * @returns {Promise<unknown>} - Returns the classification results
     */
    async classifyImage(key, metaData, deleteImage = false) {

        return new Promise(async (resolve, reject) => {
            // Get the image from the S3 Bucket
            this.s3.getObject(this.bucket, key).then(async (data) => {

                // Because S3 returns a readable stream we need to convert it to a buffer for tensorflow
                const buffer = await this.streamToBuffer(data);

                //Convert the buffer to a tensor
                const tensor = this.decodeImage(buffer)

                // Classify the image
                return await this.nsfw.classify(tensor).then((rawPredictions) => {

                    // Convert the raw predictions to a more readable format (beatufy)
                    let predictions = {}
                    rawPredictions.forEach((prediction) => {
                        predictions[prediction.className.toLowerCase()] = prediction.probability;
                    });

                    // Validate the image classification results
                    const results = this.validateImageClassification(rawPredictions, metaData, key, deleteImage)
                    resolve(results);
                });

            }).catch((e) => {
                reject(e);
            });
        })

    }

    /**
     * Decode the image buffer to a tensor
     * @param buffer - Image buffer
     * @returns {Tensor3D | Tensor4D}
     */
    decodeImage(buffer) {
        return tf.node.decodeImage(buffer, 3);
    }

    /**
     * Convert a stream to a buffer
     * @param stream
     * @returns {Promise<Buffer>}
     */
    async streamToBuffer(stream) {
        const chunks = [];
        for await (let chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    /**
     * Validate the image classification results
     * @param predictions - Raw predictions from the model
     * @param metaData - MetaData from the request
     * @param key - S3 Key of the image
     * @param deleteImage - Delete the image in S3 if it's NSFW
     * @returns {{result: string, data, nsfw: boolean, deletedImage: boolean}}
     */
    validateImageClassification(predictions, metaData, key, deleteImage = false) {
        const isNSFW = predictions[0].className !== "Neutral" && predictions[0].className !== "Drawing";
        const isSexyButNotExplicit = predictions[0].className === "Sexy" && predictions[0].probability < 0.6;
        const shouldDeleteImage = deleteImage && isNSFW && !isSexyButNotExplicit;

        if (isNSFW && !isSexyButNotExplicit) {
            Utils.log(logLevel.INFO, logModule.NSFW, `NSFW Image Detected: ${key} - ${predictions[0].className} - ${predictions[0].probability}`);
            if (shouldDeleteImage) {
                // Delete the image from the S3 Bucket
                this.s3.removeObject(this.bucket, key).then(() => {
                    Utils.log(logLevel.INFO, logModule.NSFW, `Deleted Image: ${key}`);
                });
            }
        }

        const embedData = {
            "content": null,
            "embeds": [
                {
                    "title": "Image has been Flagged",
                    "description": `Uploaded Image by <@${metaData.userID}> has been flagged with following details`,
                    "color": null,
                    "fields": [
                        { name: "User", value: `<@${metaData.userID}>`, inline: true },
                        { name: "Guild", value: `[${metaData.guildID}](https://dash.galaxybot.app/server/${metaData.guildID})`, inline: true },
                        { name: "Image", value: shouldDeleteImage ? null : `[Link](https://s3.galaxybot.app/${this.bucket}/${key})`, inline: true },
                        { name: "Action", value: shouldDeleteImage ? "Image has been deleted" : "Image has been kept", inline: true },
                        ...predictions.map(prediction => ({ name: prediction.className, value: Math.floor(prediction.probability * 100) + "%", inline: true }))
                    ],
                    "timestamp": new Date().toISOString(),
                    "image": {
                        "url": shouldDeleteImage ? null : `https://s3.galaxybot.app/${this.bucket}/${key}`
                    }
                }
            ],
            "attachments": []
        };

        // Send the embed to the Discord Webhook
        if (isNSFW && !isSexyButNotExplicit) {
            Utils.sendDiscordWebhook(config.discord.webhook, embedData);
        }

        return {
            nsfw: isNSFW && !isSexyButNotExplicit,
            deletedImage: shouldDeleteImage,
            result: predictions[0].className.toLowerCase(),
            // Convert the predictions to a more readable format
            data: predictions.reduce((acc, prediction) => ({ ...acc, [prediction.className.toLowerCase()]: prediction.probability }), {})
        };
    }
}

module.exports = { ImageClassificationHandler };