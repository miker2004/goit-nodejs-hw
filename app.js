const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');

const contactsRouter = require('./routes/api/contacts');

const app = express();

const uri = 'mongodb+srv://dzanuszgames:il9xxngkjkAEgep0@personalfinancetracker.drflz.mongodb.net/';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Database connection successful'))
  .catch(err => {
    console.error('Database connection error:', err.message);
    process.exit(1);
  });

const formatsLogger = app.get('env') === 'development' ? 'dev' : 'short';

app.use(logger(formatsLogger));
app.use(cors());
app.use(express.json());

app.use('/api/contacts', contactsRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
