const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gamesPlayed: { type: Number, default: 0 },
    matchWins: { type: Number, default: 14 } // Unoda dummy baseline wins
});

module.exports = mongoose.model('User', UserSchema);