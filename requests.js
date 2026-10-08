const axios = require('axios')

const TIMEOUT = 8000

const http = axios.create({
    timeout: TIMEOUT,
    headers: { 'User-Agent': 'contra-api' },
})

// The user does not exist on the upstream service.
class NotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'NotFoundError'
    }
}

// The upstream service gave an error, an unexpected response, or no response in time.
class UpstreamError extends Error {
    constructor(message, cause) {
        super(message)
        this.name = 'UpstreamError'
        this.cause = cause
    }
}

const GITHUB_CONTRIBUTIONS_QUERY = `query ($login: String!) {
    user(login: $login) {
        contributionsCollection {
            contributionCalendar {
                totalContributions
                weeks {
                    contributionDays {
                        contributionCount
                        date
                    }
                }
            }
        }
    }
}`

async function githubContributionData(username) {
    let response
    try {
        response = await http.post('https://api.github.com/graphql', {
            query: GITHUB_CONTRIBUTIONS_QUERY,
            variables: { login: username },
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GITHUB_PERSONAL_KEY}`,
            },
        })
    } catch (error) {
        throw new UpstreamError(`GitHub request failed: ${error.message}`, error)
    }

    const user = response.data && response.data.data && response.data.data.user
    if (!user) {
        const errors = (response.data && response.data.errors) || []
        if (errors.some(error => error.type === 'NOT_FOUND')) {
            throw new NotFoundError(`GitHub user not found: ${username}`)
        }
        throw new UpstreamError(`GitHub returned no user data: ${JSON.stringify(errors)}`)
    }

    return user.contributionsCollection.contributionCalendar.weeks
}

async function gitlabContributionData(username) {
    let response
    try {
        // GitLab sends an unknown user to the sign-in page, so a redirect means "not found".
        response = await http.get(`https://gitlab.com/users/${encodeURIComponent(username)}/calendar.json`, {
            maxRedirects: 0,
            validateStatus: status => status === 200 || status === 404 || (status >= 300 && status < 400),
        })
    } catch (error) {
        throw new UpstreamError(`GitLab request failed: ${error.message}`, error)
    }

    if (response.status !== 200) {
        throw new NotFoundError(`GitLab user not found: ${username}`)
    }
    if (!response.data || typeof response.data !== 'object') {
        throw new UpstreamError('GitLab returned an unexpected response body')
    }
    return response.data
}

// Returns { name, avatarUrl } from the public GitHub REST API.
async function githubProfile(username) {
    try {
        const response = await http.get(`https://api.github.com/users/${encodeURIComponent(username.split(',')[0].trim())}`, {
            headers: process.env.GITHUB_PERSONAL_KEY
                ? { 'Authorization': `Bearer ${process.env.GITHUB_PERSONAL_KEY}` }
                : {},
        })
        return {
            name: response.data.name || null,
            avatarUrl: response.data.avatar_url || null,
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            throw new NotFoundError(`GitHub user not found: ${username}`)
        }
        throw new UpstreamError(`GitHub profile request failed: ${error.message}`, error)
    }
}

// Downloads an image and returns it as a data URL, or null if the download fails.
async function imageDataUrl(url) {
    if (!url) return null
    try {
        const response = await http.get(url, { responseType: 'arraybuffer' })
        const type = String(response.headers['content-type'] || '').split(';')[0]
        if (!type.startsWith('image/')) return null
        return `data:${type};base64,${Buffer.from(response.data).toString('base64')}`
    } catch (error) {
        return null
    }
}

module.exports = {
    NotFoundError,
    UpstreamError,
    githubContributionData,
    gitlabContributionData,
    githubProfile,
    imageDataUrl,
}
