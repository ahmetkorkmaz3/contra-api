const fs = require('fs')
const path = require('path')

const { dayIndex, formatDay, formatNumber } = require('./contributions')

// Mirrors app/utils/shareCard.js in the frontend. Satori uses flexbox, so the
// canvas positions become absolute boxes.
const CARD_WIDTH = 1200
const CARD_HEIGHT = 630
const PAD = 64
const LEVEL_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
const WEEKS = 53
const HEATMAP_TOP = 392
const PITCH = (CARD_WIDTH - PAD * 2) / WEEKS

// With line-height 1, the Inter baseline is 0.864em under the top of the box.
// The canvas code gives baselines, so this converts them to top positions.
const BASELINE = 0.864

const GITHUB_ICON =
    'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z'
const GITLAB_ICON =
    'M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z'

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts')
let fonts

function loadFonts() {
    if (!fonts) {
        fonts = [
            ['Inter-Regular.ttf', 400],
            ['Inter-SemiBold.ttf', 600],
            ['Inter-Bold.ttf', 700],
        ].map(([file, weight]) => ({
            name: 'Inter',
            data: fs.readFileSync(path.join(FONT_DIR, file)),
            weight,
            style: 'normal',
        }))
    }
    return fonts
}

// Satori element without JSX.
function h(type, style, children, props = {}) {
    return { type, props: { ...props, style, children } }
}

function abs(left, top, style, children) {
    return h('div', { position: 'absolute', left, top, display: 'flex', ...style }, children)
}

