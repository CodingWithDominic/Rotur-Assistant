import { sanitize, formatDate, openSuccessPopup, openErrorPopup, openWarningPopup, FixDecimal, CreateEmptyPlaceholder } from "../index.js"

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

const settings = await new Promise(resolve =>
    chrome.storage.local.get('settings', data => resolve(data.settings || "00000000"))
    ) ?? "00000000";

if (settings[0] == '1' || settings[1] == '1') {
    openWarningPopup('Your current settings may affect the visibility of overlays on Rotur Assistant and other services that support overlays.')
}

let preview_cache = ''

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'input', 'hr', 'a'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'type', 'placeholder', 'step', 'style']
}
const sanitizer = new Sanitizer(config)

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Cosmetics</h1>
        <p>Manage your cosmetics and shop for new ones</p>
        <hr class="full-size">
        <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>
    `)
}
if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].setHTML(`
        <h1>Cosmetics</h1>
        <p>Manage your cosmetics and shop for new ones</p>
        <hr class="full-size">
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `)
}

let cosmetic_cache = ''
let shop_cache = ''
let active_cache = ''
let user_sub = "Free"
let order = 'newest'
let unowned = false
let canbuycosmetics = true

let user_balance = 0
let mistium_balance = 0
async function getBalances() {
    user_balance = await fetch(`https://api.rotur.dev/get_user?auth=${activeacc.token}`).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].setHTML(`
            <h1>Cosmetics</h1>
            <p>Manage your cosmetics and shop for new ones</p>
            <hr class="full-size">
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `)
        return;
    })
    if ((user_balance.error && (user_balance.error == 'Invalid authentication credentials') && !user_balance.username) || (user_balance['sys.banned'])) { // Extra check in place in case someone decides to set a key named "error" to "Invalid authentication credentials"
        flagged.push(activeacc.uuid)
        chrome.storage.local.set({flagged: flagged})
        document.getElementById('cosmeticlist').setHTML(`
            <h1>Cosmetics</h1>
            <p>Manage your cosmetics and shop for new ones</p>
            <hr class="full-size">
            <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
        `)
        canbuycosmetics = false
        return;
    }
    user_sub = user_balance['sys.subscription']?.tier ?? "Free"
    user_balance = user_balance['sys.currency'] ?? 0
    mistium_balance = await fetch(`https://api.rotur.dev/profile?name=Mist`).then(res => res.json()) // Cache the balance
    mistium_balance = mistium_balance.currency ?? 0
}

const user_url = `https://avatars.rotur.dev/${activeacc.name}`

// Pop-ups

