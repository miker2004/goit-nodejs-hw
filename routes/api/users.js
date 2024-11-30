const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const Jimp = require('jimp');
const auth = require('../../middleware/auth');
const User = require('../../models/user');

const router = express.Router();

const tmpDir = path.join(__dirname, '../../tmp');
const avatarsDir = path.join(__dirname, '../../public/avatars');

const storage = multer.diskStorage({
  destination: tmpDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post('/signup', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already in use' });
    }

    const newUser = new User({ email });
    await newUser.setPassword(password);
    await newUser.save();

    res.status(201).json({
      email: newUser.email,
      subscription: newUser.subscription,
      avatarURL: newUser.avatarURL,
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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });
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

router.get('/logout', auth, async (req, res) => {
  try {
    req.user.token = null;
    await req.user.save();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/', auth, async (req, res) => {
  const { subscription } = req.body;
  const validSubscriptions = ['starter', 'pro', 'business'];

  if (!validSubscriptions.includes(subscription)) {
    return res.status(400).json({ message: 'Invalid subscription' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { subscription },
      { new: true }
    );
    res.json({ email: updatedUser.email, subscription: updatedUser.subscription });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/avatars', auth, upload.single('avatar'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const tmpFilePath = file.path;
    const uniqueFileName = `${req.user._id}-${file.originalname}`;
    const finalFilePath = path.join(avatarsDir, uniqueFileName);

    const image = await Jimp.read(tmpFilePath);
    await image.resize(250, 250).writeAsync(finalFilePath);

    await fs.unlink(tmpFilePath);

    const avatarURL = `/avatars/${uniqueFileName}`;
    req.user.avatarURL = avatarURL;
    await req.user.save();

    res.status(200).json({ avatarURL });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