function iconDataUrl(d, color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${d}"/></svg>`
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

// Satori cannot measure text before layout, so this estimates the Inter Bold
// width. It is a little wide on purpose, so the text fits.
function estimateWidth(text, size) {
    let em = 0
    for (const char of text) {
        if (char === ' ') em += 0.26
        else if ('iljtfrI.,:;!|\'"`'.includes(char)) em += 0.34
        else if ('mwMW@'.includes(char)) em += 0.9
        else if (char >= 'A' && char <= 'Z') em += 0.7
        else if (char.charCodeAt(0) > 0x2e7f) em += 1
        else em += 0.6
    }
    return em * size
}

// Makes the font smaller until the text fits in maxWidth.
function fitFont(text, size, maxWidth) {
    let current = size
    while (current > 20 && estimateWidth(text, current) > maxWidth) current -= 2
    return current
}

// A text box whose top is placed from the canvas baseline.
function text(value, { left, baseline, size, weight = 400, color, maxWidth, style = {} }) {
    return abs(left, baseline - size * BASELINE, {
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...(maxWidth ? { maxWidth } : {}),
        ...style,
    }, value)
}

// The indigo glow at the top left and the green glow at the bottom right.
const BACKGROUND_GLOW = [
    'radial-gradient(circle 720px at 240px -60px, rgba(99, 102, 241, 0.38), rgba(99, 102, 241, 0))',
    'radial-gradient(circle 560px at 1100px 700px, rgba(57, 211, 83, 0.14), rgba(57, 211, 83, 0))',
].join(', ')

function root(children) {
    return h('div', {
        position: 'relative',
        display: 'flex',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#030712',
        backgroundImage: BACKGROUND_GLOW,
        fontFamily: 'Inter',
        overflow: 'hidden',
    }, children)
}

function avatar({ avatarDataUrl, name }) {
    const size = 120
    const inner = avatarDataUrl
        ? h('img', { width: size, height: size, borderRadius: size / 2 }, undefined, {
            src: avatarDataUrl, width: size, height: size,
        })
        : h('div', {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#1f2937',
            color: '#9ca3af',
            fontSize: 56,
            fontWeight: 700,
        }, name.charAt(0).toUpperCase())

    // The ring is 3px wide with a 5px gap, as on the canvas.
    return abs(PAD - 8, PAD - 8, {
        width: size + 16,
        height: size + 16,
        padding: 5,
        borderRadius: (size + 16) / 2,
        border: '3px solid rgba(129, 140, 248, 0.6)',
    }, [inner])
}

function usernames({ githubUsername, gitlabUsername }) {
    const items = [[GITHUB_ICON, githubUsername], [GITLAB_ICON, gitlabUsername]]
    const textX = PAD + 120 + 36
    return abs(textX, PAD + 102 - 24 * BASELINE, {
        alignItems: 'center',
        maxWidth: CARD_WIDTH - PAD - textX,
        overflow: 'hidden',
    }, items.map(([icon, username], i) => h('div', {
        display: 'flex',
        alignItems: 'center',
        marginLeft: i ? 36 : 0,
        flexShrink: 1,
        minWidth: 0,
    }, [
        h('img', { width: 24, height: 24, flexShrink: 0 }, undefined, {
            src: iconDataUrl(icon, '#9ca3af'), width: 24, height: 24,
        }),
        h('div', {
            marginLeft: 10,
            fontSize: 24,
            fontWeight: 400,
            color: '#d1d5db',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        }, username),
    ])))
}

function badge(label) {
    return h('div', {
        position: 'absolute',
        right: PAD,
        top: PAD + 4,
        display: 'flex',
        alignItems: 'center',
        height: 38,
        padding: '0 20px',
        borderRadius: 19,
        backgroundColor: 'rgba(99, 102, 241, 0.14)',
        border: '1.5px solid rgba(129, 140, 248, 0.4)',
        color: '#c7d2fe',
        fontSize: 18,
        fontWeight: 600,
    }, label)
}

function statBoxes(stats, top) {
    const gap = 20
    const w = (CARD_WIDTH - PAD * 2 - gap * (stats.length - 1)) / stats.length
    return stats.map((stat, i) => abs(PAD + i * (w + gap), top, {
        width: w,
        height: 124,
        borderRadius: 18,
        backgroundColor: stat.highlight ? 'rgba(99, 102, 241, 0.16)' : 'rgba(31, 41, 55, 0.55)',
        border: `1.5px solid ${stat.highlight ? 'rgba(129, 140, 248, 0.45)' : 'rgba(55, 65, 81, 0.8)'}`,
    }, [
        text(stat.label.toUpperCase(), { left: 24, baseline: 36, size: 15, weight: 600, color: '#9ca3af' }),
        text(stat.value, {
            left: 24, baseline: 88, size: fitFont(stat.value, 46, w - 48), weight: 700, color: '#ffffff', maxWidth: w - 48,
        }),
        ...(stat.hint
            ? [text(stat.hint, { left: 24, baseline: 112, size: 15, color: '#6b7280', maxWidth: w - 48 })]
            : []),
    ]))
}

function heatmap(counts, now) {
    const today = dayIndex(now)
    // Day 0 (1970-01-01) is a Thursday. Sunday is the first row, as on GitHub.
    const weekday = (today + 4) % 7
    const start = today - weekday - (WEEKS - 1) * 7
    const cell = PITCH - 4
    const max = Math.max(1, ...counts.values())

    const cells = []
    for (let week = 0; week < WEEKS; week++) {
        for (let row = 0; row < 7; row++) {
            const day = start + week * 7 + row
            if (day > today) break
            const count = counts.get(day) || 0
            const level = count ? Math.min(4, Math.ceil((count / max) * 4)) : 0
            cells.push(abs(PAD + week * PITCH, HEATMAP_TOP + row * PITCH, {
                width: cell,
                height: cell,
                borderRadius: 3.5,
                backgroundColor: LEVEL_COLORS[level],
            }))
        }
    }
    return cells
}

function footer(host) {
    const y = (HEATMAP_TOP + 7 * PITCH + CARD_HEIGHT) / 2 + 4
    const square = color => h('div', {
        width: 16, height: 16, borderRadius: 3.5, backgroundColor: color, marginLeft: 5,
    })
    return abs(PAD, y - 12, {
        width: CARD_WIDTH - PAD * 2,
        height: 24,
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 18,
        color: '#6b7280',
    }, [
        h('div', { display: 'flex', alignItems: 'center' }, [
            h('div', { fontSize: 20, fontWeight: 700, color: '#ffffff' }, 'contra'),
            ...(host ? [h('div', { marginLeft: 12 }, `·  ${host}`)] : []),
        ]),
        h('div', { display: 'flex', alignItems: 'center' }, [
            h('div', { marginRight: 7 }, 'Less'),
            ...LEVEL_COLORS.map(square),
            h('div', { marginLeft: 12 }, 'More'),
        ]),
    ])
}

function profileCard({ avatarDataUrl, name, githubUsername, gitlabUsername, totalContributionCount, stats, host, now }) {
    const displayName = name || githubUsername
    const textX = PAD + 120 + 36
    const nameSize = fitFont(displayName, 52, 620)

    return root([
        avatar({ avatarDataUrl, name: displayName }),
        text(displayName, {
            left: textX, baseline: PAD + 58, size: nameSize, weight: 700, color: '#ffffff', maxWidth: 620,
        }),
        usernames({ githubUsername, gitlabUsername }),
        badge('Last 12 months'),
        ...statBoxes([
            { label: 'Contributions', value: formatNumber(totalContributionCount), highlight: true },
            { label: 'Active days', value: formatNumber(stats.activeDays) },
            {
                label: 'Longest streak',
                value: `${stats.longestStreak} days`,
                hint: stats.currentStreak ? `Current: ${stats.currentStreak} days` : '',
            },
            {
                label: 'Best day',
                value: formatNumber(stats.bestDay ? stats.bestDay.count : 0),
                hint: stats.bestDay ? formatDay(stats.bestDay.day) : '',
            },
        ], 232),
        ...heatmap(stats.counts, now),
        footer(host),
    ])
}

// Card for unknown users and upstream errors: logo, title, and tagline.
function genericCard({ host }) {
    const mark = [[1, 3], [4, 2]]
    return root([
        h('div', {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
        }, [
            h('div', { display: 'flex', alignItems: 'center' }, [
                h('div', { display: 'flex', flexDirection: 'column' }, mark.map((levels, row) => h('div', {
                    display: 'flex',
                    marginTop: row ? 8 : 0,
                }, levels.map((level, i) => h('div', {
                    width: 34,
                    height: 34,
                    marginLeft: i ? 8 : 0,
                    borderRadius: 8,
                    backgroundColor: LEVEL_COLORS[level],
                }))))),
                h('div', { marginLeft: 24, fontSize: 84, fontWeight: 700, color: '#ffffff', lineHeight: 1 }, 'contra'),
            ]),
            h('div', { marginTop: 44, fontSize: 48, fontWeight: 700, color: '#ffffff' }, 'Merge GitHub and GitLab contributions'),
            h('div', { marginTop: 18, fontSize: 26, color: '#9ca3af' }, 'Your GitHub and GitLab contribution calendars in one heatmap.'),
        ]),
        ...(host
            ? [abs(0, CARD_HEIGHT - PAD - 18, { width: CARD_WIDTH, justifyContent: 'center', fontSize: 20, color: '#6b7280' }, host)]
            : []),
    ])
}

// Satori loads harfbuzzjs, which reads hb.wasm on require. A missing file stops
// the process, so load the renderers here and keep the other routes safe.
async function renderPng(element) {
    const satori = require('satori').default
    const { Resvg } = require('@resvg/resvg-js')
    const svg = await satori(element, { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: loadFonts() })
    return new Resvg(svg, { fitTo: { mode: 'width', value: CARD_WIDTH } }).render().asPng()
}

function renderProfileCard(data) {
    return renderPng(profileCard({ now: Date.now(), ...data }))
}

function renderGenericCard(data = {}) {
    return renderPng(genericCard(data))
}

module.exports = {
    CARD_WIDTH,
    CARD_HEIGHT,
    renderProfileCard,
    renderGenericCard,
}
