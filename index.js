const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const jwtSecret = 'secret_key'; 

mongoose.connect('mongodb+srv://ndubuisiaso:J765uGBzds2LYKme@cluster0.y9ipvbd.mongodb.net/votar-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verificationToken: String,
  verified: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
     user: 'votarhq@gmail.com',
    pass: 'rgifyjwgrdvzczjj'
  },
});

app.use(bodyParser.json());

// Registration endpoint
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    // Create a new user record
    const user = new User({ email, password });
    await user.save();

     // Generate a JWT token
     const verificationToken = jwt.sign({ userId: user._id }, jwtSecret, { expiresIn: '1h' });

    // Send a verification email
    sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'User registered. Check your email for verification.', verificationToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Registration failed.' });
  }
});

// Email verification endpoint
app.get('/verify/:token', async (req, res) => {
  try {
    const token = req.params.token;
    // Verify the token using your JWT secret key
    const decoded = jwt.verify(token, jwtSecret);
    const userId = decoded.userId;

    // Find the user by their ID and mark them as verified
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Mark the user as verified
    user.verified = true;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Email verification failed.' });
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Helper function to send a verification email
function sendVerificationEmail(email, token) {
  const mailOptions = {
    to: email,
    subject: 'Email Verification',
    html: `Click <a href="http://localhost:3000/verify/${token}">here</a> to verify your email.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log(`Email sent: ${info.response}`);
    }
  });
}