const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <h1>Hello from ${process.env.HOSTNAME}!</h1>
    <p>You've successfully configured HTTP access</p>
  `);
});

app.listen(8080, () => {
  console.log('App running on port 8080');
});
