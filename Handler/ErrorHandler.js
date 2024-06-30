const {Utils, logModule, logLevel} = require("../Utils/Utils.js")
class ErrorHandler {

    static printStacktrace = true;
    static context = "Out of Context";

    /**
     * ErrorHandler.handleThrowable() : Handles all Errors
     *
     * @param error : any|Error => The Error to handle
     * @param crash : Boolean => Set if the Bot should Crash after this Error
     */
    static handleThrowable(error, crash = false) {
        const printStacktrace = true;


        console.log(error);


        if(crash) {
            process.exitCode = 1;
            process.exit();
        }
    }

    static setDiscordContext(...context) {
        let message = null;
        context.forEach((msg) => {
            if(message == null) {
                message = msg;
            } else {
                message += " " + msg;
            }
        })
        this.context = message;
    }


}

module.exports = { ErrorHandler };