/* Profile badge rendering helpers.

Badges that provide ICN data are rendered with the same renderer as the ICN editor
(scripts/icn_core.js). Fill-in badges, or badges with a blank/absent icon, fall back
to the bundled image in images/badges/, and then to placeholder.png if that image
doesn't exist. */

import { createICNCanvas } from "./icn_core.js"

export const PLACEHOLDER_BADGE_NOTICE = "The badge shown is a placeholder badge in case Rotur Assistant doesn't recognize that badge yet."

export function getBadgeICN(badge) {
    const icon = badge?.icon
    if (typeof icon === 'string' && icon.trim() !== '') {
        return icon
    }
    return ''
}

export function resolveBadgeImageName(badge, knownBadges) {
    const id = badge?.id
    let badge_name = (typeof id === 'string' && id.startsWith('app:')) ? badge.name : (id ?? badge?.name)
    if (badge_name == 'fluoride') {
        badge_name = 'Fluoride'
    }
    if (!knownBadges.includes(badge_name)) {
        badge_name = 'placeholder'
    }
    return badge_name
}

export function badgeTooltip(badge, isPlaceholder) {
    const name = badge?.name ?? ''
    const description = badge?.description ?? ''
    if (isPlaceholder) {
        return `${name}
        
${PLACEHOLDER_BADGE_NOTICE}
Original badge description: ${description}`
    }
    return `${name}
        
${description}`
}

export function createBadgeElement(badge, badge_name, size = 24) {
    const icn = getBadgeICN(badge)

    if (icn) {
        const canvas = createICNCanvas(icn, size, '#FFFFFF', false)
        canvas.className = 'badgeicon'
        canvas.title = badgeTooltip(badge, false)
        canvas.setAttribute('role', 'img')
        canvas.setAttribute('aria-label', badge?.name ?? badge_name)
        return canvas
    }

    const img = document.createElement('img')
    img.className = 'badgeicon'
    img.alt = badge?.name ?? badge_name
    img.width = size
    img.height = size

    if (badge_name == 'placeholder') {
        img.title = badgeTooltip(badge, true)
        img.src = '../images/badges/placeholder.png'
        return img
    }

    img.title = badgeTooltip(badge, false)
    // Fall back to the placeholder if the bundled image doesn't exist
    img.onerror = () => {
        img.onerror = null
        img.title = badgeTooltip(badge, true)
        img.src = '../images/badges/placeholder.png'
    }
    img.src = `../images/badges/${badge_name}.png`
    return img
}
