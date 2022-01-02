const axios = require('axios')

function githubContributionData(username) {
    return new Promise(resolve => {
        axios.post('https://api.github.com/graphql', {
            query: `query {
                          user(login: "${username}"){
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
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GITHUB_PERSONAL_KEY}`,
            }
        }).then(response => {
            resolve(response.data.data.user.contributionsCollection.contributionCalendar.weeks)
        })
    });
}

function gitlabContributionData(username) {
    return new Promise(resolve => {
        axios.get(`https://gitlab.com/users/${username}/calendar.json`).then(response => {
            resolve(response.data)
        })
    })
}

module.exports = {
    githubContributionData,
    gitlabContributionData,
}