import { sanitize, formatDate, CreateEmptyPlaceholder, MiniError } from "../index.js"

const accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
) ?? [];
const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

let giftdata_cache = ''
let filter_cache = 'all'

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled']
}
const sanitizer = new Sanitizer(config)

function openPopup(amt, note) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Confirm Gift</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <h2>Confirming creation of gift with:</h2>
        <p id="giftpopupamt">Amount: ${amt}</p>
        <p id="giftpopuptax">Tax: ${(amt / 100).toFixed(2)}</p>
        <p id="giftpopuptotal">Total Payment: ${(amt * 1.01).toFixed(2)}</p>
        ${note ? `<p id="giftpopupnote">Note: ${sanitize(note)}</p>` : ``}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finalcreate">Confirm & Create</button>
        </div>
    `, {sanitizer: sanitizer})
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function renderGifts(filter) {
    const giftdata = giftdata_cache
    let giftsArray = giftdata.gifts
    const gift_count = giftsArray.length
    
    if (filter == 'claimed') {
        giftsArray = giftsArray.filter(gift => gift.claimed_by)
    }
    if (filter == 'unclaimed') {
        giftsArray = giftsArray.filter(gift => !gift.claimed_by)
    }
    document.getElementById('giftmanagerheader').replaceChildren(CreateEmptyPlaceholder(`Manage Existing Gifts (${giftsArray.length})`, true))
    let giftlisthtml = document.createElement('ul')
    if (giftsArray.length == 0) {
        giftlisthtml = document.createElement('h3')
        if (gift_count == 0) {
            giftlisthtml.textContent = `You have not created any gifts yet`
        } else {
            giftlisthtml.textContent = `No gifts were found that match this filter`
        }
    } else {
        giftsArray.forEach(gift_snippet => {
            const giftcard = document.getElementById('giftcardtemplate').content.cloneNode(true)
            giftcard.querySelector('.gifttitle').textContent = `Gift created on ${formatDate(gift_snippet.created_at)}`
            giftcard.querySelector('.giftamount').textContent = `Amount: ${gift_snippet.amount} RC`
            gift_snippet.note ? (giftcard.querySelector('.giftnote').innerText = `Note: ${gift_snippet.note}`) : giftcard.querySelector('.giftnote').remove()
            giftcard.querySelector('.giftexpirationdate').textContent = ("Expires: " + (gift_snippet.expires_at ? formatDate(gift_snippet.expires_at) : "Never"))
            giftcard.querySelector('.giftcode').textContent = ("Code: " + gift_snippet.code)
            giftcard.querySelector('.giftid').textContent = ("ID: " + gift_snippet.id)
            gift_snippet.claimed_by ? giftcard.querySelector('.claim_user').setHTML(`Claimed by: <a href="lookup.html?user=${gift_snippet.claimed_by}" style="text-decoration: none;"><img src='https://avatars.rotur.dev/${gift_snippet.claimed_by}' width="24" height="24"> ${gift_snippet.claimed_by}</a>`, {sanitizer: sanitizer}) : giftcard.querySelector('.claim_user').remove()
            gift_snippet.claimed_at ? giftcard.querySelector('.claimdate').textContent = formatDate(gift_snippet.claimed_at) : giftcard.querySelector('.claimdate').remove()
            if (!gift_snippet.claimed_at) {
                giftcard.querySelector('.copyurl').dataset.giftid = gift_snippet.code
                giftcard.querySelector('.revoke').dataset.giftid = gift_snippet.code
                giftcard.querySelector('.revoke').title = "While you will be refunded the gift's main value, you will not be refunded the tax spent when you initially created the gift."
                giftcard.querySelector('.revoke').dataset.giftid2 = gift_snippet.id
                giftcard.querySelector('.revoke').dataset.giftamt = gift_snippet.amount
                giftcard.querySelector('.giftcardrevokestatus').id = `giftrevokestatus_${gift_snippet.code}`
                giftcard.querySelector('.giftcontrolpanel').id = `giftcontrolbuttons_${gift_snippet.code}`
            } else {
                giftcard.querySelector('.giftcontrolpanel').remove()
                giftcard.querySelector('.giftcardrevokestatus').remove()
            }
            giftlisthtml.appendChild(giftcard)
        })
    }

    document.getElementById('giftsplaceholder').replaceChildren(giftlisthtml)
}

async function getGifts(filter) {
    if (accounts.length == 0) {
        document.getElementsByClassName('container')[0].setHTML(
            `<h1>Gift Manager</h1>
            <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>`, {sanitizer: sanitizer})
        return;
    }
    if (flagged.includes(activeacc.uuid)) {
        document.getElementsByClassName('container')[0].setHTML(`
            <h1>Gift Manager</h1>
            <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
        `, {sanitizer: sanitizer})
        return;
    }
    if (giftdata_cache == '') {
        giftdata_cache = await fetch(`https://api.rotur.dev/gifts/mine?auth=${activeacc.token}`).then(res => res.json()).catch(err => {
            document.getElementsByClassName('container')[0].setHTML(`
                <h1>Gift Manager</h1>
                <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
            `, {sanitizer: sanitizer})
            return;
        })
        if (giftdata_cache.error) {
            if (giftdata_cache.error == "Invalid authentication key") {
                flagged.push(activeacc.uuid)
                chrome.storage.local.set({flagged: flagged})
                document.getElementsByClassName('container')[0].setHTML(`
                    <h1>Gift Manager</h1>
                    <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
                `, {sanitizer: sanitizer})
                return;
            } else {
                document.getElementsByClassName('container')[0].setHTML(`
                    <h1>Gift Manager</h1>
                    <h3>The sub-token you have granted for your current account does not allow you to view this page. To resolve this issue, please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> and reauthenticate.</h3>
                `, {sanitizer: sanitizer})
                return;
            }
        }
        giftdata_cache.gifts = giftdata_cache.gifts.reverse()
    }
    renderGifts(filter)
}

