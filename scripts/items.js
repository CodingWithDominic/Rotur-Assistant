import { sanitize, formatDate, parseHTML, openErrorPopup, openSuccessPopup, FixDecimal, MiniError } from "../index.js"

let last_sort = 'newest'
let items_cache = ''

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

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
        <p>Your Balance: ${senderdata.currency} -> ${FixDecimal(senderdata.currency - amt)}</p>
        <p>${recipientdata.username}'s Balance: ${recipientdata.currency} -> ${FixDecimal(recipientdata.currency + amt)}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalitempurchase" data-itemname="${sanitize(itemname)}">Buy</button>
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
    const transfer_html = []
    const config = {
        elements: ['p', 'img'],
        attributes: ['src', 'width', 'height']
    }
    const sanitizer = new Sanitizer(config)
    transferdata.forEach(item => {
        if (!(item.from == null || item.from == "Null")) {
            const li = document.createElement('li')
            const p1 = document.createElement('p')
            p1.setHTML(`From: <img src="https://avatars.rotur.dev/${item.from}" width=20 height=20> ${item.from}`, {sanitizer: sanitizer})
            li.appendChild(p1)

            const p2 = document.createElement('p')
            p2.setHTML(`To: <img src="https://avatars.rotur.dev/${item.to}" width=20 height=20>  ${item.to}`, {sanitizer: sanitizer})
            li.appendChild(p2)

            if (item.timestamp) {
                const p3 = document.createElement('p')
                p3.textContent = `On: ${formatDate(item.timestamp * 1000)}`
                li.appendChild(p3)
            }
            if (item.type) {
                const p4 = document.createElement('p')
                p4.textContent = `Type: ${item.type}`
                li.appendChild(p4)
            }
            transfer_html.push(li)
        }
    })
    if (transfer_html.length == 0) {
        const li = document.createElement('li')
        const h2 = document.createElement('h2')
        h2.textContent = ('No history yet')
        li.style = "border-top: none;"
        li.appendChild(h2)
        transfer_html.push(li)
    }
    return transfer_html;
}

async function getItems(user) {
    const myitems = await fetch(`https://api.rotur.dev/items/list/${user}`).then(res => res.json()).catch(err => {
        document.getElementsByClassName('container')[0].replaceChildren(...parseHTML(`
            <h1>Items</h1>
            <h3>A communication error has occurred. If you're sure it's not your connection, then Rotur may be down right now.</h3>
        `))
        return;
    })
    myitems.reverse() // Newest to oldest
    const itemgroup = document.createElement('ul')
    itemgroup.className = 'roturuseritemlist'
    const item_html = []
    const config = {
        elements: ['p', 'img'],
        attributes: ['src', 'width', 'height']
    }
    const sanitizer = new Sanitizer(config)
    myitems.forEach(item => {
        const roturitem = document.getElementById('itemtemplate').content.cloneNode(true)
        roturitem.querySelectorAll('[data-itemname]').forEach(itemcomponent => {
            itemcomponent.dataset.itemname = item.name
        })
        roturitem.querySelector('li').id = `roturitem_${encodeURIComponent(item.name)}`
        roturitem.querySelector('h2').textContent = item.name
        roturitem.querySelector('.roturitemauthor').setHTML(`Creator: <img src='https://avatars.rotur.dev/${item.author}' width=20 height=20> ${item.author} | Current Owner: <img src='https://avatars.rotur.dev/${item.owner}' width=20 height=20> ${item.owner}`, {sanitizer: sanitizer})
        roturitem.querySelector('.roturitemdesc').innerText = item.description

        roturitem.querySelector('.roturitemprice').textContent = `${item.price} RC`
        roturitem.querySelector('.isitempurchaseable').textContent = item.selling ? "Yes" : "No"
        roturitem.querySelector('.roturitemcreationdate').textContent = formatDate(item.created * 1000)
        roturitem.querySelector('.roturitemtotalrevenue').textContent = item.total_income

        roturitem.querySelector('.buyitem').remove()
        roturitem.querySelector('.updateitemprice').value = item.price

        roturitem.querySelector('.transferhistory').replaceChildren(...formatTransferHistory(item.transfer_history))
        item_html.push(roturitem)
    })
    
    itemgroup.replaceChildren(...item_html)
    if (myitems.length == 0) {
        const h2 = document.createElement('h2')
        h2.textContent = "You don't own any items yet. Try creating or buying one."
        document.getElementById('myitems').replaceChildren(h2)
    } else {
        document.getElementById('myitems').replaceChildren(itemgroup)
    }
}

