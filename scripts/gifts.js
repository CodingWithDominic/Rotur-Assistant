import { sanitize, formatDate, parseHTML } from "../index.js"

const accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
) ?? [];
const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

function openPopup(amt, note) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Gift</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <h2>Confirming creation of gift with:</h2>
        <p id="giftpopupamt">Amount: ${amt}</p>
        <p id="giftpopuptax">Tax: ${(amt / 100).toFixed(2)}</p>
        <p id="giftpopuptotal">Total Payment: ${(amt * 1.01).toFixed(2)}</p>
        ${note ? `<p id="giftpopupnote">Note: ${note}</p>` : ``}
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finalcreate">Confirm & Create</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

async function getGifts(filter) {
    if (accounts.length == 0) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
            `<h1>Gift Manager</h1>
            <h3>You are not signed in! Please head over to the account manager to add an account first.</h3>`))
        return;
    }
    if (flagged.includes(activeacc.uuid)) {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Gift Manager</h1>
            <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
        `))
        return;
    }
    const giftdata = await fetch(`https://api.rotur.dev/gifts/mine?auth=${activeacc.token}`).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Gift Manager</h1>
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `))
        return;
    })
    if (giftdata.error && giftdata.error == "Invalid authentication key") {
        flagged.push(activeacc.uuid)
        chrome.storage.local.set({flagged: flagged})
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Gift Manager</h1>
            <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
        `))
        return;
    }
    let giftsArray = giftdata.gifts.reverse() // Reverse because the API returns oldest to newest, and I prefer newest to oldest
    const gift_count = giftsArray.length
    
    if (filter == 'claimed') {
        giftsArray = giftsArray.filter(gift => gift.claimed_by)
    }
    if (filter == 'unclaimed') {
        giftsArray = giftsArray.filter(gift => !gift.claimed_by)
    }
    document.getElementById('giftmanagerheader').replaceChildren(...parseHTML(`<h2>Manage Existing Gifts (${giftsArray.length})</h2>`))
    let giftlisthtml = `<ul>`
    if (giftsArray.length == 0) {
        if (gift_count == 0) {
            giftlisthtml = `<h3>You have not created any gifts yet</h3>`
        } else {
            giftlisthtml = `<h3>No gifts were found that match this filter</h3>`
        }
    } else {
    for (let i=0; i<giftsArray.length; i++) {
        let gift_snippet = giftsArray[i]
        giftlisthtml += `
        <li>
            <h2>Gift created on ${formatDate(gift_snippet.created_at)}</h2>
            <p>Amount: ${gift_snippet.amount} RC</p>
            ${gift_snippet.note ? `<p>Note: ${sanitize(gift_snippet.note)}</p>` : ``}
            ${gift_snippet.expires_at ? `<p>Expires: ${formatDate(gift_snippet.expires_at)}</p>` : `<p>Expires: Never</p>`}
            <p>Code: ${gift_snippet.code}</p>
            <p>ID: ${gift_snippet.id}</p>
            <p class="giftfineprint">*The code, not the ID, is what appears in gift URLs, and what the claiming API looks for when it receives a request to claim a gift.</p>
            ${gift_snippet.claimed_at ? `
                <p class='claim_user'>Claimed by:  <img src='https://avatars.rotur.dev/${gift_snippet.claimed_by}' width="24" height="24">  ${gift_snippet.claimed_by}</p>
                <p>Claimed on: ${formatDate(gift_snippet.claimed_at)}</p>
                ` : `
                <div id="giftcontrolbuttons_${gift_snippet.code}">
                    <button class="copyURL" id='${gift_snippet.code}'>Copy URL</button>
                    <button class="revoke" id='${gift_snippet.code}' data-giftamt='${gift_snippet.amount}' ${accounts.length < 2 ? 'disabled' : ''}>Revoke Gift</button>
                </div>
                ${accounts.length < 2 ? `<p class="giftfineprint">*Due to API limitations, You need at least 2 accounts added in the account manager in order to revoke gifts</p>` : ``}
                <div id='giftrevokestatus_${gift_snippet.code}'></div>
                `}
        </li>`
    }
        giftlisthtml += `</ul>`
    }

    document.getElementById('giftsplaceholder').replaceChildren(...parseHTML(giftlisthtml))

}

