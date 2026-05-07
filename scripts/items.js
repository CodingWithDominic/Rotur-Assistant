import { sanitize, formatDate, parseHTML } from "../index.js"

function desanitize(string) {
    return string.replace('&sol;','/').replace('&lt;', '<').replace('&gt;', '>').replace('&lpar;', '(').replace('&rpar;', ')').replace("&equals;", "=").replace(`&quot;`, `"`).replace(`&#39;`, `'`).replace('&amp;', '&') // Used for handling items since Rotur decided to use the direct item names as the IDs instead.
}

let last_sort = 'newest'

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

const flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
) ?? [];

if (!activeacc.uuid) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(
        `<h1>Item Manager</h1>
        <h3>You are not signed in! Please sign in using the account manager to access this page.</h3>`
    ))
}
if (flagged.includes(activeacc.uuid)) {
    document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
        <h1>Item Manager</h1>
        <h3>An authentication issue has been detected with your selected account. Please head over to the <a href='accounts.html' style="text-decoration: underline;">account manager</a> to resolve it.</h3>
    `))
}

// Functions (reserved)

function openDeletePopup(itemname) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Delete Item</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Really delete this item?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finaldelete" data-itemname='${sanitize(itemname)}'>Yes</button>
        </div>
    `))
}

function openConfirmTransferPopup(user, itemname) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Transfer</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to transfer this item over to <img src='https://avatars.rotur.dev/${user}' width=16 height=16> ${user}? This item will officially belong to them, and you will no longer be able to edit its properties.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cencel</button>
            <button class="finalitemtransfer" data-name="${user}" data-itemname="${sanitize(itemname)}">Transfer</button>
        </div>
    `))
}

function openConfirmPurchasePopup(senderdata, recipientdata, amt, itemname) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Purchase</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p>Confirm purchase of the item ${itemname}?</p>
        <p>Your Balance: ${senderdata.currency} -> ${senderdata.currency - amt}</p>
        <p>${recipientdata.username}'s Balance: ${recipientdata.currency} -> ${recipientdata.currency + amt}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalitempurchase" data-itemname="${sanitize(itemname)}">Buy</button>
        </div>
    `))
}

function openErrorPopup(error) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Error</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${error}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `))
}

function openSuccessPopup(msg) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Success</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${msg}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function switchTab(idx) {
    const tabs = document.getElementsByClassName('itemmanpage')
    
    Array.from(tabs).forEach(tab => {
        tab.style.display = 'none'
    })
    tabs[idx].style.display = idx == 2 ? 'flex' : 'block'
    
    const tab_btns = document.getElementsByClassName('itemmantab')
    
    Array.from(tab_btns).forEach(tab => {
        tab.style = 'border-bottom: none;'
    })
    tab_btns[idx].style = 'border-bottom: 2px solid white;'
}

function formatTransferHistory(transferdata) {
    let transfer_html = ``
    transferdata.forEach(item => {
        if (!(item.from == null || item.from == "Null")) {
            transfer_html += `<li>
            <p>From: <img src='https://avatars.rotur.dev/${item.from}' width=20 height=20> ${item.from}</p>
            <p>To:  <img src='https://avatars.rotur.dev/${item.to}' width=20 height=20> ${item.to}</p>
            ${item.timestamp ? `<p>On: ${formatDate(item.timestamp * 1000)}</p>` : ''}
            ${item.type ? `<p>Type: ${item.type}</p>` : ''}
            </li>`
        }
    })
    if (transfer_html == ``) {
        transfer_html = `<li><h2>No history yet</h2></li>`
    }
    return transfer_html;
}

async function getItems(user) {
    const myitems = await fetch(`https://api.rotur.dev/items/list/${user}`).then(res => res.json())
    let item_html = `<ul class='roturuseritemlist'>`
    myitems.forEach(item => {
        item_html += `<li class='roturitem' id='roturitem_${sanitize(item.name)}'>
            <h2>${sanitize(item.name)}</h2>
            <button class='itemdeletebtn' title="Delete Item" data-itemname="${sanitize(item.name)}"><img src='../images/misc_icons/delete.png' width=24 height=24></button>
            <p class='roturitemauthor'>Creator: <img src='https://avatars.rotur.dev/${item.author}' width=20 height=20> ${item.author} | Current Owner: <img src='https://avatars.rotur.dev/${item.owner}' width=20 height=20> ${item.owner} </p>
            <p>${sanitize(item.description)}</p>
            <ul class='itemmetadatar1'>
                <li>
                    <h3>Price</h3>
                    <p>${item.price} RC</p>
                </li>
                <li>
                    <h3>Purchaseable</h3>
                    <p class='isitempurchaseable'>${item.selling ? "Yes" : "No"}</p>
                </li>
            </ul>
            <ul class='itemmetadatar2'>
                <li>
                    <h3>Created</h3>
                    <p>${formatDate(item.created * 1000)}</p>
                </li>
                <li>
                    <h3>Total Revenue</h3>
                    <p>${item.total_income}</p>
                </li>
            </ul>
            <label>
                <input type='checkbox' class='isforsale' data-itemname="${sanitize(item.name)}" ${item.selling ? 'checked' : ''}>
                For Sale
            </label>
            <label>
                Price:
                <input type='number' class='updateitemprice' placeholder='Price'>
                <button class='updateitempricebtn' data-itemname="${sanitize(item.name)}">Update</button>
            </label>
            <label>
                Transfer Ownership:
                <input type='text' class='itemtransferownership' placeholder='Username'>
                <button class='beginitemtransfer' data-itemname="${sanitize(item.name)}">Transfer</button>
            </label>
            <details class='itemtransferhistory'>
                <summary>Transfer History</summary>
                <ul class='transferhistory'>${formatTransferHistory(item.transfer_history)}</ul>
            </details>
        </li>`
    })
    item_html += `</ul>`
    if (myitems.length == 0) {
        document.getElementById('myitems').replaceChildren(...parseHTML(`<h2>You don't own any items yet. Try creating or buying one.</h2>`))
    } else {
        document.getElementById('myitems').replaceChildren(...parseHTML(item_html))
    }
}

