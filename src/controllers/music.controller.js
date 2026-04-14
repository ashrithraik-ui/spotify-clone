const fs = require('fs');
const musicModel = require('../models/music.model');
const albumModel = require('../models/album.model');
const { uploadFile } = require('../services/storage.services');
const mongoose = require('mongoose');

const cleanupFile = (file) => {
  if (!file?.path) return;
  fs.unlink(file.path, () => {});
};

async function createMusic(req, res) {
  const { title } = req.body;
  const audioFile = req.files?.music?.[0];
  const posterFile = req.files?.poster?.[0];

  if (!title) {
    return res.status(400).json({ message: 'Track title is required' });
  }
  if (!audioFile) {
    return res.status(400).json({ message: 'Audio file is required' });
  }

  try {
    const audioUpload = await uploadFile(fs.createReadStream(audioFile.path));

    let posterUrl = null;
    if (posterFile) {
      const posterUpload = await uploadFile(fs.createReadStream(posterFile.path));
      posterUrl = posterUpload.url;
    }

    const music = await musicModel.create({
      uri: audioUpload.url,
      poster: posterUrl,
      title,
      artist: req.user.id,
    });

    res.status(201).json({
      message: 'Music created successfully',
      music: {
        id: music._id,
        title: music.title,
        uri: music.uri,
        poster: music.poster,
        artist: music.artist,
      },
    });
  } catch (err) {
    console.error('Error uploading music:', err);
    res.status(500).json({ message: err.message || 'Failed to upload music' });
  } finally {
    cleanupFile(audioFile);
    cleanupFile(posterFile);
  }
}

async function createAlbum(req, res) {
  const { title, musics } = req.body;
  const posterFile = req.file;

  if (!title) {
    return res.status(400).json({ message: 'Album title is required' });
  }

  const musicIds = Array.isArray(musics)
    ? musics
    : typeof musics === 'string'
    ? musics
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const validMusicIds = musicIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  try {
    let posterUrl = null;
    if (posterFile) {
      const posterUpload = await uploadFile(fs.createReadStream(posterFile.path));
      posterUrl = posterUpload.url;
    }

    const album = await albumModel.create({
      title,
      artist: req.user.id,
      musics: validMusicIds,
      poster: posterUrl,
    });

    res.status(201).json({
      message: 'Album created successfully',
      album: {
        id: album._id,
        title: album.title,
        artist: album.artist,
        musics: album.musics,
        poster: album.poster,
      },
    });
  } catch (err) {
    console.error('Error creating album:', err);
    res.status(500).json({ message: err.message || 'Failed to create album' });
  } finally {
    cleanupFile(posterFile);
  }
}

async function getAllMusic(req, res) {
  try {
    const music = await musicModel
      .find()
      .sort({ createdAt: -1 })
      .limit(20);
    const formattedMusic = music.map(m => ({
      _id: m._id.toString(),
      id: m._id.toString(),
      title: m.title,
      uri: m.uri,
      poster: m.poster,
      artist: m.artist,
      createdAt: m.createdAt,
    }));
    res.status(200).json({ message: 'Music fetched successfully', music: formattedMusic });
  } catch (err) {
    console.error('Error fetching music:', err);
    res.status(500).json({ message: 'Failed to fetch music' });
  }
}

async function getAllAlbum(req, res) {
  try {
    const albums = await albumModel
      .find()
      .sort({ createdAt: -1 })
      .select('title artist musics poster');
    res.status(200).json({ message: 'Albums fetched successfully', albums });
  } catch (err) {
    console.error('Error fetching albums:', err);
    res.status(500).json({ message: 'Failed to fetch albums' });
  }
}

async function getAlbumById(req, res) {
  const albumId = req.params.albumId;
  if (!mongoose.Types.ObjectId.isValid(albumId)) {
    return res.status(400).json({ message: 'Invalid album ID' });
  }

  const album = await albumModel
    .findById(albumId);

  if (!album) {
    return res.status(404).json({ message: 'Album not found' });
  }

  return res.status(200).json({ message: 'Album fetched successfully', album });
}

async function getMusicById(req, res) {
  const { musicId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(musicId)) {
    return res.status(400).json({ message: 'Invalid music ID' });
  }

  const music = await musicModel.findById(musicId);
  if (!music) {
    return res.status(404).json({ message: 'Music not found' });
  }

  const formattedMusic = {
    _id: music._id.toString(),
    id: music._id.toString(),
    title: music.title,
    uri: music.uri,
    poster: music.poster,
    artist: music.artist,
    createdAt: music.createdAt,
  };

  return res.status(200).json({ message: 'Music fetched successfully', music: formattedMusic });
}

module.exports = {
  createMusic,
  createAlbum,
  getAllMusic,
  getAllAlbum,
  getAlbumById,
  getMusicById,
};