function OpenInsufficientFundsMsg(msg) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Success</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">${sanitize(msg)}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `, {sanitizer: sanitizer})
}
/*
Edge cases in order:
- User is Mist buying her own cosmetic
- User is Mist buying someone else's cosmetic
- User is buying their own cosmetic
- User is buying someone else's cosmetic (Built-in edge case of the user buying a cosmetic from Mist)

Note: This pop-up is bypassed entirely if the user buys a free cosmetic
*/
function OpenConfirmCosmeticPurchasePopup(name, cosmetic_id, price, creator_perc, creator, creator_bal) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Confirm Purchase</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p>Confirm purchase of the cosmetic "${sanitize(name)}"?</p>
        ${(activeacc.name.toLowerCase() == 'mist') ? `${(creator.toLowerCase() == 'mist') ? `
        <p>Since this is your cosmetic, and you are Mist, this is pretty much free for you!</p>
        ` : `
        <p>Your Balance: ${user_balance} -> ${FixDecimal(user_balance - ((creator_perc / 100) * price))}</p>
        <p>${sanitize(creator)}'s Balance: ${creator_bal} -> ${FixDecimal(creator_bal + ((creator_perc / 100) * price))}</p>
        `}` : `
        ${(activeacc.name.toLowerCase() == creator.toLowerCase()) ? `
        <p>Your Balance: ${user_balance} -> ${FixDecimal(user_balance - (((100 - creator_perc) / 100) * price))}</p>
        ${((creator_perc > 0) && (creator_perc < 100) && (creator.toLowerCase() != 'mist')) ? `<p title='Mistium receives a 20% cut of every cosmetic purchase.'>Mist's Balance: ${mistium_balance} -> ${FixDecimal(mistium_balance + (((100 - creator_perc) / 100) * price))}</p>` : ``}
            ` : `
        <p>Your Balance: ${user_balance} -> ${FixDecimal(user_balance - price)}</p>
        <p>${sanitize(creator)}'s Balance: ${creator_bal} -> ${FixDecimal(creator_bal + ((((creator_perc == 0 || creator.toLowerCase() == 'mist') ? 100 : creator_perc) / 100) * price))}</p>
        ${((creator_perc > 0) && (creator_perc < 100) && (creator.toLowerCase() != 'mist')) ? `<p title='Mistium receives a 20% cut of every cosmetic purchase.'>Mist's Balance: ${mistium_balance} -> ${FixDecimal(mistium_balance + (((100 - creator_perc) / 100) * price))}</p>` : ``}`}
            `}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finalcosmeticpurchase" data-cosmeticid="${cosmetic_id}">Buy</button>
        </div>
    `, {sanitizer: sanitizer})
}

function OpenCosmeticInfoPopup(data) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Cosmetic Info</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <ul id="popupinfolist"></ul>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Dismiss</button>
        </div>
    `, {sanitizer: sanitizer})
    const li1 = document.createElement('li')
    const li2 = document.createElement('li')
    const li3 = document.createElement('li')
    const li4 = document.createElement('li')
    const li5 = document.createElement('li')
    const li6 = document.createElement('li')
    const li7 = document.createElement('li')
    const li8 = document.createElement('li')
    const li9 = document.createElement('li')
    const li10 = document.createElement('li')
    document.getElementById('popupinfolist').style.display = 'block'
    document.getElementById('popupinfolist').replaceChildren(...[li1, li2, li3, li4, li5, li6, li7, li8, li9, li10])

    li1.textContent = `Name: ${data.name}`
    li2.textContent = `ID: ${data.id}`
    li3.textContent = `Created by: ${data.creator}`
    li4.textContent = `Description: ${data.description ?? 'None'}`
    li5.textContent = `Type: ${data.cosmetic_type ?? 'Unknown'}`
    li6.textContent = `Price: ${data.price ?? 0} RC`
    li7.textContent = `Owners: ${data.purchases}`
    li8.textContent = `Creator cut: ${data.creator_pct ?? 0}%`
    li9.textContent = `Created on: ${formatDate(data.created_at)}`
    li10.textContent = `Total Income: ${(data.price * data.purchases * ((data.creator_pct ?? 0) / 100))} RC`

    if (data.price == 0) {
        li6.textContent = "Price: Free"
        li10.textContent = "Total Income: 0 RC"
        li8.remove()
    }
    if (data.creator.toLowerCase() == 'mist') {
        li10.textContent = `Total Income: ${data.price * data.purchases} RC`
        li8.remove()
    }
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

// Other functions

function CreateMyCosmeticElement(cosmetic) {
    const cosmeticcard = document.getElementById('overlaytemplate').content.cloneNode(true)
    cosmeticcard.querySelector('.cosmeticitem').id = `mine_${cosmetic.id}`
    cosmeticcard.querySelector('.overlaytemplatepreview').title = cosmetic.description
    cosmeticcard.querySelector('.overlaytemplatepreview').style = 'border-radius: 50%;'
    cosmeticcard.querySelector('.useravataroverlaypreview').src = user_url
    cosmeticcard.querySelector('.useravataroverlaypreview').alt = activeacc.name
    cosmeticcard.querySelector('.useravataroverlaypreview').style = 'border-radius: 50%;'
    cosmeticcard.querySelector('.shopoverlayimg').src = cosmetic.image_url
    cosmeticcard.querySelector('.shopoverlayimg').alt = cosmetic.name

    cosmeticcard.querySelector('.overlayname').textContent = cosmetic.name
    cosmeticcard.querySelector('.overlayname').title = cosmetic.description
    cosmeticcard.querySelector('.overlaytype').textContent = cosmetic.cosmetic_type
    cosmeticcard.querySelector('.overlaycreator').setHTML(`By: <img src='https://avatars.rotur.dev/${cosmetic.creator}' alt='${cosmetic.creator}' width='16' height='16' class='creatorpfp'> ${cosmetic.creator}`, {sanitizer: sanitizer})
    cosmeticcard.querySelector('.equipoverlay').dataset.cosmeticid = cosmetic.id
    cosmeticcard.querySelector('.viewoverlayinfo').dataset.cosmeticid = cosmetic.id
    cosmeticcard.querySelector('.buyoverlay').remove()
    if (active_cache?.overlay?.id == cosmetic.id) {
        cosmeticcard.querySelector('.equipoverlay').textContent = "Unequip"
        cosmeticcard.querySelector('.equipoverlay').dataset.equipped = "true"
        cosmeticcard.querySelector('.cosmeticitem').style.background = '#00a2ff4b'
    }
    return cosmeticcard;
}