async function getSellingItems(filter) {
    const sellingitems = await fetch(`https://api.rotur.dev/items/selling`).then(res => res.json())
    if (filter == 'oldest') {
        sellingitems.reverse()
    }
    if (filter == 'low') {
        sellingitems.sort((a, b) => a.price - b.price)
    }
    if (filter == 'high') {
        sellingitems.sort((a, b) => b.price - a.price)
    }
    let item_html = `<ul class='roturuseritemlist'>`
    sellingitems.forEach(item => {
        item_html += `<li class='roturitem' id='roturitem_${sanitize(item.name)}'>
            <h2>${sanitize(item.name)}</h2>
            <p class='roturitemauthor'>Creator: <img src='https://avatars.rotur.dev/${item.author}' width=20 height=20> ${item.author} | Current Owner: <img src='https://avatars.rotur.dev/${item.owner}' width=20 height=20> ${item.owner} </p>
            <p>${sanitize(item.description)}</p>
            <ul class='itemmetadatar1'>
                <li>
                    <h3>Price</h3>
                    <p>${item.price} RC</p>
                </li>
                <li>
                    <h3>Purchaseable</h3>
                    <p class='isitempurchaseable'>${item.selling ? "Yes" : "No"}</p>
                </li>
            </ul>
            <ul class='itemmetadatar2'>
                <li>
                    <h3>Created</h3>
                    <p>${formatDate(item.created * 1000)}</p>
                </li>
                <li>
                    <h3>Total Revenue</h3>
                    <p>${item.total_income}</p>
                </li>
            </ul>
            <button class='buyitem' data-itemname='${sanitize(item.name)}' data-amt='${item.price}' data-owner='${item.owner}' ${item.owner == activeacc.name ? 'disabled' : ''}>Buy (${item.price} RC)</button>
            <details class='itemtransferhistory'>
                <summary>Transfer History</summary>
                <ul class='transferhistory'>${formatTransferHistory(item.transfer_history)}</ul>
            </details>
        </li>`
    })
    item_html += `</ul>`
    document.getElementById('itemmarketplaceplaceholder').replaceChildren(...parseHTML(item_html))
}

// Setup
if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    getItems(activeacc.name)
    getSellingItems(last_sort)
}

// Document listeners

