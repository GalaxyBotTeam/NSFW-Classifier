const {Utils, logLevel, logModule} = require("./Utils.js");
const nsfwjs = require('nsfwjs');

let nsfw = null;

class NSFW {
    /**
     * Initialize the NSFW Model
     * @param model {String} The model to load
     * @returns {Promise<void>}
     */
    async init(model) {
        Utils.log(logLevel.INFO, logModule.NSFW, "Loading NSFW Model");
        this.nsfw = await nsfwjs.load(model);
        nsfw = this.nsfw;
        Utils.log(logLevel.SUCCESS, logModule.NSFW, "NSFW Model Loaded");
    }

    getModel() {
        return this.nsfw;
    }

    static getModel() {
        return nsfw;
    }

}


module.exports = { NSFW };