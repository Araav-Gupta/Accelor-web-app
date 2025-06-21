// middleware/fileupload.js
import multer from 'multer';
import { Readable } from 'stream';
import { getGfs, gfsReady } from '../utils/gridfs.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    try {
      const isProfilePicture = file.fieldname === 'profilePicture';
      const isMedicalCertificate = file.fieldname === 'medicalCertificate';
      const isJpeg = (isProfilePicture || isMedicalCertificate) && (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg');
      const isPdf = (!isProfilePicture || isMedicalCertificate) && file.mimetype === 'application/pdf';
      if (!isJpeg && !isPdf) {
        return cb(new Error(`Invalid file type for ${file.fieldname}. Only ${isProfilePicture ? 'JPEG/JPG images' : isMedicalCertificate ? 'JPEG/JPG images or PDF files' : 'PDF files'} are allowed.`));
      }
      cb(null, true);
    } catch (err) {
      console.error('File filter error:', err);
      cb(new Error('Unexpected error in file validation'));
    }
  },
});

const uploadToGridFS = (file, metadata = {}) => {
  return new Promise((resolve, reject) => {
    if (!gfsReady()) {
      return reject(new Error('GridFS is not initialized'));
    }
    const gfs = getGfs();
    const readableStream = Readable.from(file.buffer);
    const uploadStream = gfs.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: {
        ...metadata,
        fieldname: file.fieldname, // Store the field name (e.g., 'tenthTwelfthDocs')
      },
    });
    readableStream.pipe(uploadStream)
      .on('error', (err) => {
        console.error('Upload stream error:', err);
        reject(err);
      })
      .on('finish', () => {
        console.log('Upload stream finished:', uploadStream.id);
        resolve({ _id: uploadStream.id, filename: file.originalname });
      });
  });
};

export { upload, uploadToGridFS, gfsReady };