const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// middleware's
app.use(cors());
app.use(express.json());

// verify jwt middleware
const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ access: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ access: 'Forbidden' });
    }
    req.decoded = decoded;
    next();
  })
}

// mongodb
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ufdxsbo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const dbConnect = async () => {
  try {
    await client.connect();
    console.log('Database Connected');
  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
};

dbConnect();

const productCollection = client.db('joldiKino').collection('products');
const usersCollection = client.db('joldiKino').collection('users');

// save user in database
app.put('/user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const query = { email: email };
    const user = req.body;
    const options = { upsert: true };

    const updateDoc = {
      $set: user
    }
    const result = await usersCollection.updateOne(query, updateDoc, options);
    console.log(result);

    // create auth token
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '1d'
    })
    res.send({ result, token });
  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// get a single user
app.get('/user/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);

    res.send(user);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
})

// get all users
app.get('/users', async (req, res) => {
  try {
    const query = {};
    const users = await usersCollection.find(query).toArray();

    res.send(users);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// product post
app.post('/products', async (req, res) => {
  try {
    const productsData = req.body;
    console.log(productsData);
    const result = await productCollection.insertOne(productsData);
    
    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
})

app.get('/', (req, res) => {
  res.send('Joldikino server is running');
});

app.listen(port, () => {
  console.log(`Joldikino server is running on port: ${port}`);
})
