<h1 align="center">Welcome to Contra API 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/node-22.x-blue.svg" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://twitter.com/ahmetmkorkmaz" target="_blank">
    <img alt="Twitter: ahmetmkorkmaz" src="https://img.shields.io/twitter/follow/ahmetmkorkmaz.svg?style=social" />
  </a>
</p>

> Combines GitHub and GitLab contributions tables to create a single dataset

### 🏠 [Homepage](http://contra-api.vercel.app/)

### ✨ [Demo](http://contra-psi.vercel.app)

## Prerequisites

- node 22.x

## Install

```sh
yarn install
cp .env.example .env
```

## Environment variables

| Name | Description |
| --- | --- |
| `GITHUB_PERSONAL_KEY` | A GitHub token for the GraphQL API. |
| `PORT` | The local port. The default is `3000`. |
| `FRONTEND_URL` | The Contra frontend, for example `https://contra-psi.vercel.app`. `/api/share` sends people here. The card footer shows its host. |
| `PUBLIC_API_URL` | The public URL of this API, for example `https://contra-api.vercel.app`. `/api/share` uses it for the absolute `og:image` and `og:url` values. |

## Usage

```sh
yarn run start
```

## Endpoints

All endpoints take `githubUsername` and `gitlabUsername` query parameters. Each takes one username or several comma-separated ones (e.g. `a,b`), and every username must match `^[A-Za-z0-9._-]{1,100}$`. Contributions of all usernames are summed per day.

### `GET /api/contributions`

Returns the merged contribution calendar:

```json
{ "data": { "totalContributionCount": 1548, "contributions": [{ "date": "2026-10-01", "count": 5 }] } }
```

- `400`: a username is not valid.
- `404`: the GitHub or GitLab user does not exist.
- `502`: GitHub or GitLab gave an error or did not answer in 8 seconds.

### `GET /api/og`

Returns a 1200x630 PNG profile card for link previews. If a user does not exist or an upstream request fails, it returns a generic Contra card with status 200. Crawlers always get an image.

### `GET /api/share`

Returns a small HTML page with the Open Graph and Twitter card tags of the user. `og:image` points to `/api/og`. Browsers go on to the frontend result page with a meta refresh and `location.replace()`. Use this URL as the link that you share on X and LinkedIn.

Both `/api/og` and `/api/share` send `Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`, so the Vercel CDN caches them. After an upstream error, they send a 5-minute cache header instead.

## Fonts

`assets/fonts/` contains Inter by Rasmus Andersson, under the SIL Open Font License (see `assets/fonts/Inter-LICENSE.txt`).

## Author

👤 **Ahmet Korkmaz**

* Website: ahmetkorkmaz3.github.io
* Twitter: [@ahmetmkorkmaz](https://twitter.com/ahmetmkorkmaz)
* Github: [@ahmetkorkmaz3](https://github.com/ahmetkorkmaz3)

## Show your support

Give a ⭐️ if this project helped you!

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_