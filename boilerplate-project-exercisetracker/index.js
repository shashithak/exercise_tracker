const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid'); // Used to generate user and exercise IDs
const path = require('path'); // Required to resolve file paths

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory data storage (you can replace it with a database like MongoDB)
let users = [];
let exercises = [];

// Serve the index.html file located in the views folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Route to create a new user
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).send('Username is required');
  }
  
  const user = {
    username: username,
    _id: uuidv4(),
  };
  users.push(user);
  
  res.json(user);
});

// Route to get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Route to add an exercise for a specific user
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  
  if (!description || !duration) {
    return res.status(400).send('Description and duration are required');
  }
  
  // Check if user exists
  const user = users.find(u => u._id === userId);
  if (!user) {
    return res.status(404).send('User not found');
  }
  
  const exercise = {
    _id: uuidv4(),
    description: description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
  };

  // Save the exercise
  exercises.push({ userId, exercise });

  // Return the user with the added exercise
  user.exercises = user.exercises || [];
  user.exercises.push(exercise);
  
  res.json(user);
});

// Route to get exercise logs for a specific user
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // Check if user exists
  const user = users.find(u => u._id === userId);
  if (!user) {
    return res.status(404).send('User not found');
  }

  let userExercises = user.exercises || [];

  // Filter by date range if provided
  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    userExercises = userExercises.filter(exercise => {
      const exerciseDate = new Date(exercise.date);
      return (!fromDate || exerciseDate >= fromDate) && (!toDate || exerciseDate <= toDate);
    });
  }

  // Limit the number of logs
  if (limit) {
    userExercises = userExercises.slice(0, parseInt(limit));
  }

  // Return the user with the filtered logs and count
  res.json({
    username: user.username,
    count: userExercises.length,
    _id: user._id,
    log: userExercises,
  });
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
