import path from 'path';
import fs from 'fs';
import ImageKit from 'imagekit';
import logger from '../utils/logger';

const getImageKitInstance = (): ImageKit | null => {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (publicKey && privateKey && urlEndpoint) {
    return new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
  }
  return null;
};

export const uploadFile = async (file: Express.Multer.File): Promise<string> => {
  const imagekit = getImageKitInstance();

  if (imagekit) {
    try {
      const fileBuffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (fileBuffer) {
        const response = await imagekit.upload({
          file: fileBuffer,
          fileName: file.filename || file.originalname || `upload-${Date.now()}`,
          folder: '/whatsapp-clone',
        });
        logger.info(`File uploaded to ImageKit: ${response.url}`);

        // Clean up temporary local file if it exists
        if (file.path && fs.existsSync(file.path)) {
          fs.unlink(file.path, (err) => {
            if (err) logger.error(`Failed to delete temp file: ${err.message}`);
          });
        }

        return response.url;
      }
    } catch (error) {
      logger.error('Failed to upload file to ImageKit, falling back to local storage: %O', error);
    }
  }

  // Local storage fallback
  const PORT = process.env.PORT || 5000;
  const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;

  const relativePath = `uploads/${file.filename}`;
  const fullUrl = `${serverUrl}/${relativePath}`;

  logger.info(`File uploaded locally: ${fullUrl}`);
  return fullUrl;
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  logger.info(`File deletion requested for: ${fileUrl}`);
};
