const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Contact = require('../../models/contacts');
const User = require('../../models/user');
const auth = require('../../middleware/auth');


router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, favorite } = req.query;

    const filter = favorite !== undefined ? { favorite: favorite === 'true' } : {};
    const skip = (page - 1) * limit;
    const contacts = await Contact.find(filter)
      .skip(skip)
      .limit(Number(limit));

    const total = await Contact.countDocuments(filter);

    res.json({
      contacts,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/', auth, async (req, res, next) => {
  const { subscription } = req.body;
  const validSubscriptions = ['starter', 'pro', 'business'];

  try {
    if (!validSubscriptions.includes(subscription)) {
      return res.status(400).json({
        message: `Invalid subscription. Allowed values: ${validSubscriptions.join(', ')}`,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { subscription },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      email: user.email,
      subscription: user.subscription,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const contact = await Contact.findById(contactId);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const newContact = await Contact.create(req.body);
    res.status(201).json(newContact);
  } catch (error) {
    next(error);
  }
});

router.delete('/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const deletedContact = await Contact.findByIdAndDelete(contactId);

    if (!deletedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.put('/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const updatedContact = await Contact.findByIdAndUpdate(contactId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedContact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json(updatedContact);
  } catch (error) {
    next(error);
  }
});

router.patch('/:contactId/favorite', async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const { favorite } = req.body;

    if (favorite === undefined) {
      return res.status(400).json({ message: 'missing field favorite' });
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      { new: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.status(200).json(updatedContact);
  } catch (error) {
    next(error);
  }
});


router.post('/users/signup', async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({
        status: 'error',
        code: 409,
        message: 'Email is already in use',
        data: 'Conflict',
      });
    }

    const newUser = new User({ email });
    newUser.setPassword(password); 
    await newUser.save();

    res.status(201).json({
      status: 'success',
      code: 201,
      user: {
        email: newUser.email,
        subscription: newUser.subscription || 'starter', 
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/users/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.validPassword(password)) {
      return res.status(400).json({
        status: 'error',
        code: 400,
        message: 'Incorrect email or password',
        data: 'Bad request',
      });
    }

    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

    user.token = token;
    await user.save(); 

    res.json({
      status: 'success',
      code: 200,
      data: {
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});


router.get('/users/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        message: 'Not authorized',
      });
    }

    user.token = null; 
    await user.save();

    return res.status(204).send(); 
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Server error',
    });
  }
});

router.get('/users/current', auth, (req, res) => {
  const { email, subscription } = req.user;

  if (!email || !subscription) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  res.status(200).json({
    email,
    subscription: subscription || 'starter',
  });
});


module.exports = router;
