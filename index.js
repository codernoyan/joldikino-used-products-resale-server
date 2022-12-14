const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
// stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;

// middleware's
app.use(cors({
  origin: ["http://localhost:3000", "https://joldikino-assignment.web.app"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
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
};

// mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
const advertisedCollection = client.db('joldiKino').collection('advertised');
const paymentsCollection = client.db('joldiKino').collection('payments');
const bookingsCollection = client.db('joldiKino').collection('bookings');

// verify admin with jwt
const verifyAdmin = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);
  if (user?.role !== 'admin') {
    return res.status(403).send({ access: 'Forbidden access' });
  }
  next();
};

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
    
    res.cookie("joldikino-token", token, {
      // maxAge: new Date(Date.now() + 86400000),
      // httpOnly: true,
      // signed: true
      expires: new Date(Date.now() + 86400000)
    }).json({ result, token });
    
    // res.send({ result, token });
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
});

// get all users by role
app.get('/users', verifyJwt, async (req, res) => {
  try {
    const userRole = req.query.role;
    const query = { role: userRole };
    const users = await usersCollection.find(query).toArray();

    res.send(users);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// delete a user for admin
app.delete('/users/:id', verifyJwt, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const result = await usersCollection.deleteOne(filter);

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// product post
app.post('/products', verifyJwt, async (req, res) => {
  try {
    const productsData = req.body;
    const result = await productCollection.insertOne(productsData);

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// get all products
app.get('/products', async (req, res) => {
  try {
    const query = {};
    const cursor = productCollection.find(query);
    const result = await cursor.toArray();

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// additional api for getting products by category
app.get('/products/camera', async (req, res) => {
  try {
    const category = req.query.category;
    const query = { category: category };
    const cursor = productCollection.find(query);
    const result = await cursor.toArray();

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// get all products for seller
app.get('/products/seller', async (req, res) => {
  try {
    const sellerEmail = req.query.email;
    const query = {
      sellerEmail: sellerEmail
    };
    const products = await productCollection.find(query).toArray();
    res.send(products);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// get a single product
app.get('/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await productCollection.findOne(query);

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// get advertised products
app.get('/advertised', async (req, res) => {
  try {
    const query = {};
    const cursor = advertisedCollection.find(query);
    const result = await cursor.toArray();

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});


// is seller verified
app.get('/user/seller/:email', async (req, res) => {
  try {
    const email = req.params.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);

    res.send({ isVerified: user?.isVerified === true });


  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// post product to advertise collection
app.post('/products/advertised', verifyJwt, async (req, res) => {
  try {
    const advertisedProduct = req.body;
    const result = await advertisedCollection.insertOne(advertisedProduct);

    res.send(result);
    console.log(advertisedProduct);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});


// update advertise status to products
app.put('/products/:id', verifyJwt, async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const productInfo = req.body;
    const options = { upsert: true };

    const updateDoc = {
      $set: productInfo
    };
    const updatedProduct = await productCollection.updateOne(query, updateDoc, options);

    res.send(updatedProduct);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// delete a product
app.delete('/products/:id', verifyJwt, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const result = await productCollection.deleteOne(filter);

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

app.get('/reported', verifyJwt, verifyAdmin, async (req, res) => {
  try {
    const query = { status: 'reported' };
    const cursor = productCollection.find(query)
    const result = await cursor.toArray();

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// post bookings
app.post('/bookings', verifyJwt, async (req, res) => {
  try {
    const booking = req.body;
    const result = await bookingsCollection.insertOne(booking);

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// get bookings
app.get('/bookings/:email', verifyJwt, async (req, res) => {
  try {
    const email = req.params.email;
    const query = {buyerEmail: email};
    const cursor = bookingsCollection.find(query);
    const result = await cursor.toArray();

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// get single booking
app.get('/bookings/product/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const result = await bookingsCollection.findOne(query);

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// v2 of advertised items
app.get('/advertised/v2', async (req, res) => {
  try {
    const query = { isAdvertised: true };
    const cursor = productCollection.find(query);
    const result = await cursor.toArray();

    res.send(result);

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// stripe payment api
app.post('/create-payment-intent', async (req, res) => {
  try {
    const booking = req.body;
    const price = Number(booking.itemPrice);
    const amount = price * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      currency: 'usd',
      amount: amount,
      "payment_method_types": [
        "card"
      ],
    });

    console.log(paymentIntent.client_secret);

    // send client secret
    res.send({
      clientSecret: paymentIntent.client_secret
    })

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});

// payments post api
app.post('/payments', async (req, res) => {
  try {
    const payment = req.body;
    const result = await paymentsCollection.insertOne(payment);
    const id = payment.bookingId;
    const query = { _id: ObjectId(id) };
    const options = { upsert: true };
    const updatedDoc = {
      $set: {
        paid: true,
      }
    };
    const updateProduct = await bookingsCollection.updateOne(query, updatedDoc, options)
    res.send({ result, updateProduct });

  } catch (error) {
    res.send({
      success: false,
      error: error.message
    })
  }
});


// default get
app.get('/', (req, res) => {
  res.send('Joldikino server is running');
});

app.listen(port, () => {
  console.log(`Joldikino server is running on port: ${port}`);
});