async function getSellingItems(filter) {
    if (items_cache == '') {
        items_cache = await fetch(`https://api.rotur.dev/items/selling`).then(res => res.json())
    }
    const sellingitems = [ ...items_cache ]
    if (filter == 'oldest') {
        sellingitems.reverse()
    }
    if (filter == 'low') {
        sellingitems.sort((a, b) => a.price - b.price)
    }
    if (filter == 'high') {
        sellingitems.sort((a, b) => b.price - a.price)
    }
    const itemgroup = document.createElement('ul')
    itemgroup.className = 'roturuseritemlist'
    const item_html = []
    const config = {
        elements: ['p', 'img'],
        attributes: ['src', 'width', 'height']
    }
    const sanitizer = new Sanitizer(config)
    sellingitems.forEach(item => {
        const roturitem = document.getElementById('itemtemplate').content.cloneNode(true)
        roturitem.querySelector('li').id = `roturitem_${encodeURIComponent(item.name)}`
        roturitem.querySelector('h2').textContent = item.name
        roturitem.querySelector('.roturitemauthor').setHTML(`Creator: <img src='https://avatars.rotur.dev/${item.author}' width=20 height=20> ${item.author} | Current Owner: <img src='https://avatars.rotur.dev/${item.owner}' width=20 height=20> ${item.owner}`, {sanitizer: sanitizer})
        roturitem.querySelector('.roturitemdesc').innerText = item.description

        roturitem.querySelector('.roturitemprice').textContent = `${item.price} RC`
        roturitem.querySelector('.isitempurchaseable').textContent = item.selling ? "Yes" : "No"
        roturitem.querySelector('.roturitemcreationdate').textContent = formatDate(item.created * 1000)
        roturitem.querySelector('.roturitemtotalrevenue').textContent = item.total_income

        roturitem.querySelector('.itemcontrols').remove()
        roturitem.querySelector('.itemdeletebtn').remove()
        const buybtn = roturitem.querySelector('.buyitem')
        buybtn.dataset.itemname = item.name
        buybtn.dataset.owner = item.owner
        buybtn.dataset.amt = item.price
        buybtn.textContent = `Buy (${item.price} RC)`
        buybtn.disabled = ((!item.selling) || item.owner == activeacc.name)

        roturitem.querySelector('.transferhistory').replaceChildren(...formatTransferHistory(item.transfer_history))
        item_html.push(roturitem)
    })
    itemgroup.replaceChildren(...item_html)
    document.getElementById('itemmarketplaceplaceholder').replaceChildren(itemgroup)
}

