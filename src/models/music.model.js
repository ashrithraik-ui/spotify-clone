const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema(
  {
    uri: {
      type: String,
      required: true,
    },
    poster: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

const musicModel = mongoose.model('Music', musicSchema);
module.exports = musicModel;