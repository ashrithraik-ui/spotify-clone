const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    musics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Music',
      },
    ],
  },
  { timestamps: true }
);

const playlistModel = mongoose.model('Playlist', playlistSchema);
module.exports = playlistModel;
