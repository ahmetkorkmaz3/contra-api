const { isValidUsername } = require('./contributions')

const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
// An upstream error is temporary, so the fallback stays in the cache for a short time only.
const ERROR_CACHE_CONTROL = 'public, max-age=60, s-maxage=300'

function trimSlash(url) {
    return String(url || '').replace(/\/+$/, '')
}

function frontendUrl() {
    return trimSlash(process.env.FRONTEND_URL)
}

function publicApiUrl() {
    return trimSlash(process.env.PUBLIC_API_URL)
}

function frontendHost() {
    try {
        return new URL(frontendUrl()).host
    } catch (error) {
        return ''
    }
}

// Returns the usernames from the query, or null if one of them is not valid.
function readUsernames(query) {
    const { githubUsername, gitlabUsername } = query
    if (!isValidUsername(githubUsername) || !isValidUsername(gitlabUsername)) return null
    return { githubUsername, gitlabUsername }
}

function usernameQuery({ githubUsername, gitlabUsername }) {
    return new URLSearchParams({ githubUsername, gitlabUsername }).toString()
}

module.exports = {
    CACHE_CONTROL,
    ERROR_CACHE_CONTROL,
    frontendUrl,
    publicApiUrl,
    frontendHost,
    readUsernames,
    usernameQuery,
}
