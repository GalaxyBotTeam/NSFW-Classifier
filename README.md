<img alt="GalaxyBot" src="https://cdn.galaxybot.app/brand/v3/logo/logo_light.png" width="50%"/>

# GalaxyBot Image Classification


This project is a Node.js application that uses TensorFlow.js and NSFW.js for image classification. It's designed to detect and handle NSFW (Not Safe For Work) images uploaded to an S3 bucket.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js
- npm

### Installing

1. Clone the repository
```bash
git clone https://github.com/GalaxyBotTeam/NSFW-Classifier.git
```

2. Navigate to the project directory
```bash
cd your-project-directory
```

3. Install the dependencies
```bash
npm install
```

## Usage

This project consists of two main components:

1. `ImageClassificationHandler.js`: This handles the image classification process. It fetches an image from an S3 bucket, converts it into a TensorFlow tensor, classifies the image using the NSFW.js model, and validates the classification results.

2. `NSFW.js`: This initializes the NSFW.js model and provides a method to get the model.

### Configuration
The application needs a configuration file to run. Create a `config.json` file in the root directory of the project with the following content:
The content for the `config.json` is defined in the `config-example.json` file.

We use MinIO as an S3-compatible object storage server. You can use any S3-compatible object storage server by changing the `s3` configuration in the `config.json` file.

### Running the application
Start the application by running the following command:
```bash
  npm start
```

### Classifying an image
The application provides a Webserver that listens for POST requests on the `/api/v1/classifyImage` endpoint. To classify an image, send a POST request to the `/api/v1/classifyImage` endpoint with the following payload:

#### Request
```json
{
  "key": "your-s3-key", //The key of the image in the S3 bucket. The bucket is defined in the config file
  "deleteOnClassification": false //Boolean, should the image automaticly deleted if nsfw has been detected?
  "metadata": {
    "userID": "userID", //Guild ID for Discord Log
    "guildID": "guildID" //User ID for Discord Log
  }
}
```
#### Response:
Returns a JSON object with the classification results. The `result` field indicates the classification result. The `data` field contains the classification probabilities for each category.
In this example, the image is classified as `porn` with a probability of `0.8237768411636353`.
```json
{
  "nsfw": true,
  "deletedImage": false,
  "result": "porn",
  "data": {
    "porn": 0.8237768411636353,
    "sexy": 0.16640673577785492,
    "hentai": 0.006222452502697706,
    "neutral": 0.003563188249245286,
    "drawing": 0.00003067585203098133
  }
}
```

## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.