function CreateShopCosmeticElement(cosmetic) {
    const cosmeticcard = document.getElementById('overlaytemplate').content.cloneNode(true)
    cosmeticcard.querySelector('.cosmeticitem').id = `shop_${cosmetic.id}`
    cosmeticcard.querySelector('.overlaytemplatepreview').title = cosmetic.description
    cosmeticcard.querySelector('.overlaytemplatepreview').style = 'border-radius: 50%;'
    cosmeticcard.querySelector('.useravataroverlaypreview').src = user_url
    cosmeticcard.querySelector('.useravataroverlaypreview').style = 'border-radius: 50%;'
    cosmeticcard.querySelector('.useravataroverlaypreview').alt = activeacc.name
    cosmeticcard.querySelector('.shopoverlayimg').src = cosmetic.image_url
    cosmeticcard.querySelector('.shopoverlayimg').alt = cosmetic.name

    cosmeticcard.querySelector('.overlayname').textContent = cosmetic.name
    cosmeticcard.querySelector('.overlayname').title = cosmetic.description
    cosmeticcard.querySelector('.overlaytype').textContent = cosmetic.cosmetic_type
    cosmeticcard.querySelector('.overlaycreator').setHTML(`By: <img src='https://avatars.rotur.dev/${cosmetic.creator}' alt='${cosmetic.creator}' width='16' height='16'> ${cosmetic.creator}`, {sanitizer: sanitizer})
    cosmeticcard.querySelector('.viewoverlayinfo').dataset.cosmeticid = cosmetic.id
    cosmeticcard.querySelector('.buyoverlay').dataset.cosmeticid = cosmetic.id
    cosmeticcard.querySelector('.buyoverlay').textContent = `Buy (${(cosmetic.price ?? 0) == 0 ? "Free" : (cosmetic.price + " RC")})`
    cosmeticcard.querySelector('.equipoverlay').remove()
    if (cosmetic_cache.some(item => item.id == cosmetic.id)) {
        cosmeticcard.querySelector('.buyoverlay').disabled = true
        cosmeticcard.querySelector('.buyoverlay').textContent = "Purchased"
    }
    if (!canbuycosmetics) {
        cosmeticcard.querySelector('.buyoverlay').disabled = true
        cosmeticcard.querySelector('.buyoverlay').title = "An issue with your account, or the sub-token you provided your current account, prevents you from being able to buy cosmetics."
    }
    return cosmeticcard;
}

async function GetMyCosmetics() {
    if (cosmetic_cache == '') {
        cosmetic_cache = await fetch(`https://api.rotur.dev/cosmetics/mine?auth=${activeacc.token}`).then(res => res.json()).catch(err => {
            canbuycosmetics = false
            return ({"active_cosmetics":{},"owned_cosmetics":[]})
        })
        if (cosmetic_cache.error) {
            if (!flagged.includes(activeacc.uuid)) {
                document.getElementById('cosmeticlist').setHTML(`
                    <h1>Cosmetics</h1>
                    <p>Manage your cosmetics and shop for new ones</p>
                    <hr class="full-size">
                    <h3>The sub-token you have granted for your current account does not allow you to view your cosmetics. To resolve this issue, please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> and reauthenticate.</h3>
                `)
            }
            canbuycosmetics = false
            cosmetic_cache = ({"active_cosmetics":{},"owned_cosmetics":[]})
            return;
        }
        active_cache = { ...cosmetic_cache.active_cosmetics }
        cosmetic_cache = cosmetic_cache.owned_cosmetics
        
    }
    const cosmetic_html = []
    let supportwarning = false
    cosmetic_cache.forEach(cosmetic => {
        if (cosmetic.cosmetic_type == 'overlay') {
            cosmetic_html.push(CreateMyCosmeticElement(cosmetic))
        } else {
            supportwarning = true
        }
    })
    document.getElementById('cosmeticlist').replaceChildren(...cosmetic_html)
    if (cosmetic_html.length == 0) {
        const h3 = document.createElement('h3')
        h3.textContent = "You don't own any cosmetics yet"
        document.getElementById('cosmeticlist').replaceChildren(h3)
    }
    if (supportwarning) {
        const warning = document.createElement('p')
        warning.textContent = 'As of now, Rotur Assistant only supports the "Overlay" cosmetic type. Support for different cosmetic types will be added in future updates, once Rotur adds them, if they are added.'
        document.getElementById('cosmeticlist').insertAdjacentElement('beforebegin', warning) // Futureproofing once Rotur adds more cosmetics
    }
}



