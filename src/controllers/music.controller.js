const fs = require('fs');
const musicModel = require('../models/music.model');
const albumModel = require('../models/album.model');
const playlistModel = require('../models/playlist.model');
const { uploadFile } = require('../services/storage.services');
const mongoose = require('mongoose');

const cleanupFile = (file) => {
  if (!file?.path) return;
  fs.unlink(file.path, () => {});
};

const formatMusic = (music, userId = null) => {
  const isLiked = Boolean(userId && music.likedBy?.some((id) => id.toString() === userId.toString()));
  return {
    _id: music._id.toString(),
    id: music._id.toString(),
    title: music.title,
    uri: music.uri,
    poster: music.poster,
    artist: music.artist,
    likes: music.likes || 0,
    isLiked,
    createdAt: music.createdAt,
  };
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
      music: formatMusic(music),
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
    const search = (req.query.search || '').trim();
    const filter = {};
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const music = await musicModel
      .find(filter)
      .populate('artist', 'username')
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedMusic = music.map((m) => formatMusic(m, req.user?.id));
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
      .populate('artist', 'username')
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
    .findById(albumId)
    .populate({ path: 'musics', populate: { path: 'artist', select: 'username' } })
    .populate('artist', 'username');

  if (!album) {
    return res.status(404).json({ message: 'Album not found' });
  }

  const formattedTracks = (album.musics || []).map((track) => formatMusic(track, req.user?.id));
  const formattedAlbum = {
    _id: album._id.toString(),
    id: album._id.toString(),
    title: album.title,
    poster: album.poster,
    artist: album.artist,
    tracks: formattedTracks,
    createdAt: album.createdAt,
  };

  return res.status(200).json({ message: 'Album fetched successfully', album: formattedAlbum });
}

async function getMusicById(req, res) {
  const { musicId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(musicId)) {
    return res.status(400).json({ message: 'Invalid music ID' });
  }

  const music = await musicModel.findById(musicId).populate('artist', 'username');
  if (!music) {
    return res.status(404).json({ message: 'Music not found' });
  }

  return res.status(200).json({ message: 'Music fetched successfully', music: formatMusic(music, req.user?.id) });
}

async function likeMusic(req, res) {
  const { musicId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(musicId)) {
    return res.status(400).json({ message: 'Invalid music ID' });
  }

  const music = await musicModel.findById(musicId);
  if (!music) {
    return res.status(404).json({ message: 'Music not found' });
  }

  const userId = req.user.id.toString();
  const alreadyLiked = music.likedBy?.some((id) => id.toString() === userId);
  if (alreadyLiked) {
    music.likedBy = music.likedBy.filter((id) => id.toString() !== userId);
    music.likes = Math.max(0, (music.likes || 0) - 1);
  } else {
    music.likedBy = Array.from(new Set([...(music.likedBy || []), req.user.id]));
    music.likes = (music.likes || 0) + 1;
  }

  await music.save();
  res.status(200).json({
    message: alreadyLiked ? 'Track unliked' : 'Track liked',
    likes: music.likes,
    isLiked: !alreadyLiked,
  });
}

async function createPlaylist(req, res) {
  const { title, musics } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Playlist title is required' });
  }

  const musicIds = Array.isArray(musics)
    ? musics
    : typeof musics === 'string'
    ? musics.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

  const validMusicIds = musicIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  const playlist = await playlistModel.create({
    title: title.trim(),
    user: req.user.id,
    musics: validMusicIds,
  });

  res.status(201).json({ message: 'Playlist created successfully', playlist });
}

async function getUserPlaylists(req, res) {
  const playlists = await playlistModel
    .find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .populate({ path: 'musics', populate: { path: 'artist', select: 'username' } });

  res.status(200).json({ message: 'Playlists fetched successfully', playlists });
}

async function getPlaylistById(req, res) {
  const { playlistId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json({ message: 'Invalid playlist ID' });
  }

  const playlist = await playlistModel
    .findOne({ _id: playlistId, user: req.user.id })
    .populate({ path: 'musics', populate: { path: 'artist', select: 'username' } });

  if (!playlist) {
    return res.status(404).json({ message: 'Playlist not found' });
  }

  res.status(200).json({ message: 'Playlist fetched successfully', playlist });
}

async function addTracksToPlaylist(req, res) {
  const { playlistId } = req.params;
  const { musics } = req.body;
  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    return res.status(400).json({ message: 'Invalid playlist ID' });
  }

  const playlist = await playlistModel.findOne({ _id: playlistId, user: req.user.id });
  if (!playlist) {
    return res.status(404).json({ message: 'Playlist not found' });
  }

  const musicIds = Array.isArray(musics)
    ? musics
    : typeof musics === 'string'
    ? musics.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

  const validMusicIds = musicIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  playlist.musics = Array.from(new Set([...(playlist.musics || []), ...validMusicIds]));
  await playlist.save();

  const updated = await playlistModel
    .findById(playlist._id)
    .populate({ path: 'musics', populate: { path: 'artist', select: 'username' } });

  res.status(200).json({ message: 'Playlist updated', playlist: updated });
}

module.exports = {
  createMusic,
  createAlbum,
  getAllMusic,
  getAllAlbum,
  getAlbumById,
  getMusicById,
  likeMusic,
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addTracksToPlaylist,
};
