const router = require('express').Router()

const { NotFoundError } = require('../requests')
const { getMergedContributions, isValidUsername } = require('../lib/contributions')

router.get('/', async (req, res) => {
    const { githubUsername, gitlabUsername } = req.query

    if (!isValidUsername(githubUsername) || !isValidUsername(gitlabUsername)) {
        return res.status(400).json({
            error: 'githubUsername and gitlabUsername must match ^[A-Za-z0-9._-]{1,100}$',
        })
    }

    try {
        const data = await getMergedContributions(githubUsername, gitlabUsername)
        res.status(200).json({ data })
    } catch (error) {
        if (error instanceof NotFoundError) {
            return res.status(404).json({ error: error.message })
        }
        console.error(error.message)
        res.status(502).json({ error: 'Could not get the contribution data from GitHub or GitLab' })
    }
})

module.exports = router
