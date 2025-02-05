const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// #region Murat was here

const s3 = new S3Client({
    endpoint: process.env.CLOUDFLARE_ENDPOINT,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
    region: "auto",
    signatureVersion: "v4",
});



const uploadToR2 = async (fileBuffer, fileName, mimeType) => {
    try {        
        // Set up S3 params
        const params = {
            Bucket: "profile-images",
            Key: fileName,
            Body: fileBuffer,
            ContentType: mimeType || "application/octet-stream"
        };

        const command = new PutObjectCommand(params);
        const result = await s3.send(command);
        // Upload using putObject
        console.log("Upload successful:", result);
        return result;
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}

/*
const deleteFromR2 = async (fileName) => {
    try {
        const params = {
            Bucket: "profile-images",
            Key: fileName
        };

        const command = new DeleteObjectCommand(params);
        const result = await s3.send(command);
        console.log("Delete successful:", result);
        return result;
    } catch (error) {
        console.error('Delete failed:', error);
        throw error;
    }
}
*/


const getLoadURL= async (fileName) => {
    const command = new GetObjectCommand({
        Bucket: "profile-images",
        Key: fileName,
        ContentType: "application/octet-stream",
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 86400 }); // 24 hours
    return signedUrl;
}

module.exports = { uploadToR2, getLoadURL };
