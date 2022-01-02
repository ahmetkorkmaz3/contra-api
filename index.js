const express = require('express')
const axios = require('axios')
require('dotenv').config()
const app = express()
const port = 3000

const { githubContributionData, gitlabContributionData } = require('./requests')

app.get('/contributions', async (req, res) => {
  const githubUsername = req.query.githubUsername
  const gitlabUsername = req.query.gitlabUsername

  /**
   * Example:
   * contributions: [
   *    {
   *       date: '2021-9-22',
   *       count: 5
   *    }
   * ]
   */
  let contributions = []

  await githubContributionData(githubUsername).then(data => {
    data.forEach(element => {
      element.contributionDays.forEach(day => {
        contributions.push({
          date: day.date,
          count: day.contributionCount
        })
      })
    });
  })

  let gitlabData = []

  await gitlabContributionData(gitlabUsername).then(data => {
    gitlabData = Object.entries(data).map(([key, value]) => ({date: key, count: value }))
  })

  contributions.forEach((element, index) => {
    const itemIndex = gitlabData.findIndex(item => item.date === element.date)

    if (itemIndex !== -1) {
      contributions[index].count = contributions[index].count + gitlabData[itemIndex].count
    }
  });

  res.json({
    data: contributions
  }, 200)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})