async function GetShopCosmetics() {
    if (shop_cache == '') {
        shop_cache = await fetch(`https://api.rotur.dev/cosmetics/shop`).then(res => res.json())
        shop_cache = shop_cache.items
    }
    const shopdata = [ ...shop_cache ] // While the Rotur API does have queries that does this for me, it's faster to manually calculate the order than to re-fetch from the API.
    switch (order) {
        case ('oldest'): {
            shopdata.reverse()
            break;
        }
        case ('low'): {
            shopdata.sort((a, b) => a.price - b.price)
            break;
        }
        case ('high'): {
            shopdata.sort((a, b) => b.price - a.price)
            break;
        }
        case ('popular'): {
            shopdata.sort((a, b) => b.purchases - a.purchases)
            break;
        }
        case ('obscure'): {
            shopdata.sort((a, b) => a.purchases - b.purchases)
            break;
        }
    }
    const shop_html = []
    let supportwarning = false
    shopdata.forEach(cosmetic => {
        if (!(unowned && cosmetic_cache.some(item => item.id == cosmetic.id))) {
            if (cosmetic.cosmetic_type == 'overlay') {
                shop_html.push(CreateShopCosmeticElement(cosmetic))
            } else {
                supportwarning = true
            }
        }

    })
    document.getElementById('cosmeticshoplist').replaceChildren(...shop_html)
    if (unowned && document.getElementById('cosmeticshoplist').childElementCount == 0) {
        document.getElementById('cosmeticshoplist').replaceChildren(CreateEmptyPlaceholder('You own all the cosmetics!', true))
    }
    if (supportwarning) {
        const warning = document.createElement('p')
        warning.textContent = 'As of now, Rotur Assistant only supports the "Overlay" cosmetic type. Support for different cosmetic types will be added in future updates, once Rotur adds them, if they are added.'
        document.getElementById('cosmeticshoplist').insertAdjacentElement('beforebegin', warning) // Futureproofing once Rotur adds more cosmetics
    }
    document.getElementById('cosmeticviewoptions').style.display = 'flex'
}

async function UnequipCosmetic(cosmetic) {
    const cosmeticdata = shop_cache[shop_cache.findIndex(cosmetic2 => cosmetic2.id == cosmetic)]
    const cosmeticsuccess = await fetch(`https://api.rotur.dev/cosmetics/unequip?type=${cosmeticdata.cosmetic_type}&auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json()).catch(err => {
        openErrorPopup("An unknown error occurred")
        return;
    })
    if (cosmeticsuccess.error) {
        openErrorPopup(cosmeticsuccess.error)
    } else {
        active_cache = {}
        if (document.querySelector('[data-equipped="true"]')) {
            document.querySelector('[data-equipped="true"]').closest('.cosmeticitem').style.background = ''
            document.querySelector('[data-equipped="true"]').textContent = "Equip"
            document.querySelector('[data-equipped="true"]').dataset.equipped = ''
        }
    }
}

async function EquipCosmetic(cosmetic) {
    const cosmeticsuccess = await fetch(`https://api.rotur.dev/cosmetics/equip/${cosmetic}?auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json())
    if (cosmeticsuccess.error) {
        openErrorPopup(cosmeticsuccess.error)
    } else {
        if (document.getElementById('mycosmetics').style.display == 'none') {
            openSuccessPopup(`Successfully equipped the cosmetic "${shop_cache[shop_cache.findIndex(cosmetic2 => cosmetic2.id == cosmetic)].name}"!`)
        }
        active_cache = shop_cache[shop_cache.findIndex(cosmetic2 => cosmetic.id == cosmetic)]
        if (document.querySelector('[data-equipped="true"]')) {
            document.querySelector('[data-equipped="true"]').closest('.cosmeticitem').style.background = ''
            document.querySelector('[data-equipped="true"]').textContent = "Equip"
            document.querySelector('[data-equipped="true"]').dataset.equipped = ''
        }
        document.getElementById(`mine_${cosmetic}`).querySelector('.equipoverlay').textContent = "Unequip"
        document.getElementById(`mine_${cosmetic}`).querySelector('.equipoverlay').dataset.equipped = 'true'
        document.getElementById(`mine_${cosmetic}`).style.background = '#00a2ff4b'
    }

}

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    getBalances()
    await GetMyCosmetics()
    await GetShopCosmetics(order, unowned)
}

