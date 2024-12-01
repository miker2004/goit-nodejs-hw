const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const gravatar = require('gravatar');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: { type: String, required: true },
  subscription: { type: String, default: 'starter' },
  token: { type: String, default: null },
  avatarURL: { 
    type: String, 
    default: function () { 
      return gravatar.url(this.email, { s: '200', d: 'retro' }, true);
    },
  },
}, { versionKey: false });

userSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(password, salt);
};

userSchema.methods.validPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
