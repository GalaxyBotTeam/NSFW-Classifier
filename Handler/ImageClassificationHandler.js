const {MinIO} = require("../Utils/MinIO");
const {NSFW} = require("../Utils/NSFW");
const tf = require("@tensorflow/tfjs-node");
const {Utils, logLevel, logModule} = require("../Utils/Utils");

class ImageClassificationHandler {

    constructor() {
        this.s3 = MinIO.getS3();
        this.nsfw = NSFW.getModel();
        this.bucket = "media";
    }

    async classifyImage(key, metaData, deleteImage = false) {

        return new Promise(async (resolve, reject) => {
            this.s3.getObject(this.bucket, key).then(async (data) => {
                const buffer = await this.streamToBuffer(data);

                return await this.nsfw.classify(this.decodeImage(buffer)).then((rawPredictions) => {
                    let predictions = {}
                    rawPredictions.forEach((prediction) => {
                        predictions[prediction.className.toLowerCase()] = prediction.probability;
                    });

                    resolve(this.validateImageClassification(rawPredictions, metaData, key, deleteImage));
                });

            }).catch((e) => {
                reject(e);
            });
        })

    }

    decodeImage(pic) {
        return tf.node.decodeImage(pic, 3);
    }

    streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    validateImageClassification(predictions, metaData, key, deleteImage = false) {
        let isNSFW = {
            nsfw: false,
            deletedImage: false,
            result: null,
            data: {},
        };
        if (predictions[0].className !== "Neutral" || predictions[0].className !== "Drawing") {
            if (predictions[0].className === "Sexy" && predictions[0].probability < 0.6) {
                isNSFW = {
                    nsfw: false,
                    deletedImage: false,
                    result: predictions[0].className.toLowerCase(),
                    data: predictions,
                }
            } else {
                isNSFW = {
                    nsfw: true,
                    deletedImage: false,
                    result: predictions[0].className.toLowerCase(),
                    data: predictions,
                }

                Utils.log(logLevel.INFO, logModule.NSFW, `NSFW Image Detected: ${key} - ${predictions[0].className} - ${predictions[0].probability}`)

                let embedData = {
                    "content": null,
                    "embeds": [
                        {
                            "title": "Image has been Flagged",
                            "description": `Uploaded Image by <@${metaData.userID}> has been flagged with following details`,
                            "color": null,
                            "fields": [],
                            "timestamp": new Date().toISOString(),
                            "image": {
                                "url": null
                            }
                        }
                    ],
                    "attachments": []
                }

                embedData.embeds[0].fields.push({
                    name: "User",
                    value: `<@${metaData.userID}>`,
                    inline: true
                })

                embedData.embeds[0].fields.push({
                    name: "Guild",
                    value: `[${metaData.guildID}](https://dash.galaxybot.app/server/${metaData.guildID})`,
                    inline: true
                })

                if (!deleteImage){
                    embedData.embeds[0].fields.push({
                        name: "Image",
                        value: `[Link](https://s3.galaxybot.app/${this.bucket}/${key})`,
                        inline: true
                    })

                    embedData.embeds[0].fields.push({
                        name: "Action",
                        value: "Image has been kept",
                        inline: true
                    })

                    embedData.embeds[0].image.url = `https://s3.galaxybot.app/${this.bucket}/${key}`
                }

                if (deleteImage){
                    this.s3.removeObject(this.bucket, key).then(() => {
                        Utils.log(logLevel.INFO, logModule.NSFW, `Deleted Image: ${key}`);
                    })
                    embedData.embeds[0].fields.push({
                        name: "Action",
                        value: "Image has been deleted",
                        inline: true
                    })

                    isNSFW.deletedImage = true;
                }

                predictions.forEach((prediction) => {
                    embedData.embeds[0].fields.push({
                        name: prediction.className,
                        value: Math.floor(prediction.probability * 100) + "%",
                        inline: true
                    })
                })

                Utils.sendDiscordWebhook("https://discord.com/api/webhooks/1185943091987873893/DQx6KdY97vgnkml9hNvfv5IQMaH7HwdoWC7xzgn0Eck9bVwibz8qTRu0koe_7Ot76pls", embedData)
            }
        } else {
            isNSFW = {
                nsfw: false,
                deletedImage: false,
                result: predictions[0].className.toLowerCase(),
                data: predictions
            }
        }

        isNSFW.data = {}

        predictions.forEach((prediction) => {
            isNSFW.data[prediction.className.toLowerCase()] = prediction.probability;
        });

        return isNSFW;
    }
}

module.exports = { ImageClassificationHandler };