async function BuyCosmetic(cosmetic) {
    const cosmeticsuccess = await fetch(`https://api.rotur.dev/cosmetics/purchase/${cosmetic}?auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json())
    if (cosmeticsuccess.error) {
        openErrorPopup(cosmeticsuccess.error)
    } else {
        const idx = shop_cache.findIndex(cosmetic2 => cosmetic2.id == cosmetic)
        shop_cache[idx].purchases += 1
        const cosmeticdata = shop_cache[idx]
        if (activeacc.name.toLowerCase() == 'mist') {
            user_balance -= (cosmeticdata.creator.toLowerCase() == 'mist') ? 0 : (cosmeticdata.price * ((cosmeticdata.creator_pct)/100))
            mistium_balance = user_balance
        } else {
            user_balance -= (cosmeticdata.creator.toLowerCase() == activeacc.name.toLowerCase()) ? (cosmeticdata.price * ((cosmeticdata.creator_pct)/100)) : cosmeticdata.price
            mistium_balance += (cosmeticdata.creator.toLowerCase() == 'mist') ? cosmeticdata.price : (cosmeticdata.price * ((100 - cosmeticdata.creator_pct)/100))
        }
        cosmetic_cache.push(cosmeticdata)
        document.getElementById(`shop_${cosmetic}`).querySelector('.buyoverlay').textContent = "Purchased"
        document.getElementById(`shop_${cosmetic}`).querySelector('.buyoverlay').disabled = true
        const equipnowbtn = document.createElement('button')
        equipnowbtn.textContent = 'Equip Now'
        equipnowbtn.id = 'equipcosmeticnow'
        equipnowbtn.dataset.cosmeticid = cosmetic
        openSuccessPopup(`Successfully purchased the cosmetic "${shop_cache[shop_cache.findIndex(cosmetic2 => cosmetic2.id == cosmetic)].name}"!`)
        document.getElementById('popup-choices').appendChild(equipnowbtn)
        document.getElementById('cosmeticlist').appendChild(CreateMyCosmeticElement(cosmeticdata))
    }
}

document.addEventListener('click', async function(e) {
    switch (e.target.className) {
        case ('closebtn'): {
            closePopup()
            break;
        }
        case ('tab'): {
            Array.from(document.getElementsByClassName('tab')).forEach(tab => {
                tab.style = 'border-bottom: none;'
            })
            e.target.style = 'border-bottom: 2px solid white;'
            document.getElementById('mycosmetics').style.display = (e.target.id == 'mycosmeticstab') ? 'block' : 'none'
            document.getElementById('shopcosmetics').style.display = (e.target.id == 'shopcosmeticstab') ? 'block' : 'none'
            document.getElementById('createcosmetics').style.display = (e.target.id == 'createcosmeticstab') ? 'block' : 'none'
            break;
        }
        case ('tab2'): {
            Array.from(document.getElementsByClassName('tab2')).forEach(tab => {
                tab.style = 'border-bottom: none;'
            })
            e.target.style = 'border-bottom: 2px solid white;'
            document.getElementById('createabout').style.display = (e.target.id == 'createabouttab') ? 'block' : 'none'
            document.getElementById('createtemplates').style.display = (e.target.id == 'createtemplatestab') ? 'block' : 'none'
            document.getElementById('createpreview').style.display = (e.target.id == 'createpreviewtab') ? 'flex' : 'none'
            break;
        }
        case ('buyoverlay'): {
            const cosmetic_data = shop_cache[shop_cache.findIndex(cosmetic => cosmetic.id == e.target.dataset.cosmeticid)]
            if (cosmetic_data.price > 0) {
                if (user_balance < cosmetic_data.price) {
                    openErrorPopup('Loading...')
                    document.getElementById('popupdialogue').innerText = `Insufficient funds\nYour balance (${user_balance}) < Cosmetic price (${cosmetic_data.price})\nDifference: ${cosmetic_data.price - user_balance}`
                } else {
                    const creator = cosmetic_data.creator.toLowerCase() == 'mist' ? null : await fetch(`https://api.rotur.dev/profile?name=${cosmetic_data.creator}`).then(res => res.json())
                    const creatorbal = cosmetic_data.creator.toLowerCase() == 'mist' ? mistium_balance : creator.currency
                    OpenConfirmCosmeticPurchasePopup(cosmetic_data.name, cosmetic_data.id, cosmetic_data.price, cosmetic_data.creator_pct, cosmetic_data.creator, creatorbal)
                }
            } else {
                BuyCosmetic(e.target.dataset.cosmeticid) // Cut to the chase if the cosmetic is free
            }
            break;
        }
        case ('equipoverlay'): {
            closePopup()
            if (e.target.dataset.equipped == 'true') {
                UnequipCosmetic(e.target.dataset.cosmeticid)
            } else {
                EquipCosmetic(e.target.dataset.cosmeticid)
            }
            break;
        }
        case ('viewoverlayinfo'): {
            const cosmetic_data = shop_cache[shop_cache.findIndex(cosmetic => cosmetic.id == e.target.dataset.cosmeticid)]
            OpenCosmeticInfoPopup(cosmetic_data)
            break;
        }
    }
    switch (e.target.id) {
        case ('finalcosmeticpurchase'): {
            closePopup()
            BuyCosmetic(e.target.dataset.cosmeticid)
            break;
        }
        case ('equipcosmeticnow'): {
            closePopup()
            EquipCosmetic(e.target.dataset.cosmeticid)
            break;
        }
        case ('onlyshowunowned'): {
            unowned = e.target.checked
            GetShopCosmetics(order, unowned)
            break;
        }
        case ('overlaypreviewselector'): {
            if (e.shiftKey) {
                e.preventDefault()
                const target = e.target
                const event = new Event('change')
                try {
                    const clipboardItems = await navigator.clipboard.read();
                    for (const clipboardItem of clipboardItems) {
                        const imageType = clipboardItem.types.find(type => type.startsWith('image/'));
                        if (imageType) {
                            const blob = await clipboardItem.getType(imageType);
                            const file = new File([blob], `image.${blob.type.split('/')[1]}`, { type: blob.type });
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            target.files = dataTransfer.files;
                            target.dispatchEvent(event)
                            return;
                        } else {
                            openErrorPopup('No image was detected on your clipboard.')
                        }
                    }
                } catch (err) {
                    openErrorPopup('No image was detected on your clipboard.')
                }
            }
        }
    }
})

