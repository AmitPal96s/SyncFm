const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

// All routes are protected by JWT auth
router.use(auth);

// @route   GET /api/users/me/songs
router.get('/me/songs', userController.getMySongs);

// @route   DELETE /api/users/me/songs/:songId
router.delete('/me/songs/:songId', userController.deleteSongFromHistory);

// @route   DELETE /api/users/me/songs
router.delete('/me/songs', userController.bulkDeleteSongs);

module.exports = router;
