const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

const User = mongoose.model('User', userSchema);

// Create new user
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(400).json(err.code === 11000 ? 
      { error: 'Username already taken' } : 
      { error: 'Invalid username' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  res.json(await User.find({}, 'username _id'));
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = {
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: req.body.date ? new Date(req.body.date) : new Date()
    };

    if (isNaN(exercise.date)) exercise.date = new Date();
    user.log.push(exercise);
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid data' });
  }
});

// Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let log = user.log.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    // Apply filters
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (!isNaN(fromDate)) log = log.filter(ex => new Date(ex.date) >= fromDate);
    }
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (!isNaN(toDate)) log = log.filter(ex => new Date(ex.date) <= toDate);
    }
    if (req.query.limit) log = log.slice(0, parseInt(req.query.limit));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));