const passport = require('passport');
const Blacklist = require('../models/blacklist');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  Blacklist.findOne({ token }, (err, blacklistedToken) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    if (blacklistedToken) {
      return res.status(401).json({ message: 'Token is blacklisted' });
    }

    passport.authenticate('jwt', { session: false }, (err, user) => {
      if (err || !user) {
        return res.status(401).json({ message: 'Not authorized' });
      }
      req.user = user;
      next();
    })(req, res, next);
  });
};

module.exports = auth;