document.addEventListener('click', async function(e) {
    if (e.target.className == 'closebtn') {
        closePopup();
        return;
    }
    if (e.target.className == 'itemmantab') {
        switchTab(parseInt(e.target.dataset.tabidx))
        return;
    }

    if (e.target.className == 'itemdeletebtn') {
        openDeletePopup(e.target.dataset.itemname)
        return;
    }
    if (e.target.className == 'isforsale') {
        const target = e.target
        let itemsellstatus = ''
        try {
            if (target.checked) {
                itemsellstatus = await fetch(`https://api.rotur.dev/items/sell/${encodeURIComponent(desanitize(target.dataset.itemname))}?auth=${activeacc.token}`).then(res => res.json())
            } else {
                itemsellstatus = await fetch(`https://api.rotur.dev/items/stop_selling/${encodeURIComponent(desanitize(target.dataset.itemname))}?auth=${activeacc.token}`).then(res => res.json())
            }
            getSellingItems(last_sort)
            if (itemsellstatus.error) {
                openErrorPopup(itemsellstatus.error)
                target.checked = !target.checked
            } else {
                const p = document.getElementById(`roturitem_${target.dataset.itemname}`).querySelector('[class="isitempurchaseable"]')
                p.innerText = target.checked ? "Yes" : "No"
            }
        } catch {
            openErrorPopup("An error occurred while updating the properties of this item.")
            target.checked = !target.checked
        }
        return;
    }
    if (e.target.className == 'updateitempricebtn') {
        const newprice = document.getElementById(`roturitem_${e.target.dataset.itemname}`).querySelector('[class="updateitemprice"]').value
        if (isNaN(parseFloat(newprice)) || parseFloat(newprice) < 0.01) {
            openErrorPopup('Invalid Number')
        } else {
            try {
                const itemsellstatus = await fetch(`https://api.rotur.dev/items/set_price/${encodeURIComponent(desanitize(e.target.dataset.itemname))}?auth=${activeacc.token}&price=${newprice}`).then(res => res.json())
                if (itemsellstatus.error) {
                    openErrorPopup(itemsellstatus.error)
                } else {
                    openSuccessPopup('Price updated successfully!')
                    getItems(activeacc.name)
                }
            } catch {
                openErrorPopup("An error occurred while updating the properties of this item.")
            }
        }
        return;
    }
    if (e.target.className == 'beginitemtransfer') {
        const target = e.target
        const user = document.getElementById(`roturitem_${e.target.dataset.itemname}`).querySelector('[class="itemtransferownership"]').value
        const userdata = await fetch(`https://api.rotur.dev/profile?name=${user}`).then(res => res.json())
        if (userdata.error) {
            openErrorPopup('This user does not exist')
        } else {
            openConfirmTransferPopup(user, target.dataset.itemname)
        }
        return;
    }
    if (e.target.className == 'buyitem') {
        const target = e.target
        const userdata = await fetch(`https://api.rotur.dev/profile?name=${target.dataset.owner}`).then(res => res.json())
        const yourdata = await fetch(`https://api.rotur.dev/profile?name=${activeacc.name}`).then(res => res.json())
        if (yourdata.currency < parseFloat(target.dataset.amt)) {
            openErrorPopup(`Insufficient Funds (${yourdata.currency} < ${target.dataset.amt})`)
        } else {
            openConfirmPurchasePopup(yourdata, userdata, parseFloat(target.dataset.amt), target.dataset.itemname)
        }
        return;
    }
    // Final actions
    if (e.target.className == 'finaldelete') {
        closePopup()
        try {
            const itemdeletestatus = await fetch(`https://api.rotur.dev/items/delete/${encodeURIComponent(desanitize(e.target.dataset.itemname))}?auth=${activeacc.token}`).then(res => res.json())
            if (itemdeletestatus.error) {
                openErrorPopup(itemdeletestatus.error)
                getItems(activeacc.name)
            } else {
                openSuccessPopup('Item deleted successfully.')
                getItems(activeacc.name)
            }
        } catch {
            openErrorPopup('An error occurred while trying to delete this item. Try contacting Mistium to have her delete it for you.')
        }
        return;
    }
    if (e.target.className == 'finalitempurchase') {
        closePopup()
        const target = e.target
        try {
            const itempurchasestatus = await fetch(`https://api.rotur.dev/items/buy/${encodeURIComponent(desanitize(target.dataset.itemname))}?auth=${activeacc.token}`).then(res => res.json())
            if (itempurchasestatus.error) {
                openErrorPopup(itempurchasestatus.error)
            } else {
                openSuccessPopup(`Successfully purchased ${sanitize(decodeURIComponent(target.dataset.itemname))}!`)
                getItems(activeacc.name)
                getSellingItems(last_sort)
            }
        } catch {
            openErrorPopup('An error occurred while trying to buy this item.')
        }
        return;
    }
    if (e.target.className == 'finalitemtransfer') {
        const target = e.target
        closePopup()
        try {
            const itemtransferstatus = await fetch(`https://api.rotur.dev/items/transfer/${encodeURIComponent(desanitize(target.dataset.itemname))}?auth=${activeacc.token}&username=${target.dataset.name}`).then(res => res.json())
            if (itemtransferstatus.error) {
                openErrorPopup(itemtransferstatus.error)
            } else {
                openSuccessPopup(`Successfully transferred ${sanitize(decodeURIComponent(target.dataset.itemname))} to ${target.dataset.name}.`)
                getItems(activeacc.name)
            }
        } catch {
            openErrorPopup(`An error occurred while trying to transfer this item to ${target.dataset.name}.`)
        }
        return;
    }
})

