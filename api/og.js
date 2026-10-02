const router = require('express').Router()

const { NotFoundError, githubProfile, imageDataUrl } = require('../requests')
const { getMergedContributions, getContributionStats } = require('../lib/contributions')
const { renderProfileCard, renderGenericCard } = require('../lib/card')
const { CACHE_CONTROL, ERROR_CACHE_CONTROL, frontendHost, readUsernames } = require('../lib/share')

// A smaller avatar is enough for the 120px circle.
function sizedAvatarUrl(url) {
    if (!url) return null
    const avatar = new URL(url)
    avatar.searchParams.set('s', '240')
    return avatar.toString()
}

async function profilePng({ githubUsername, gitlabUsername }) {
    const [merged, profile] = await Promise.all([
        getMergedContributions(githubUsername, gitlabUsername),
        githubProfile(githubUsername).catch(error => {
            // The card still works without the name and avatar.
            if (error instanceof NotFoundError) throw error
            return { name: null, avatarUrl: null }
        }),
    ])

    return renderProfileCard({
        avatarDataUrl: await imageDataUrl(sizedAvatarUrl(profile.avatarUrl)),
        name: profile.name,
        githubUsername,
        gitlabUsername,
        totalContributionCount: merged.totalContributionCount,
        stats: getContributionStats(merged.contributions),
        host: frontendHost(),
    })
}

// Crawlers must always get an image, so every error gives the generic card.
router.get('/', async (req, res) => {
    const usernames = readUsernames(req.query)
    let png
    let cacheControl = CACHE_CONTROL
    try {
        if (usernames) png = await profilePng(usernames)
    } catch (error) {
        if (!(error instanceof NotFoundError)) {
            console.error(error.message)
            cacheControl = ERROR_CACHE_CONTROL
        }
    }

    try {
        if (!png) png = await renderGenericCard({ host: frontendHost() })
    } catch (error) {
        console.error(error)
        return res.status(500).end()
    }

    res.set('Content-Type', 'image/png')
    res.set('Cache-Control', cacheControl)
    res.status(200).send(png)
})

module.exports = router
