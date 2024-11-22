const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../../models/user');
const auth = require('../../middleware/auth');

router.post('/signup', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ message: 'Email is already in use' });
    }
    const newUser = new User({ email });
    newUser.setPassword(password);
    await newUser.save();

    res.status(201).json({
      email: newUser.email,
      subscription: newUser.subscription,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.validPassword(password)) {
      return res.status(400).json({ message: 'Incorrect email or password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
    user.token = token;
    await user.save();

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

router.get('/current', auth, (req, res) => {
  const { email, subscription } = req.user;
  res.status(200).json({ email, subscription });
});

router.patch('/', auth, async (req, res) => {
  const { subscription } = req.body;
  const validSubscriptions = ['starter', 'pro', 'business'];

  if (!validSubscriptions.includes(subscription)) {
    return res.status(400).json({ message: 'Invalid subscription' });
  }

  try {
    const user = await User.findByIdAndUpdate(req.user.id, { subscription }, { new: true });
    res.json({ email: user.email, subscription: user.subscription });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/logout', auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.token) {
      return res.status(400).json({ message: 'Not authorized' });
    }

    user.token = null;
    await user.save(); 

    res.status(204).send(); 
  } catch (error) {
    res.status(500).json({ message: 'Server error' }); 
  }
});


module.exports = router;