document.getElementById('create_item').addEventListener('submit', async function(e) {
    e.preventDefault()
    if (document.getElementById('createitemname').value == '') {
        openErrorPopup('Please enter a valid name.')
        return;
    }
    if (document.getElementById('createitemprice').value == '' || isNaN(parseInt(document.getElementById('createitemprice').value))) {
        openErrorPopup('Please enter a valid price.')
        return;
    }
    let jsondata = ''
    if (document.getElementById('itemjsonmetadata').value != '') {
        try {
            jsondata = JSON.parse(document.getElementById('itemjsonmetadata').value)
        } catch {
            openErrorPopup('The JSON in the metadata field is not valid JSON.')
            return;
        }
    }
    const finalobject = {"name":document.getElementById('createitemname').value,
                         "description":document.getElementById('createitemdesc').value,
                         "price":parseInt(document.getElementById('createitemprice').value),
                         "selling":document.getElementById('sellitemimmediately').checked,
                         "data":(jsondata || {})
                        }
    const itemcreatesuccess = await fetch(`https://api.rotur.dev/items/create?auth=${activeacc.token}&item=${encodeURIComponent(JSON.stringify(finalobject))}`).then(res => res.json())

    if (itemcreatesuccess.error) {
        openErrorPopup(itemcreatesuccess.error)
        return;
    } else {
        openSuccessPopup(`Item ${sanitize(document.getElementById('createitemname').value)} was created successfully!`)
        getItems(activeacc.name)
    }
    this.reset()
})

document.getElementById('itemsearch').addEventListener('submit', async function(e) {
    e.preventDefault()
    document.getElementById('itemlookupstatusplaceholder').replaceChildren()
    if (document.getElementById('itemsearchbar').value == '') {
        return;
    }
    const itemquery = await fetch(`https://api.rotur.dev/items/get/${document.getElementById('itemsearchbar').value}`).then(res => res.json())
    console.log(itemquery)

    if (itemquery.error) {
        document.getElementById('itemlookupstatusplaceholder').replaceChildren(...parseHTML(`<p class='failure'>This item does not exist</p>`))
    } else {
        document.getElementById('itemlookupplaceholder').style = 'border: 2px solid white; border-radius: 5px'
        document.getElementById('itemlookupplaceholder').replaceChildren(...parseHTML(`
            <div class='roturitem'>
                <h2>${sanitize(itemquery.name)}</h2>
                <p class='roturitemauthor'>Creator: <img src='https://avatars.rotur.dev/${itemquery.author}' width=20 height=20> ${itemquery.author} | Current Owner: <img src='https://avatars.rotur.dev/${itemquery.owner}' width=20 height=20> ${itemquery.owner} </p>
                <p>${sanitize(itemquery.description)}</p>
                <ul class='itemmetadatar1'>
                    <li>
                        <h3>Price</h3>
                        <p>${itemquery.price} RC</p>
                    </li>
                    <li>
                        <h3>Purchaseable</h3>
                        <p class='isitempurchaseable'>${itemquery.selling ? "Yes" : "No"}</p>
                    </li>
                </ul>
                <ul class='itemmetadatar2'>
                    <li>
                        <h3>Created</h3>
                        <p>${formatDate(itemquery.created * 1000)}</p>
                    </li>
                    <li>
                        <h3>Total Revenue</h3>
                        <p>${itemquery.total_income}</p>
                    </li>
                </ul>
                <button class='buyitem' data-itemname='${sanitize(itemquery.name)}' data-amt='${itemquery.price}' data-owner='${itemquery.owner}' ${(itemquery.owner == activeacc.name || !itemquery.selling) ? 'disabled' : ''}>Buy (${itemquery.price} RC)</button>
                <details class='itemtransferhistory'>
                    <summary>Transfer History</summary>
                    <ul class='transferhistory'>${formatTransferHistory(itemquery.transfer_history)}</ul>
                </details>
            </div>`))
    }
})

document.getElementById('itemsortselect').addEventListener('change', function(e) {
    last_sort = document.getElementById('itemsortselect').value
    getSellingItems(last_sort)
})