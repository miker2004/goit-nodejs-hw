const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('./config/passport'); 
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const usersRouter = require('./routes/api/users');
const contactsRouter = require('./routes/api/contacts');

const app = express();

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}/${process.env.MONGO_DB}?retryWrites=true&w=majority`;

mongoose.connect(uri)
  .then(() => console.log('Database connected'))
  .catch(err => console.log('Error connecting to database', err));

app.use(logger('dev'));
app.use(cors());
app.use(express.json());

const avatarsPath = path.join(__dirname, 'public/avatars');
if (!fs.existsSync(avatarsPath)) {
  fs.mkdirSync(avatarsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsPath); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`); 
  },
});

const upload = multer({ storage });

app.use('/avatars', express.static(avatarsPath));

app.post('/upload', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Brak pliku do przesłania');
  }
  res.send(`Plik został przesłany! Możesz go zobaczyć tutaj: /avatars/${req.file.filename}`);
});

app.get('/', (req, res) => {
  res.send(`
    <h1>Prześlij avatar</h1>
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <input type="file" name="avatar" />
      <button type="submit">Wyślij</button>
    </form>
  `);
});

app.use(passport.initialize());

app.use('/api/users', usersRouter);
app.use('/api/contacts', contactsRouter);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