async function performGiftSearch(query) {
    document.getElementById('giftlookupplaceholder').style = `border: none; padding: 0px;`
    
    let giftdata = ``
    if (query.startsWith('https://rotur.dev/gift?code=')) {
        query = query.split('https://rotur.dev/gift?code=')[1]
    } 
    giftdata = await fetch(`https://api.rotur.dev/gifts/${query}`).then(res => res.json())

    if (giftdata.error) {
        document.getElementById('giftlookupplaceholder').replaceChildren(MiniError('failure', giftdata.error))
        return;
    } else {
        giftdata = giftdata.gift
        const lookupcard = document.getElementById('giftlookuptemplate').content.cloneNode(true)
        lookupcard.querySelector('h2').setHTML(`Gift by <img src='https://avatars.rotur.dev/${giftdata.creator_id}' alt='${giftdata.creator_id}' width='24' height='24'> ${giftdata.creator_id}`, {sanitizer: sanitizer}) // setHTML is a safer alternative to innerHTML / parseHTML
        lookupcard.querySelector('.giftcardamt').textContent = `Amount: ${giftdata.amount} RC`
        giftdata.note ? lookupcard.querySelector('.giftcardnote').innerText = `Note: ${giftdata.note}` : lookupcard.querySelector('.giftcardnote').remove()
        lookupcard.querySelector('.giftcarddate').textContent = `Expires: ${giftdata.expires_at ? formatDate(giftdata.expires_at) : `Never`}`
        if (giftdata.creator_id == activeacc.name) {
            lookupcard.querySelector('.claimgiftbtn').disabled = true
        } else {
            lookupcard.querySelector('.giftfineprint').remove()
            lookupcard.querySelector('.claimgiftbtn').dataset.giftid = query
        }
        document.getElementById('giftlookupplaceholder').replaceChildren(lookupcard)
        document.getElementById('giftlookupplaceholder').style = `border: 2px solid white; padding: 8px;`
    }
}

getGifts('all')

document.addEventListener('change', async function(e) {
    if (e.target.name == 'giftfilter') {
        e.preventDefault()
        filter_cache = e.target.id
        renderGifts(filter_cache)
    }
})

document.addEventListener('input', async function (e) {
    if (e.target.id == 'giftamount') {
        const amt = parseFloat(e.target.value)
        if (isNaN(amt)) {
            document.getElementById('taxamt').replaceChildren()
        } else {
            document.getElementById('taxamt').setHTML(`<p>Estimated Tax: ${(amt / 100).toFixed(2)}</p>`, {sanitizer: sanitizer})
        }
    }
})

