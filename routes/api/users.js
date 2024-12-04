const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const Jimp = require('jimp');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const auth = require('../../middleware/auth');
const User = require('../../models/user');
const Joi = require('joi');

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

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (email, verificationToken) => {
  const verificationLink = `${process.env.BASE_URL}/users/verify/${verificationToken}`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Email Verification',
      html: `<p>Click the link below to verify your email:</p>
             <a href="${verificationLink}">${verificationLink}</a>`,
    });
  } catch (error) {
    console.error('Error sending verification email:', error.message);
    throw new Error('Failed to send verification email');
  }
};

const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});

router.post('/signup', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already in use' });
    }

    const verificationToken = uuidv4();
    const newUser = new User({ email, verificationToken });
    await newUser.setPassword(password);
    await newUser.save();
    await sendVerificationEmail(email, verificationToken);

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
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
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

router.get('/auth/verify/:verificationToken', async (req, res) => {
  const { verificationToken } = req.params;

  try {
    const user = await User.findOne({ verificationToken });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.verificationToken = null;
    user.verify = true;
    await user.save();

    res.status(200).json({ message: 'Verification successful' });
  } catch (error) {
    console.error('Error in /auth/verify:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/verify', async (req, res) => {
  const { email } = req.body;

  // Validate request body
  const { error } = emailSchema.validate({ email });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.verify) {
      return res
        .status(400)
        .json({ message: 'Verification has already been passed' });
    }

    await sendVerificationEmail(user.email, user.verificationToken);

    res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error in /users/verify:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
