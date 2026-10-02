const express = require('express')
const cors = require('cors');
require('dotenv').config({ quiet: true })
const app = express()
const port = process.env.PORT || 3000

const contributions = require('./api/contributions')
const og = require('./api/og')
const share = require('./api/share')

app.use(cors({
    origin: '*'
}));

app.use("/api/contributions", contributions);
app.use("/api/og", og);
app.use("/api/share", share);

// @vercel/node uses the exported app. app.listen() is for local runs only.
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
}

module.exports = app
