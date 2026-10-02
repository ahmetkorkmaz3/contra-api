const { githubContributionData, gitlabContributionData } = require('../requests')

const DAY_MS = 24 * 60 * 60 * 1000
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

function isValidUsername(username) {
    return typeof username === 'string' && USERNAME_PATTERN.test(username)
}

/**
 * Merges the GitHub and GitLab calendars. The GitHub days are the base.
 * Example:
 * {
 *    totalContributionCount: 5,
 *    contributions: [{ date: '2021-09-22', count: 5 }]
 * }
 */
async function getMergedContributions(githubUsername, gitlabUsername) {
    const [githubWeeks, gitlabData] = await Promise.all([
        githubContributionData(githubUsername),
        gitlabContributionData(gitlabUsername),
    ])

    const gitlabCounts = new Map(Object.entries(gitlabData))

    const contributions = []
    githubWeeks.forEach(week => {
        week.contributionDays.forEach(day => {
            contributions.push({
                date: day.date,
                count: day.contributionCount + (Number(gitlabCounts.get(day.date)) || 0),
            })
        })
    })

    const totalContributionCount = contributions.reduce((accumulator, contribution) => {
        return accumulator + contribution.count
    }, 0)

    return { totalContributionCount, contributions }
}

// Day number since the epoch. 'YYYY-MM-DD' strings parse as UTC, so no time zone shift.
function dayIndex(date) {
    return Math.floor(new Date(date).getTime() / DAY_MS)
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value)
}

function formatDay(day) {
    return new Date(day * DAY_MS).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    })
}

// Sums the counts for each day. Only days with contributions are in the map.
function countsByDay(contributions) {
    const counts = new Map()
    for (const item of contributions) {
        if (!item.count) continue
        const day = dayIndex(item.date)
        counts.set(day, (counts.get(day) || 0) + item.count)
    }
    return counts
}

// Gives the same numbers as app/utils/contributionStats.js in the frontend.
function getContributionStats(contributions, now = Date.now()) {
    const counts = countsByDay(contributions)
    const days = [...counts.keys()].sort((a, b) => a - b)

    let longestStreak = 0
    let run = 0
    for (let i = 0; i < days.length; i++) {
        run = i > 0 && days[i] - days[i - 1] === 1 ? run + 1 : 1
        longestStreak = Math.max(longestStreak, run)
    }
    // The current streak stays alive if the last active day is today or yesterday.
    const last = days[days.length - 1]
    const currentStreak =
        last !== undefined && dayIndex(now) - last <= 1 ? run : 0

    let bestDay = null
    for (const [day, count] of counts) {
        if (!bestDay || count > bestDay.count) bestDay = { day, count }
    }

    return {
        counts,
        activeDays: counts.size,
        longestStreak,
        currentStreak,
        bestDay,
    }
}

module.exports = {
    DAY_MS,
    isValidUsername,
    getMergedContributions,
    getContributionStats,
    dayIndex,
    formatNumber,
    formatDay,
}
