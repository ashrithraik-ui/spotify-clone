const express = require('express');
const os = require('os');
const multer = require('multer');
const musicController = require('../controllers/music.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Use disk storage to avoid buffering large audio files in memory.
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      cb(null, safeName);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max per file
  },
});

const router = express.Router();

// Music uploads (audio + optional poster) require artist role.
router.post(
  '/upload',
  authMiddleware.authArtist,
  upload.fields([{ name: 'music', maxCount: 1 }, { name: 'poster', maxCount: 1 }]),
  musicController.createMusic
);

// Albums and music listings are public; they can be accessed without login.
router.post('/album', authMiddleware.authArtist, upload.single('poster'), musicController.createAlbum);
router.get('/', musicController.getAllMusic);
router.get('/album', musicController.getAllAlbum);
router.get('/albums/:albumId', musicController.getAlbumById);
// Also support the more common singular path for detail requests.
router.get('/album/:albumId', musicController.getAlbumById);
router.get('/:musicId', musicController.getMusicById);

module.exports = router;