// Setup
if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
    getItems(activeacc.name)
    getSellingItems(last_sort)
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
            openSuccessPopup(`Item ${document.getElementById('createitemname').value} was created successfully!`)
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

        if (itemquery.error) {
            document.getElementById('itemlookupstatusplaceholder').replaceChildren(MiniError('failure', "This item does not exist"))
        } else {
            document.getElementById('itemlookupplaceholder').style = 'border: 2px solid white; border-radius: 5px'
            const config = {
            elements: ['p', 'img'],
            attributes: ['src', 'width', 'height']
            }
            const sanitizer = new Sanitizer(config)
            const roturitem = document.getElementById('itemtemplate').content.cloneNode(true)
            roturitem.querySelector('li').id = `roturitem_${encodeURIComponent(itemquery.name)}`
            roturitem.querySelector('h2').textContent = itemquery.name
            roturitem.querySelector('.roturitemauthor').setHTML(`Creator: <img src='https://avatars.rotur.dev/${itemquery.author}' width=20 height=20> ${itemquery.author} | Current Owner: <img src='https://avatars.rotur.dev/${itemquery.owner}' width=20 height=20> ${itemquery.owner}`, {sanitizer: sanitizer})
            roturitem.querySelector('.roturitemdesc').innerText = itemquery.description

            roturitem.querySelector('.roturitemprice').textContent = `${itemquery.price} RC`
            roturitem.querySelector('.isitempurchaseable').textContent = itemquery.selling ? "Yes" : "No"
            roturitem.querySelector('.roturitemcreationdate').textContent = formatDate(itemquery.created * 1000)
            roturitem.querySelector('.roturitemtotalrevenue').textContent = itemquery.total_income

            roturitem.querySelector('.itemcontrols').remove()
            roturitem.querySelector('.itemdeletebtn').remove()
            const buybtn = roturitem.querySelector('.buyitem')
            buybtn.dataset.itemname = itemquery.name
            buybtn.dataset.owner = itemquery.owner
            buybtn.dataset.amt = itemquery.price
            buybtn.textContent = `Buy (${itemquery.price} RC)`
            buybtn.disabled = ((!itemquery.selling) || itemquery.owner == activeacc.name)

            roturitem.querySelector('.transferhistory').replaceChildren(...formatTransferHistory(itemquery.transfer_history))
            document.getElementById('itemlookupplaceholder').replaceChildren(roturitem)
        }
    })

    document.getElementById('itemsortselect').addEventListener('change', function(e) {
        last_sort = document.getElementById('itemsortselect').value
        getSellingItems(last_sort)
    })
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
                itemsellstatus = await fetch(`https://api.rotur.dev/items/sell/${encodeURIComponent(target.dataset.itemname)}?auth=${activeacc.token}`).then(res => res.json())
            } else {
                itemsellstatus = await fetch(`https://api.rotur.dev/items/stop_selling/${encodeURIComponent(target.dataset.itemname)}?auth=${activeacc.token}`).then(res => res.json())
            }
            getSellingItems(last_sort)
            if (itemsellstatus.error) {
                openErrorPopup(itemsellstatus.error)
                target.checked = !target.checked
            } else {
                const p = document.getElementById(`roturitem_${encodeURIComponent(target.dataset.itemname)}`).querySelector('[class="isitempurchaseable"]')
                p.innerText = target.checked ? "Yes" : "No"
            }
        } catch {
            openErrorPopup("An error occurred while updating the properties of this item.")
            target.checked = !target.checked
        }
        return;
    }
    if (e.target.className == 'updateitempricebtn') {
        const newprice = document.getElementById(`roturitem_${encodeURIComponent(e.target.dataset.itemname)}`).querySelector('[class="updateitemprice"]').value
        if (isNaN(parseFloat(newprice)) || parseFloat(newprice) < 0.01) {
            openErrorPopup('Invalid Number')
        } else {
            try {
                const itemsellstatus = await fetch(`https://api.rotur.dev/items/set_price/${encodeURIComponent(e.target.dataset.itemname)}?auth=${activeacc.token}&price=${newprice}`).then(res => res.json())
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
        const user = document.getElementById(`roturitem_${encodeURIComponent(target.dataset.itemname)}`).querySelector('[class="itemtransferownership"]').value
        const userdata = await fetch(`https://api.rotur.dev/exists?username=${user}`).then(res => res.json())
        if (!userdata.exists || userdata.error) {
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
            const itemdeletestatus = await fetch(`https://api.rotur.dev/items/delete/${encodeURIComponent(e.target.dataset.itemname)}?auth=${activeacc.token}`).then(res => res.json())
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
            const itempurchasestatus = await fetch(`https://api.rotur.dev/items/buy/${encodeURIComponent(target.dataset.itemname)}?auth=${activeacc.token}`).then(res => res.json())
            if (itempurchasestatus.error) {
                openErrorPopup(itempurchasestatus.error)
            } else {
                openSuccessPopup(`Successfully purchased ${target.dataset.itemname}!`)
                getItems(activeacc.name)
                if (document.getElementById('lookup_item').style.display == 'none') {
                    document.getElementById(`roturitem_${encodeURIComponent(target.dataset.itemname)}`).remove()
                }
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
            const itemtransferstatus = await fetch(`https://api.rotur.dev/items/transfer/${encodeURIComponent(target.dataset.itemname)}?auth=${activeacc.token}&username=${target.dataset.name}`).then(res => res.json())
            if (itemtransferstatus.error) {
                openErrorPopup(itemtransferstatus.error)
            } else {
                openSuccessPopup(`Successfully transferred ${target.dataset.itemname} to ${target.dataset.name}.`)
                getItems(activeacc.name)
            }
        } catch {
            openErrorPopup(`An error occurred while trying to transfer this item to ${target.dataset.name}.`)
        }
        return;
    }
})