document.getElementById('cosmeticsortselect')?.addEventListener('change', function(e) {
    order = e.target.value
    GetShopCosmetics(order, unowned)
})

document.getElementById('preview1')?.addEventListener('change', function(e) {
    document.querySelectorAll('img[src^="https://avatars.rotur.dev"]:not(img[src^="https://avatars.rotur.dev/.overlay"]):not([class="creatorpfp"])').forEach(img => {
        if (e.target.value == 'circle') {
            img.style = 'border-radius: 50%;'
        } else {
            img.style = 'border-radius: 5px;'
        }
    })
})

document.getElementById('overlaypreviewselector')?.addEventListener('change', function(e) {
    if (!e.target.files[0]) {
        return;
    }
    preview_cache = e.target.files[0]
    const circular = document.getElementById('preview1').querySelector('[value="circle"]').checked
    const reader = new FileReader();
    reader.onloadend = () => {
        preview_cache = reader.result
        const overlay = document.getElementById('overlaypreviewcontainer').querySelector('.shopoverlayimg')
        overlay.style.opacity = (document.getElementById('overlaypreviewopacity').value / 100) ?? 1
        document.getElementById('overlaypreviewcontainer').style.display = 'flex'
        document.getElementById('overlayopacitylabel').style.display = 'flex'
        document.getElementById('overlaypreviewcontainer').querySelector('.useravataroverlaypreview').src = user_url
        document.getElementById('overlaypreviewcontainer').querySelector('.useravataroverlaypreview').style = ('border-radius: ' + (circular ? "50%;" : "5px;"))
        document.getElementById('overlaypreviewcontainer').querySelector('.overlaytemplatepreview').style = ('border-radius: ' + (circular ? "50%;" : "5px;"))
        overlay.src = preview_cache
        document.getElementById('overlaypreviewopacity').addEventListener('input', function(e) {
            overlay.style.opacity = (e.target.value / 100)
        })
    };
    reader.readAsDataURL(preview_cache);
})