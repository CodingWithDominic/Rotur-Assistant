import { openErrorPopup, openWarningPopup, CreateEmptyPlaceholder, MiniError } from "../index.js";

const whitelisted_urls = ['https://apps.rotur.dev', 'https://origin.mistium.com', 'https://originchats.mistium.com/app', "https://originchats.com/app", 'https://rotur.dev/me',
                            'https://warptheme.mistium.com', 'https://notes.rotur.dev', 'https://devfund.rotur.dev', 'https://photos.rotur.dev', "https://connect.rotur.dev",
                            'https://warpdrive.team', "https://rotur.dev/key-manager", "https://rotur.dev/inventory-manager", "https://graphite.flufi.uk",
                            "https://runnova.github.io/orion", "https://adthoughtsglobal.github.io/Orla", "https://antiviiris.github.io/originChats",
                            'https://git.rotur.dev', 'https://authenticator.rotur.dev', 'https://gate.rotur.dev', 'https://rotur.dev', "https://pounce.rotur.dev",
                            "https://mail.rotur.dev", "https://beam.rotur.dev", "https://place.rotur.dev", "https://gifs.originchats.com", "https://chat.0stormy.xyz/",
                            "https://sable.rotur.dev", "https://runnova.github.io/indigo", "https://warp.mistium.com", "http://localhost:5173", "https://music.flufi.uk"]
                            
const config = {
    removeElements: ['iframe', 'script', 'style', 'object', 'embed', 'applet', 'meta', 'link', 'base', 'form'],
    removeAttributes: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onkeydown', 'onchange', 'onsubmit', 'srcdoc', 'formaction']
}
const sanitizer = new Sanitizer(config)

let file_cache = ''

let scrambledata = await new Promise(resolve =>
    chrome.storage.local.get('scrambledata', data => resolve(data.scrambledata || false))
) ?? false;

const ui_mode = await new Promise(resolve =>
    chrome.storage.local.get('ui_mode', data => resolve(data.ui_mode || 'popup'))
) ?? 'popup';

let accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
) ?? [];

let activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
) ?? {};

let flagged = await new Promise(resolve =>
    chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
);

document.getElementById('scramblesync').checked = scrambledata

function reverse(str) {
    let newString = "";
    for (let i = str.length - 1; i >= 0; i--) {
        newString += str[i];
    }
    return newString;
}

function scramble(input) {
    return reverse(btoa(input))
}

function unscramble(input) {
    return atob(reverse(input))
}

function exportToJsonFile(jsonData, name) {
    const filename = name ? `roster-${name}` : `roster`
    const dataStr = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const roturstwarning = await new Promise(resolve =>
    chrome.storage.session.get('roturstwarning', data => resolve(data.roturstwarning || false))
) ?? false;
const roturemailwarning = await new Promise(resolve =>
    chrome.storage.session.get('roturemailwarning', data => resolve(data.roturemailwarning || false))
) ?? false;

// Popup code

function openAuthErrorPopup(uuid) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Issue Detected</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">An authentication issue has been detected with this account. This account may have either been banned, deleted, or simply had its token reset. Try logging in with this account again or use a different account.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Dismiss</button>
            <button id="reauth">Reauth</button>
            <button class="removeacc" data-id='${uuid}'>Remove</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openAltLoginPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Login Methods</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Choose an alternate login method</p>
        <div id="popup-choices">
            <button id="tokenlogin">Token Login</button>
            <button id="qrcodelogin">QR Code</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openTokenLoginPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Token Login</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Login using a Rotur account token here</p>
        <div class="tokenloginbar">
            <input type='password' id='tokenloginbox' placeholder="Paste token here...">
            <button id="tokenloginvisibility"><img src="../images/misc_icons/invisible.png" width="24" height="24"></button>
        </div>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="addacctoken">Login</button>
        </div>
    `, {sanitizer: sanitizer})
}

async function GetQRCode() {
    const linkcode = await fetch(`https://api.rotur.dev/v2/link/code`).then(res => res.json()).then(res => res.code)
    const link_url = `https://api.rotur.dev/v2/link?code=${linkcode}`
}

function openQRCodePopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>QR Code</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Scan the QR code on a supported device</p>
        <div id="qrcodeimagecontainer">QR Code will go here</div>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Close</button>
            <button id="qrdone">Done Linking</button>
        </div>
    `, {sanitizer: sanitizer})
    GetQRCode()
}

function openNameRoster() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Name Roster</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Name this roster (optional)</p>
        <input type='text' id='rostername'>
        <p>Be sure to save this file in a secure spot, since this file will contain the tokens of all your accounts on this roster.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalrosterexport">Export</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openConfirmSyncRetrieval() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Confirm Retrieval</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Are you sure you want to overwrite your current roster with the one stored in sync?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalretrievesync">Retrieve</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openConfirmSyncClear() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Confirm Clear</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Are you sure you want to clear out your sync storage? Any data stored in there will be lost.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalclear">Clear</button>
        </div>
    `, {sanitizer: sanitizer})
}

function openConfirmNewRoster() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Overwrite Roster</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">Overwrite the current roster with the new one?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalrosteroverwrite">Overwrite</button>
        </div>
    `, {sanitizer: sanitizer})
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
    file_cache = ''
    document.getElementById('importrosterbtn').value = ''
}

function updateHeaderName(newname) {
    document.getElementById('headeractiveacc').textContent = (newname != "Not signed in" ? "Active: " : '') + newname
    document.getElementById('headeractiveacc').title = (newname.length > 14) ? newname : ''
}
function genURLs() {
    let urls_list = ``
    whitelisted_urls.forEach(url => {
        if (url == 'http://localhost:5173') {
            url = "https://music.milosantos.com"
        }
        if (url != "https://music.flufi.uk") {
            urls_list += `<li ${url == "https://music.milosantos.com" ? `title="music.milosantos.com itself isn\'t supported; the localhost URL that results from following all the steps listed on this site is supported."` : ""}><a href='${url}' target="_blank" rel="noopener noreferrer">${url}</a></li>`
        } // Shadow-add Flufi Music as a supported site
    })
    return urls_list;
} // Make my life easier

async function checkSwitcherEligibility(url) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const responsedata = url ?? tab.url ?? ''

    const allowed_urls = (whitelisted_urls.some(item => responsedata.startsWith(item)))
    let errormsg = "If this extension is open while you're on a supported Rotur-affiliated site, then this will automatically log you into the selected Rotur account on that site."
    if (!allowed_urls) {
        document.getElementById('switchaccbtn').disabled = true
        if (responsedata.includes('rotur') || responsedata.includes('origin') || responsedata.includes('mistium')) {
            errormsg += `<br>While you are (likely) on a rotur-affiliated site, this feature may not be supported for that particular service yet.`
        } else {
            errormsg += `<br>You are not on a rotur-affiliated website. If you own a Rotur-affiliated site and you want me to support your site, let me know on discord @dominic_the_gamer or on OriginChats.`
        }
    } else {
        if (activeacc.uuid && !flagged.includes(activeacc.uuid)) {
            document.getElementById('switchaccbtn').disabled = false
        }
    }
    document.getElementById('disabledcontext').setHTML(`
    <p class='switchertext'>${errormsg}</p>
    <p class='switchertext'>As of now, the following supported sites are:</p>
    <ul>
        ${genURLs()}
    </ul>`, {sanitizer: sanitizer});
}

document.getElementById('account_list').addEventListener('dblclick', (event) => {
    event.preventDefault()
    if (event.target.className == 'acclistentry') {
        if (!document.getElementById('switchaccbtn').disabled) {
            document.getElementById('switchaccbtn').click()
        }
    }
});

async function EnableDragging() {
    if ((accounts.length < 2) || (document.getElementById('accsearchbar').value)) {
        return;
    }
    
    const listContainer = document.getElementById('account_list').querySelector('form');
    let draggedItem = null;

    listContainer.addEventListener('dragstart', (e) => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) {
            e.preventDefault();
            return;
        }
        
        draggedItem = handle.closest('.acclistentry');
        
        if (draggedItem) {
            setTimeout(() => draggedItem.classList.add('dragging'), 0);
        }
    });

    listContainer.addEventListener('dragend', async (e) => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            const currentRows = Array.from(listContainer.querySelectorAll('.acclistentry'));
                
            const newaccorder = currentRows.map(row => row.dataset.name);
                
            accounts = newaccorder.map(name => {
                return accounts.find(account => account.name === name);
            });
            chrome.storage.local.set({userdata: accounts})
        }
    });

    listContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        
        const targetRow = e.target.closest('.acclistentry');
        if (!targetRow || targetRow === draggedItem) {
            return;
        }

        const positionComparison = draggedItem.compareDocumentPosition(targetRow);

        if (positionComparison & Node.DOCUMENT_POSITION_FOLLOWING) {
            targetRow.after(draggedItem);
        } else if (positionComparison & Node.DOCUMENT_POSITION_PRECEDING) {
            targetRow.before(draggedItem);
        }
    });
}

async function buildlist(customquery) {
    if (accounts.length < 2) {
        document.getElementById('accsearchbar').style.display = 'none'
        customquery = null
    }
    if (roturstwarning) {
        chrome.storage.session.remove('roturstwarning')
        openWarningPopup("You have granted Rotur Assistant a sub-token. Since Rotur Assistant was designed around the main token, some parts of Rotur Assistant may not work correctly with a sub-token.")
        const newbtn = document.createElement('button')
        newbtn.id = 'reauth'
        newbtn.textContent = 'Reauthenticate'
        document.getElementById('popup-choices').prepend(newbtn)
    }
    if (roturstwarning) {
        chrome.storage.session.remove('roturemailwarning')
        openWarningPopup("Your e-mail wasn't verified. Don't worry, Rotur Assistant has verified it for you, regardless if your email was valid or not.")
        document.getElementById('overlay').querySelector('h1').textContent = 'Notice'
    }

    let activeindex = accounts.findIndex(acc => acc.name === activeacc.name);
    if (activeindex == -1) {
        activeindex = 0
    }

    let acc_html = document.createElement('form')
    document.querySelector('.selectacctext').textContent = `Select Active Account - ${accounts.length}`

    if (accounts.length == 0) {
        acc_html = document.createElement('h2')
        acc_html.id = 'noaccsyet'
        acc_html.textContent = 'No saved accounts yet!'
        document.getElementById('switchaccbtn').disabled = true
    } else {
        for (let i=0; i<accounts.length; i++) {
            const name = accounts[i].name
            if (customquery && !(name.toLowerCase().includes(customquery.toLowerCase()))) {
                continue;
            }
            const addacctemplate = document.getElementById('acclistentrytemplate').content.cloneNode(true)

            const radiobtn = addacctemplate.querySelector("[name='account']")
            radiobtn.value = i
            if (i == activeindex) {
                radiobtn.checked = true
            } else {
                radiobtn.checked = false
            }
            if ((accounts.length < 2) || customquery) {
                addacctemplate.querySelector('.drag-handle').remove()
            }
            addacctemplate.querySelector(".acclistentry").dataset.name = name
            addacctemplate.querySelector("[class='acclistimage']").src = `https://avatars.rotur.dev/${name}`
            addacctemplate.querySelector("[class='acclistimage']").alt = name
            addacctemplate.querySelector(".usernamespan").textContent = name
            if (name.length > 16) {
                addacctemplate.querySelector(".usernamespan").style = "font-size: 12px;"
            }
            addacctemplate.querySelector('[class="viewprofile"]').dataset.name = name
            addacctemplate.querySelector('[class="editprofile"]').dataset.name = name
            addacctemplate.querySelector('[class="removeacc"]').dataset.name = name
            addacctemplate.querySelector('[class="removeacc"]').dataset.id = accounts[i].uuid
            if (flagged.includes(accounts[i].uuid)) {
                const edittowarning = addacctemplate.querySelector('[class="editprofile"]')
                edittowarning.className = 'accwarning'
                edittowarning.dataset.id = accounts[i].uuid
                edittowarning.title = "Issue Detected"
                const warningimg = document.createElement('img')
                warningimg.src = '../images/misc_icons/auth_warning.png'
                warningimg.width = 24
                warningimg.height = 24
                edittowarning.replaceChildren()
                edittowarning.appendChild(warningimg)
            }
            acc_html.appendChild(addacctemplate)
        }
        if (acc_html.childElementCount == 0) {
            acc_html = document.createElement('h2')
            acc_html.id = 'noaccsyet'
            acc_html.textContent = 'No accounts match your search'
        }
        document.getElementById('switchaccbtn').disabled = flagged.includes(activeacc.uuid)
    }
    const addacc = document.createElement('a')
    addacc.href = "/pages/auth.html"
    addacc.className = 'addaccbtn'
    addacc.textContent = '+ Add Account'
    addacc.title = "Shift-click to login directly with a Rotur token instead"

    document.getElementById('account_list').replaceChildren(acc_html)
    document.getElementById('account_list').appendChild(addacc)
    EnableDragging()
    await checkSwitcherEligibility()
    if (accounts.length == 0) {
        document.getElementById('disabledcontext').setHTML('<p>You need at least one account added in order to use this feature.</p>')
    }
}

