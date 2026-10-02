const router = require('express').Router()

const { NotFoundError, githubProfile } = require('../requests')
const { getMergedContributions, formatNumber } = require('../lib/contributions')
const {
    CACHE_CONTROL, ERROR_CACHE_CONTROL, frontendUrl, publicApiUrl, readUsernames, usernameQuery,
} = require('../lib/share')

const GENERIC_TITLE = 'Contra · Merge GitHub and GitLab contributions'
const GENERIC_DESCRIPTION = 'Merge your GitHub and GitLab contribution calendars into one heatmap.'

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

// JSON.stringify gives a JS string. Escaping "<" stops a "</script>" in the value.
function scriptString(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c')
}

function renderPage({ title, description, url, imageUrl, imageAlt, redirectUrl }) {
    const meta = [
        ['property', 'og:type', 'website'],
        ['property', 'og:site_name', 'Contra'],
        ['property', 'og:title', title],
        ['property', 'og:description', description],
        ['property', 'og:url', url],
        ['property', 'og:image', imageUrl],
        ['property', 'og:image:type', 'image/png'],
        ['property', 'og:image:width', '1200'],
        ['property', 'og:image:height', '630'],
        ['property', 'og:image:alt', imageAlt],
        ['name', 'twitter:card', 'summary_large_image'],
        ['name', 'twitter:title', title],
        ['name', 'twitter:description', description],
        ['name', 'twitter:image', imageUrl],
        ['name', 'twitter:image:alt', imageAlt],
    ].map(([key, name, content]) => `    <meta ${key}="${name}" content="${escapeHtml(content)}">`).join('\n')

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
${meta}
    <link rel="canonical" href="${escapeHtml(redirectUrl)}">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
    <script>location.replace(${scriptString(redirectUrl)})</script>
</head>
<body style="background:#030712;color:#d1d5db;font-family:system-ui,sans-serif">
    <p><a href="${escapeHtml(redirectUrl)}" style="color:#c7d2fe">Open the contribution graph on Contra</a></p>
</body>
</html>
`
}

// Crawlers do not follow the refresh or the script, so they read the tags here.
// A 302 would send them to the static tags of the SPA.
router.get('/', async (req, res) => {
    const usernames = readUsernames(req.query)
    const apiUrl = publicApiUrl()

    const page = {
        title: GENERIC_TITLE,
        description: GENERIC_DESCRIPTION,
        url: `${apiUrl}/api/share`,
        imageUrl: `${apiUrl}/api/og`,
        imageAlt: 'Contra: GitHub and GitLab contributions in one heatmap',
        redirectUrl: `${frontendUrl()}/`,
    }
    let cacheControl = CACHE_CONTROL

    if (usernames) {
        const query = usernameQuery(usernames)
        const { githubUsername, gitlabUsername } = usernames
        page.redirectUrl = `${frontendUrl()}/?${query}`
        try {
            const [merged, profile] = await Promise.all([
                getMergedContributions(githubUsername, gitlabUsername),
                githubProfile(githubUsername).catch(error => {
                    if (error instanceof NotFoundError) throw error
                    return { name: null }
                }),
            ])
            const name = profile.name || githubUsername
            Object.assign(page, {
                title: `${name} · ${formatNumber(merged.totalContributionCount)} contributions in the last 12 months`,
                description: `GitHub (${githubUsername}) and GitLab (${gitlabUsername}) contributions merged into one graph.`,
                url: `${apiUrl}/api/share?${query}`,
                imageUrl: `${apiUrl}/api/og?${query}`,
                imageAlt: `Contribution graph of ${name}: GitHub and GitLab contributions in the last 12 months`,
            })
        } catch (error) {
            if (!(error instanceof NotFoundError)) {
                console.error(error.message)
                cacheControl = ERROR_CACHE_CONTROL
            }
        }
    }

    res.set('Content-Type', 'text/html; charset=utf-8')
    res.set('Cache-Control', cacheControl)
    res.status(200).send(renderPage(page))
})

module.exports = router
