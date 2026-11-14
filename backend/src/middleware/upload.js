import multer from "multer";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "../constants.js";

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    const error = new Error(
      "Formato de imagen no permitido. Use JPG, PNG o WEBP."
    );
    error.status = 400;
    return cb(error);
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});