document.addEventListener('click', async function(e) {
    if (e.target.id == 'creategift') {
        const accdata = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}`).then(res => res.json())
        const amt = parseFloat(document.getElementById('giftamount').value)
        if (isNaN(amt)) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(MiniError('failure', "Please enter a valid amount"))
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 10000)
        } else if (accdata.currency < (amt * 1.01).toFixed(2)) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(MiniError('failure', "Insufficient Funds"))
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 10000)
        } else {
            const note = document.getElementById('giftnote').value
            openPopup(amt, note)
        }
        return;
    }
    if (e.target.id == 'cancel' || e.target.id == 'popup-x') {
        closePopup()
        return;
    }
    if (e.target.id == 'giftreload') {
        e.preventDefault()
        const target = e.target
        target.disabled = true
        target.textContent = '…'
        giftdata_cache = await fetch(`https://api.rotur.dev/gifts/mine?auth=${activeacc.token}`).then(res => res.json())
        giftdata_cache.gifts = giftdata_cache.gifts.reverse()
        renderGifts(filter_cache)
        target.disabled = false
        target.textContent = '⟳'
        return;
    }
    if (e.target.id == 'finalcreate') {
        const amt = parseFloat(document.getElementById('giftamount').value)
        const note = document.getElementById('giftnote').value
        if (isNaN(amt)) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(MiniError('failure', "An unknown error occurred"))
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 10000)
            closePopup()
            return;
        }
        const gift = await fetch(`https://api.rotur.dev/gifts/create?auth=${activeacc.token}`, {
                                method: "POST",
                                body: JSON.stringify({amount: amt, note: note, expires_in_hrs: 0, auth: activeacc.token})
                            }).then(res => res.json())
        if (gift.error) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(MiniError('failure', "An unknown error occurred"))
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 10000)
        } else {
            document.getElementById('giftcreatestatusplaceholder').setHTML(`<p class='success'>Gift created successfully! Link: ${gift.claim_url} <button class='copyurl2' data-giftid='${gift.code}'>Copy URL</button></p>`, {sanitizer: sanitizer})
            document.getElementById('giftamount').value = ''
            document.getElementById('giftnote').value = ''
            document.getElementById('taxamt').value = ''
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 60000)
        }
        closePopup()
        return;
    }

    const giftstatus = document.getElementById(`giftrevokestatus_${e.target.dataset.giftid}`)
    if (e.target.className == 'copyurl') {
        try {
            await navigator.clipboard.writeText(`https://rotur.dev/gift?code=${e.target.dataset.giftid}`);
            giftstatus.replaceChildren(MiniError('success', "Copied URL to clipboard!"))
        } catch (err) {
            console.error('Failed to copy: ', err);
            giftstatus.replaceChildren(MiniError('failure', "Failed to copy gift URL"))
        }
    }
    if (e.target.className == 'copyURL2') {
        try {
            await navigator.clipboard.writeText(`https://rotur.dev/gift?code=${e.target.dataset.giftid}`);
            document.getElementById('giftcreatestatusplaceholder2').replaceChildren(MiniError('success', "Copied URL to clipboard!"))
        } catch (err) {
            console.error('Failed to copy: ', err);
            document.getElementById('giftcreatestatusplaceholder2').replaceChildren(MiniError('failure', "Failed to copy gift URL"))
        }
        setTimeout(function() { document.getElementById('giftcreatestatusplaceholder2').replaceChildren() }, 10000)
    }
    if (e.target.className == 'revoke') {
        const revokebtn = e.target
        revokebtn.disabled = true
        revokebtn.textContent = 'Revoking...'
        const revokesuccess = await fetch(`https://api.rotur.dev/gifts/cancel/${e.target.dataset.giftid2}?auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json())
        if (revokesuccess.error) {
            giftstatus.replaceChildren(MiniError('failure', "Failed to revoke gift. This gift may have been revoked in the past."))
            revokebtn.disabled = false
            revokebtn.textContent = 'Revoke Gift'            
        } else {
            giftstatus.replaceChildren(MiniError('success', "Gift successfully revoked and refunded (excluding tax, sadly)"))
            document.getElementById(`giftcontrolbuttons_${e.target.dataset.giftid}`).replaceChildren()
        }
    }

    if (e.target.className == 'claimgiftbtn') {
        const giftbtn = e.target
        giftbtn.disabled = true
        giftbtn.textContent = 'Claiming...'
        const giftclaimsuccess = await fetch(`https://api.rotur.dev/gifts/claim/${e.target.dataset.giftid}?auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json())
        if (giftclaimsuccess.error) {
            document.getElementById('giftclaimstatusplaceholder').replaceChildren(MiniError('failure', giftclaimsuccess.error))
        } else {
            document.getElementsByClassName('claimgiftbtn')[0].remove()
            document.getElementById('giftclaimstatusplaceholder').replaceChildren(MiniError('success', "Gift claimed successfully!"))
        }

        if (document.getElementsByClassName('claimgiftbtn')[0]) {
            giftbtn.disabled = false
            giftbtn.textContent = 'Claim Gift'
        }
        setTimeout(function() { document.getElementById('giftclaimstatusplaceholder').replaceChildren() }, 15000)
    }
})

if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    document.getElementById('giftsearch').addEventListener('submit', (event) => {
        event.preventDefault(); // Stop page reload
        const query = document.getElementById('giftsearchbar').value;
        performGiftSearch(query);
    });
}