buildlist()

async function switchAccount(idx) {
    let activeacc2 = {}
    if (accounts.length != 0) {
        activeacc2 = accounts[idx]
    }
    activeacc = activeacc2
    chrome.storage.local.set({activeacc: activeacc2})
    if (flagged.includes(activeacc2.uuid)) {
        document.getElementById('switchaccbtn').disabled = true
    } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const responsedata = tab.url ?? ''
        if (whitelisted_urls.some(item => responsedata.includes(item)) || responsedata.startsWith('https://rotur.dev')) {
            document.getElementById('switchaccbtn').disabled = false
        }
    }
    updateHeaderName(activeacc2.name ?? "Not signed in")
}

document.addEventListener('change', async function(e) {
    if (e.target.name === 'account') {
        switchAccount(parseInt(e.target.value))
    }
});

document.addEventListener('click', async function(e) {
    if (e.target.className == 'closebtn') {
        if (document.getElementById('tokenloginbox')) {
            document.getElementById('tokenloginbox').value = ''
        }
        closePopup()
        return;
    }
    if ((e.target.className == 'addaccbtn') && e.shiftKey) {
        e.preventDefault()
        openTokenLoginPopup()
        return;
    }
    /* Shelved for now
    if (e.target.id == 'tokenlogin') {
        openTokenLoginPopup()
        return;
    }
    if (e.target.id == 'qrcodelogin') {
        openQRCodePopup()
        return;
    }
    */
    if (e.target.id == 'tokenloginvisibility') {
        if (e.target.dataset.visible == 'true') {
            e.target.dataset.visible = 'false'
            e.target.setHTML(`<img src="../images/misc_icons/invisible.png" width="24" height="24">`, {sanitizer: sanitizer})
            document.getElementById('tokenloginbox').type = 'password'
        } else {
            e.target.dataset.visible = 'true'
            e.target.setHTML(`<img src="../images/misc_icons/visible.png" width="24" height="24">`, {sanitizer: sanitizer})
            document.getElementById('tokenloginbox').type = 'text'
        }
    }
    if (e.target.className == 'addacctoken') {
        const token = document.getElementById('tokenloginbox').value
        closePopup()
        if (token == '') {
            openErrorPopup('No token was provided')
        } else {
            const authform = new FormData()
            authform.append("Authorization", `Bearer ${token}`)
            const potentialuser = await fetch(`https://api.rotur.dev/v2/me`, {headers: authform}).then(res => res.json())
            let username = ''
            if (potentialuser.error && potentialuser.error == "Invalid authentication credentials" && !potentialuser.username) {
                openErrorPopup('Invalid Token')
            } else if (potentialuser['sys.banned']) {
                openErrorPopup('This token appears to be associated with a banned account.')
            } else {
                let uuid = ''
                if (!potentialuser['sys.tos_accepted']) {
                    let userdata2 = await fetch(`https://api.rotur.dev/profile?name=${potentialuser.username}`).then(res => res.json()).catch(err => {
                        openErrorPopup("An unexpected error occurred. Either the token you provided was invalid, or Rotur's authentication servers aren currently down right now.")
                    })
                    uuid = userdata2.id
                    openWarningPopup('While the provided token was valid, the account has not accepted the TOS yet. The account was successfully added, but it may have limited access to some apps until the TOS is accepted.')
                } else {
                    uuid = potentialuser['sys.id']
                }
                const exist_index = accounts.findIndex(item => item.uuid == uuid)
                if (exist_index > -1) {
                    accounts[exist_index] = {name: potentialuser.username, token: token, uuid: uuid}
                } else {
                    accounts.push({name: potentialuser.username, token: token, uuid: uuid})
                    document.querySelector('.selectacctext').textContent = `Select Active Account - ${accounts.length}`
                }
                activeacc = {name: potentialuser.username, token: token, uuid: uuid}
                await chrome.storage.local.set({userdata: accounts})
                await chrome.storage.local.set({activeacc: {name: potentialuser.username, token: token, uuid: uuid}})
                updateHeaderName(potentialuser.username)
                document.getElementById('accsearchbar').value = ''
                buildlist()
                if (token.startsWith('rotur_st_')) {
                    openWarningPopup("You have granted Rotur Assistant a sub-token. Since Rotur Assistant was designed around the main token, some parts of Rotur Assistant may not work correctly with a sub-token.")
                }
            }
        }
    }
    if (e.target.className == "viewprofile") {
        e.preventDefault();
        this.location.href = `../pages/lookup.html?user=${e.target.dataset.name}`
        return;
    }
    if (e.target.className == "editprofile") {
        e.preventDefault();
        this.location.href = `../pages/account.html?user=${e.target.dataset.name}`
        return;
    }
    if (e.target.id == 'reauth') {
        this.location.href = "auth.html"
        return;
    }
    if (e.target.id == 'exportroster') {
        openNameRoster()      
    }
    if (e.target.className == 'finalrosterexport') {
        closePopup()
        exportToJsonFile(accounts, document.getElementById('rostername').value)  
    }
    if (e.target.id == 'importroster') {
        if (e.shiftKey) {
            try {
                const clipboardText = await navigator.clipboard.readText();
                let jsonData = {}
                try {
                    jsonData = JSON.parse(clipboardText);
                    jsonData = jsonData.filter(item => ((Object.keys(item).length == 3) && item.name && item.token && item.uuid))
                    if (jsonData.length == 0) {
                        openErrorPopup('Invalid JSON format')
                    } else {
                        file_cache = jsonData;
                        openConfirmNewRoster()
                    }
                } catch {
                    openErrorPopup('Your clipboard did not contain valid JSON.')
                }
            } catch (error) {
                openErrorPopup('Your clipboard was empty.')
            }         
        } else {
            document.getElementById('importrosterbtn').click()   
        }   
    }
    if (e.target.className == "removeacc") {
        e.preventDefault();
        closePopup()

        const IDToRemove = e.target.dataset.id;

        accounts = accounts.filter(acc => acc.uuid !== IDToRemove);
        flagged = flagged.filter(id => id != IDToRemove)
        chrome.storage.local.set({flagged: flagged})
        document.querySelector('.selectacctext').textContent = `Select Active Account - ${accounts.length}`

        let rpcactive = await new Promise(resolve =>
            chrome.storage.local.get('rpcactive', data => resolve(data.rpcactive || ''))
        ) ?? '';

        await new Promise(resolve =>
            chrome.storage.local.set({userdata: accounts}, resolve)
        );

        if (activeacc.uuid == IDToRemove) {
            await switchAccount(0)
            let accountbuttons = document.getElementsByName('account')
            if (accounts.length > 0) {
                accountbuttons[0].checked = true
            }
        }
        chrome.storage.session.remove('sum_cache')
        document.querySelector(`button[data-id="${IDToRemove}"]`).closest("[class='acclistentry']").remove()
        if (accounts.length < 2) {
            document.querySelector('.drag-handle')?.remove()
            document.getElementById('accsearchbar').value = ''
            document.getElementById('accsearchbar').style.display = 'none'
        }
        if ((document.getElementById('account_list').querySelector('form').childElementCount == 0) && (accounts.length > 0) && document.getElementById('accsearchbar').value) {
            const addacc = document.createElement('a')
            addacc.href = "/pages/auth.html"
            addacc.className = 'addaccbtn'
            addacc.textContent = '+ Add Account'
            addacc.title = "Shift-click to login directly with a Rotur token instead"

            document.getElementById('account_list').replaceChildren(CreateEmptyPlaceholder('No accounts match your search'))
            document.getElementById('account_list').appendChild(addacc)
        }
        if (accounts.length == 0) {
            updateHeaderName("Not signed in")
            buildlist();
        }
        if (rpcactive == IDToRemove) {
            rpcactive = ''
            chrome.storage.local.set({rpcactive: rpcactive})
        }
        return;
    }
    if (e.target.className == 'accwarning') {
        e.preventDefault();
        openAuthErrorPopup(e.target.dataset.id)
        return;
    }
    if (e.target.id == 'switchaccbtn') {
        chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
            if (tabs[0].url.includes('https://warptheme.mistium.com')) {
                await chrome.cookies.remove({url: 'https://warptheme.mistium.com', name: 'auth_token'})
            }
            if (tabs[0].url.includes('https://git.rotur.dev')) {
                await chrome.cookies.remove({url: 'https://git.rotur.dev', name: 'g_state'})
                await chrome.cookies.remove({url: 'https://git.rotur.dev', name: 'session'})
                await chrome.cookies.remove({url: 'https://git.rotur.dev', name: 'username'})
            }
            if (tabs[0].url.includes('https://authenticator.rotur.dev')) {
                await chrome.cookies.remove({url: 'https://authenticator.rotur.dev', name: 'auth_token'})
                await chrome.cookies.remove({url: 'https://authenticator.rotur.dev', name: 'username'})
            }
            if (tabs[0].url.includes('https://warp.mistium.com')) {
                await chrome.cookies.remove({url: 'https://warp.mistium.com', name: 'auth_token'})
                await chrome.cookies.remove({url: 'https://warp.mistium.com', name: 'cf_clearance'})
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: "switchacc", data: activeacc.token, datauser: activeacc.name });
        });
        return;
    }
    if (e.target.id == 'switchaccinfo') {
        if (e.target.innerText == '?') {
            e.target.innerText = '✕'
            document.getElementById('disabledcontext').style.display = 'block'
        } else {
            e.target.innerText = '?'
            document.getElementById('disabledcontext').style.display = 'none'
        }
        return;
    }
    if (e.target.id == 'scramblesync') {
        if (document.getElementById('noaccsyet')) {
            return;
        }
        const syncacc = await new Promise(resolve =>
            chrome.storage.sync.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};
        let syncdata = await new Promise(resolve =>
            chrome.storage.sync.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
        chrome.storage.local.set({scrambledata: e.target.checked})
        if (e.target.checked) {
            if (!syncdata.some(item => item.scrambled)) {
                syncacc.token = scramble(syncacc.token)
                for (let i=0; i<syncdata.length; i++) {
                    syncdata[i].token = scramble(syncdata[i].token)
                }
                syncdata.push({scrambled: true})
                chrome.storage.sync.set({userdata: syncdata})
                chrome.storage.sync.set({activeacc: syncacc})
            }
        } else {
            if (syncdata.some(item => item.scrambled)) {
                syncacc.token = unscramble(syncacc.token)
                for (let i=0; i<syncdata.length - 1; i++) {
                    syncdata[i].token = unscramble(syncdata[i].token)
                }
                syncdata = syncdata.filter(item => !item.scrambled)
            }
        }
        chrome.storage.sync.set({userdata: syncdata})
        chrome.storage.sync.set({activeacc: syncacc})
        chrome.storage.session.remove('sum_cache')
        return;
    }
    if (e.target.id == "uploadsync") {
        const syncstatus = document.getElementById('syncstatusplaceholder')
        const syncacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};
        let syncdata = await new Promise(resolve =>
            chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
        if (syncdata.length == 0) {
            syncstatus.replaceChildren(MiniError('failure', "You need at least one account added in order to sync."))
        } else if (syncdata.length < 21) {
            if (document.getElementById('scramblesync').checked) {
                syncacc.token = scramble(syncacc.token)
                for (let i=0; i<syncdata.length; i++) {
                    syncdata[i].token = scramble(syncdata[i].token)
                }
                syncdata.push({scrambled: true})
            }
            chrome.storage.sync.set({userdata: syncdata})
            chrome.storage.sync.set({activeacc: syncacc})
            syncstatus.replaceChildren(MiniError("success", "Synced Successfully!"))
        } else {
            syncstatus.replaceChildren(MiniError("failure", "Due to google limitations, you can only sync if you have 20 or less accounts added."))
        }
        setTimeout(() => {
            syncstatus.replaceChildren()
        }, 10000);
        return;
    }
    if (e.target.id == 'downloadsync') {
        openConfirmSyncRetrieval()
    }
    if (e.target.className == "finalretrievesync") {
        closePopup()
        const syncstatus = document.getElementById('syncstatusplaceholder')
        const syncacc = await new Promise(resolve =>
            chrome.storage.sync.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};
        let syncdata = await new Promise(resolve =>
            chrome.storage.sync.get('userdata', data => resolve(data.userdata || []))
        ) ?? [];
        if (syncdata.length == 0) {
            syncstatus.replaceChildren(MiniError("failure", "There is nothing stored in sync."))
        } else {
            if (syncdata.some(item => item.scrambled)) {
                syncacc.token = unscramble(syncacc.token)
                for (let i=0; i<syncdata.length - 1; i++) {
                    syncdata[i].token = unscramble(syncdata[i].token)
                }
                syncdata = syncdata.filter(item => !item.scrambled)
            }
            chrome.storage.local.set({userdata: syncdata})
            chrome.storage.local.set({activeacc: syncacc})
            activeacc = syncacc
            accounts = syncdata
            flagged = []
            chrome.storage.local.set({flagged: []})
            syncstatus.replaceChildren(MiniError("success", "Successfully retrieved data from sync!"))
            buildlist()
            updateHeaderName(syncacc.name)
        }
        setTimeout(() => {
            syncstatus.replaceChildren()
        }, 10000);
        return;
    }
    if (e.target.id == 'clearsync') {
        openConfirmSyncClear()
    }
    if (e.target.className == "finalclear") {
        closePopup()
        const syncstatus = document.getElementById('syncstatusplaceholder')
        chrome.storage.sync.remove('activeacc')
        chrome.storage.sync.remove('userdata')
        syncstatus.replaceChildren(MiniError("success", "Sync cleared out successfully!"))
        setTimeout(() => {
            syncstatus.replaceChildren()
        }, 10000);
        return;
    }
    if (e.target.className == "finalrosteroverwrite") {
        accounts = file_cache
        activeacc = file_cache[0]
        await chrome.storage.local.set({userdata: file_cache})
        await chrome.storage.local.set({activeacc: file_cache[0]})
        await chrome.storage.local.set({flagged: []})
        await chrome.storage.session.remove('sum_cache')
        updateHeaderName(file_cache[0].name ?? "Not signed in")
        closePopup()
        buildlist()
    }
});

document.getElementById('importrosterbtn').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        let obj = {}
        try {
            obj = JSON.parse(e.target.result);
            obj = obj.filter(item => ((Object.keys(item).length == 3) && item.name && item.token && item.uuid))
            if (obj.length == 0) {
                openErrorPopup('Invalid JSON format')
            } else {
                file_cache = obj;
                openConfirmNewRoster()
            }
        } catch {
            openErrorPopup('The file submitted was not valid json.')
        }
    };

    reader.readAsText(file);
});

if (ui_mode == 'sidebar') {
    chrome.tabs.onActivated.addListener((activeInfo) => {
        checkSwitcherEligibility()
    });
}
document.getElementById('accsearchbar').addEventListener('input', function(e) {
    buildlist(e.target.value)
})
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type == 'Newsite') {
        checkSwitcherEligibility(msg.url)
        sendResponse('Done')
    }
    return true;
})