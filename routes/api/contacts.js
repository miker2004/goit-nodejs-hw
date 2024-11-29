const express = require('express');
const router = express.Router();
const Contact = require('../../models/contacts');
const auth = require('../../middleware/auth');

router.get(
  '/',
  auth,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, favorite } = req.query;
      const filter = {
        owner: req.user.id,
        ...(favorite !== undefined && { favorite: favorite === 'true' }),
      };
      const skip = (page - 1) * limit;

      const contacts = await Contact.find(filter).skip(skip).limit(Number(limit));
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
  }
);

router.get(
  '/:contactId',
  auth,
  async (req, res, next) => {
    try {
      const { contactId } = req.params;
      const contact = await Contact.findOne({ _id: contactId, owner: req.user.id });

      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }

      res.json(contact);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  auth,
  async (req, res, next) => {
    try {
      const newContact = await Contact.create({
        ...req.body,
        owner: req.user.id,
      });
      res.status(201).json(newContact);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:contactId',
  auth,
  async (req, res, next) => {
    try {
      const { contactId } = req.params;
      const deletedContact = await Contact.findOneAndDelete({
        _id: contactId,
        owner: req.user.id,
      });

      if (!deletedContact) {
        return res.status(404).json({ message: 'Contact not found' });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:contactId',
  auth,
  async (req, res, next) => {
    try {
      const { contactId } = req.params;
      const updatedContact = await Contact.findOneAndUpdate(
        { _id: contactId, owner: req.user.id },
        req.body,
        { new: true, runValidators: true }
      );

      if (!updatedContact) {
        return res.status(404).json({ message: 'Contact not found' });
      }

      res.json(updatedContact);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:contactId/favorite',
  auth,
  async (req, res, next) => {
    try {
      const { contactId } = req.params;
      const { favorite } = req.body;

      if (favorite === undefined) {
        return res.status(400).json({ message: 'Missing field favorite' });
      }

      const updatedContact = await Contact.findOneAndUpdate(
        { _id: contactId, owner: req.user.id },
        { favorite },
        { new: true }
      );

      if (!updatedContact) {
        return res.status(404).json({ message: 'Contact not found' });
      }

      res.status(200).json(updatedContact);
    } catch (error) {
      next(error);
    }
  }
);


module.exports = router;
