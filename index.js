const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err.message));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true }, 
  isPhoneVerified: { type: Boolean, default: false },
  verificationCode: String, 
});

const User = mongoose.model('User', userSchema);

app.use(bodyParser.json());

app.post('/register', (req, res) => {
  const { email, password, phoneNumber } = req.body;

  // Generate a random verification code
  const verificationCode = Math.floor(1000 + Math.random() * 9000);

  const user = new User({ email, password, phoneNumber, verificationCode });

  user.save()
    .then(() => {
      // Send verification code via Twilio
      client.messages
        .create({
          body: `Your verification code is: ${verificationCode}`,
          from: '+18156621326',
          to: phoneNumber,
        })
        .then((message) => {
          console.log('Verification code sent:', message.sid);
          res.status(200).json({ message: 'User registered successfully. Check your phone for verification code.' });
        })
        .catch((error) => {
          console.error('Error sending verification code:', error);
          res.status(500).json({ message: 'Error sending verification code.' });
        });
    })
    .catch((error) => {
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Error registering user.' });
    });
});

// Phone number verification endpoint
app.post('/verify-phone', (req, res) => {
  const { phoneNumber, verificationCode } = req.body;

  User.findOne({ phoneNumber: phoneNumber })
    .then((user) => {
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
      } else if (user.isPhoneVerified) {
        res.status(400).json({ message: 'Phone number already verified.' });
      } else if (verificationCode === user.verificationCode) {
        user.isPhoneVerified = true;
        user.save()
          .then(() => {
            res.status(200).json({ message: 'Phone number successfully verified.' });
          })
          .catch((error) => {
            console.error('Error updating user:', error);
            res.status(500).json({ message: 'Error updating user.' });
          });
      } else {
        res.status(400).json({ message: 'Incorrect verification code.' });
      }
    })
    .catch((error) => {
      console.error('Error finding user:', error);
      res.status(500).json({ message: 'Error finding user.' });
    });
});

// Server start
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