async function performGiftSearch(query) {
    document.getElementById('giftlookupplaceholder').style = `border: none; padding: 0px;`
    
    let giftdata = ``
    if (query.startsWith('https://rotur.dev/gift?code=')) {
        query = query.split('https://rotur.dev/gift?code=')[1]
    } 
    giftdata = await fetch(`https://api.rotur.dev/gifts/${query}`).then(res => res.json())

    if (giftdata.error) {
        document.getElementById('giftlookupplaceholder').replaceChildren(...parseHTML(`<p class='failure'>${giftdata.error}</p>`))
        return;
    } else {
        giftdata = giftdata.gift
        document.getElementById('giftlookupplaceholder').style = `border: 2px solid white; padding: 8px;`
        document.getElementById('giftlookupplaceholder').replaceChildren(...parseHTML(`
        <h2>Gift by <img src='https://avatars.rotur.dev/${giftdata.creator_id}' alt='${giftdata.creator_id}' width='24' height='24'> ${giftdata.creator_id}</h2>
        <p>Amount: ${giftdata.amount} RC</p>
        ${giftdata.note ? `<p>Note: ${sanitize(giftdata.note)}</p>` : ``}
        ${giftdata.expires_at ? `<p>${formatDate(giftdata.expires_at)}</p>` : ``}
        <button id=${query} class='claimgiftbtn' ${giftdata.creator_id == activeacc.name ? `disabled` : ``}>Claim Gift</button>
        ${giftdata.creator_id == activeacc.name ? `<p class='giftfineprint'>Unfortunately, the Rotur API won't allow you to claim your own gift.</p>` : ``}
        <div id="giftclaimstatusplaceholder"></div>
        `)) 
    }
}

getGifts('all')

document.addEventListener('change', async function(e) {
    if (e.target.name == 'giftfilter') {
        getGifts(e.target.id)
    }
})

document.addEventListener('input', async function (e) {
    if (e.target.id == 'giftamount') {
        const amt = parseFloat(e.target.value)
        if (isNaN(amt)) {
            document.getElementById('taxamt').replaceChildren()
        } else {
            document.getElementById('taxamt').replaceChildren(...parseHTML(`<p>Estimated Tax: ${(amt / 100).toFixed(2)}</p>`))
        }
    }
})

document.addEventListener('click', async function(e) {
    if (e.target.id == 'creategift') {
        const accdata = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}`).then(res => res.json())
        const amt = parseFloat(document.getElementById('giftamount').value)
        if (isNaN(amt)) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>Please enter a valid amount</p>`))
        } else if (accdata.currency < (amt * 1.01).toFixed(2)) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>Insufficient Funds</p>`))
        } else {
            const note = document.getElementById('giftnote').value
            openPopup(amt, note)
        }
        setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 10000)
        return;
    }
    if (e.target.id == 'cancel' || e.target.id == 'popup-x') {
        closePopup()
        return;
    }
    if (e.target.id == 'finalcreate') {
        const amt = parseFloat(document.getElementById('giftamount').value)
        const note = document.getElementById('giftnote').value
        if (isNaN(amt)) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>An unknown error occurred</p>`))
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 10000)
            closePopup()
            return;
        }
        const gift = await fetch(`https://api.rotur.dev/gifts/create?auth=${activeacc.token}`, {
                                method: "POST",
                                body: JSON.stringify({amount: amt, note: note, expires_in_hrs: 0, auth: activeacc.token})
                            }).then(res => res.json())
        if (gift.error) {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>An unknown error occurred</p>`))
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 10000)
        } else {
            document.getElementById('giftcreatestatusplaceholder').replaceChildren(...parseHTML(`<p class='success'>Gift created successfully! Link: ${gift.claim_url} <button class='copyURL2' id=${gift.code}>Copy URL</button></p>`))
            document.getElementById('giftamount').value = ''
            document.getElementById('giftnote').value = ''
            document.getElementById('taxamt').value = ''
            setTimeout(function() { document.getElementById('giftcreatestatusplaceholder').replaceChildren() }, 60000)
        }
        closePopup()
        return;
    }

    const giftstatus = document.getElementById(`giftrevokestatus_${e.target.id}`)
    if (e.target.className == 'copyURL') {
        try {
            await navigator.clipboard.writeText(`https://rotur.dev/gift?code=${e.target.id}`);
            giftstatus.replaceChildren(...parseHTML(`<p class='success'>Copied URL to clipboard!</p>`))
        } catch (err) {
            console.error('Failed to copy: ', err);
            giftstatus.replaceChildren(...parseHTML(`<p class='failure'>Failed to copy gift URL</p>`))
        }
    }
    if (e.target.className == 'copyURL2') {
        try {
            await navigator.clipboard.writeText(`https://rotur.dev/gift?code=${e.target.id}`);
            document.getElementById('giftcreatestatusplaceholder2').replaceChildren(...parseHTML(`<p class='success'>Copied URL to clipboard!</p>`))
        } catch (err) {
            console.error('Failed to copy: ', err);
            document.getElementById('giftcreatestatusplaceholder2').replaceChildren(...parseHTML(`<p class='failure'>Failed to copy gift URL</p>`))
        }
        setTimeout(function() { document.getElementById('giftcreatestatusplaceholder2').replaceChildren() }, 10000)
    }
    if (e.target.className == 'revoke') {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms)); // To reduce the risk of failure between claiming the gift
        if (accounts.length < 2) {
            console.error('This action cannot be performed with less than 2 accounts due to Rotur API limitations. This action has automatically been aborted.')
            giftstatus.replaceChildren(...parseHTML(`<p class='failure'>You need at least 2 accounts to perform this action</p>`))
        } else {
            const revokebtn = e.target
            revokebtn.disabled = true
            revokebtn.textContent = 'Revoking...'
            const token = accounts[1 - (activeacc.name == accounts[1].name)].token
            const revokesuccess = await fetch(`https://api.rotur.dev/gifts/claim/${e.target.id}?auth=${token}`, {method: 'POST'}).then(res => res.json())
            if (revokesuccess.error) {
                giftstatus.replaceChildren(...parseHTML(`<p class='failure'>Failed to revoke gift</p>`))
                revokebtn.disabled = false
                revokebtn.textContent = 'Revoke Gift'
            } else {
                await delay(250)
                const refundsuccess = await fetch(`https://api.rotur.dev/me/transfer?auth=${token}`, {
                                            method: "POST",
                                            body: JSON.stringify({to: activeacc.name, amount: parseFloat(e.target.dataset.giftamt), note: "Gift Revoked"})
                                        })
                if (refundsuccess.error) {
                    giftstatus.replaceChildren(...parseHTML(`<p class='partialsuccess'>While the alt account (${accounts[1 - (activeacc.name == accounts[1].name)].name}) successfully claimed the gift, something went wrong with refunding the amount back to the active account (${activeacc.name})</p>`))
                } else {
                    giftstatus.replaceChildren(...parseHTML(`<p class='success'>Gift successfully revoked and refunded (excluding tax, sadly)</p>`))
                }
                document.getElementById(`giftcontrolbuttons_${e.target.id}`).replaceChildren()
            }

        }
    }

    if (e.target.className == 'claimgiftbtn') {
        const giftbtn = e.target
        giftbtn.disabled = true
        giftbtn.textContent = 'Claiming...'
        const giftclaimsuccess = await fetch(`https://api.rotur.dev/gifts/claim/${e.target.id}?auth=${activeacc.token}`, {method: 'POST'}).then(res => res.json())
        if (giftclaimsuccess.error) {
            document.getElementById('giftclaimstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>${giftclaimsuccess.error}</p>`))
        } else {
            document.getElementsByClassName('claimgiftbtn')[0].remove()
            document.getElementById('giftclaimstatusplaceholder').replaceChildren(...parseHTML(`<p class='success'>Gift claimed successfully!</p>`))
        }

        if (document.getElementsByClassName('claimgiftbtn')[0]) {
            giftbtn.disabled = false
            giftbtn.textContent = 'Claim Gift'
        }
        setTimeout(function() { document.getElementById('giftclaimstatusplaceholder').replaceChildren() }, 15000)
    }
})

document.getElementById('giftsearch').addEventListener('submit', (event) => {
    event.preventDefault(); // Stop page reload
    const query = document.getElementById('giftsearchbar').value;
    performGiftSearch(query);
});