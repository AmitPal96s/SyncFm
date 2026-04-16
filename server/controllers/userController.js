const Song = require('../models/Song');

// @desc    Get current user's song history
// @access  Private
exports.getMySongs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      order = 'desc', 
      platform 
    } = req.query;

    const query = { addedBy: req.user.id };
    if (platform && platform !== 'all') {
      query.platform = platform;
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const skip = (page - 1) * limit;

    const songs = await Song.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('room', 'code name');

    const total = await Song.countDocuments(query);

    res.json({
      songs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Remove a song from history
// @access  Private
exports.deleteSongFromHistory = async (req, res) => {
  try {
    const song = await Song.findById(req.params.songId);

    if (!song) {
      return res.status(404).json({ msg: 'Song not found' });
    }

    // Check ownership
    if (song.addedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'User not authorized' });
    }

    await song.deleteOne();

    res.json({ success: true, message: "Song removed from history." });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @desc    Bulk delete songs from history
// @access  Private
exports.bulkDeleteSongs = async (req, res) => {
  try {
    const { songIds, clearAll } = req.body;

    if (clearAll) {
      const result = await Song.deleteMany({ addedBy: req.user.id });
      return res.json({ success: true, deletedCount: result.deletedCount });
    }

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return res.status(400).json({ msg: 'No song IDs provided' });
    }

    // Ensure user owns all songs in the list
    const result = await Song.deleteMany({
      _id: { $in: songIds },
      addedBy: req.user.id
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
