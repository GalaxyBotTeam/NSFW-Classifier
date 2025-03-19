<img alt="GalaxyBot" src="https://cdn.galaxybot.app/brand/v3/logo/logo_light.png" width="50%"/>

# GalaxyBot Image Classification

This project is a TypeScript application that uses TensorFlow.js and NSFW.js for image classification. It's designed to detect and handle NSFW (Not Safe For Work) images uploaded to an S3 bucket.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js or Bun
- npm (or Bun)
- TypeScript

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
# OR using Bun
bun install
```

## Usage

This project consists of two main components:

1. `ImageClassificationHandler.ts`: This handles the image classification process. It fetches an image from an S3 bucket, converts it into a TensorFlow tensor, classifies the image using the NSFW.js model, and validates the classification results.

### Configuration
The application needs a configuration file to run. Create a `config.json` file in the root directory of the project with the following content:
The content for the `config.json` is defined in the `config-example.json` file.

We use MinIO as an S3-compatible object storage server. You can use any S3-compatible object storage server by changing the `s3` configuration in the `config.json` file.
If you dont need a port for your s3 endpoint it can be set to null

### Building and Running the application

#### Using npm
Build the TypeScript files:
```bash
npm run build
```

Start the application:
```bash
npm start
```

Development mode (with auto-reloading):
```bash
npm run dev
```

#### Using Bun
Build the TypeScript files:
```bash
bun run build
```

Start the application:
```bash
bun start
```

Development mode (with auto-reloading):
```bash
bun run dev
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
Returns a JSON object with the classification results. The `flagged` field indicates the classification result. The `categories` and the `scores` field contains the classification probabilities for each category.
In this example, the image is classified as `sexual` with a probability of `0.9849382780471674`.
DeleteImage is true if the image has been deleted from the S3 bucket.
```json
{
 "flagged": true,
 "categories": {
  "harassment": false,
  "harassment/threatening": false,
  "sexual": true,
  "hate": false,
  "hate/threatening": false,
  "illicit": false,
  "illicit/violent": false,
  "self-harm/intent": false,
  "self-harm/instructions": false,
  "self-harm": false,
  "sexual/minors": false,
  "violence": false,
  "violence/graphic": false
 },
 "scores": {
  "harassment": 0,
  "harassment/threatening": 0,
  "sexual": 0.9849382780471674,
  "hate": 0,
  "hate/threatening": 0,
  "illicit": 0,
  "illicit/violent": 0,
  "self-harm/intent": 0.0002785803623326577,
  "self-harm/instructions": 0.0002318797868593433,
  "self-harm": 0.004690984132226771,
  "sexual/minors": 0,
  "violence": 0.12459626487974881,
  "violence/graphic": 0.002384378805524485
 },
 "deletedImage": true
}
```

## License

This project is licensed under the MIT License - see the `LICENSE.md` file for details.
