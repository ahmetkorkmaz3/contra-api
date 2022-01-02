const express = require('express')
const axios = require('axios')
const cors = require('cors');
require('dotenv').config()
const app = express()
const port = process.env.PORT

const contributions = require('./api/contributions')

app.use(cors({
    origin: '*'
}));

app.use("/api/contributions", contributions);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})