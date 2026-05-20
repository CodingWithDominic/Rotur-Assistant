import { parseHTML, openErrorPopup, openWarningPopup } from "../index.js";

const whitelisted_urls = ['https://apps.rotur.dev', 'https://origin.mistium.com', 'https://originchats.mistium.com/app', 'https://rotur.dev/me',
                            'https://warptheme.mistium.com', 'https://notes.rotur.dev', 'https://devfund.rotur.dev', 'https://photos.rotur.dev',
                            'https://warpdrive.team', "https://rotur.dev/key-manager", "https://rotur.dev/inventory-manager", "https://graphite.flufi.uk",
                            "https://runnova.github.io/orion", "https://adthoughtsglobal.github.io/Orla", "https://antiviiris.github.io/originChats",
                            'https://git.rotur.dev']
                            
const parser = new DOMParser();

let file_cache = ''

let scrambledata = await new Promise(resolve =>
    chrome.storage.local.get('scrambledata', data => resolve(data.scrambledata || false))
) ?? false;

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

// Popup code

function openAuthErrorPopup(uuid) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Issue Detected</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">An authentication issue has been detected with this account. This account may have either been banned, deleted, or simply had its token reset. Try logging in with this account again or use a different account.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Dismiss</button>
            <button id="reauth">Reauth</button>
            <button class="removeacc" data-id='${uuid}'>Remove</button>
        </div>
    `))
}

function openAltLoginPopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Token Login</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Login using a Rotur account token here</p>
        <input type='text' id='tokenloginbox'>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="addacctoken">Login</button>
        </div>
    `))
}

function openNameRoster() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Name Roster</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Name this roster (optional)</p>
        <input type='text' id='rostername'>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalrosterexport">Export</button>
        </div>
    `))
}

function openConfirmSyncRetrieval() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Retrieval</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to overwrite your current roster with the one stored in sync?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalretrievesync">Retrieve</button>
        </div>
    `))
}

function openConfirmSyncClear() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm Clear</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to clear out your sync storage? Any data stored in there will be lost.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalclear">Clear</button>
        </div>
    `))
}

function openConfirmNewRoster() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Overwrite Roster</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Overwrite the current roster with the new one?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalrosteroverwrite">Overwrite</button>
        </div>
    `))
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
        urls_list += `<li><a href='${url}' target="_blank" rel="noopener noreferrer">${url}</a></li>`
    })
    return urls_list;
} // Make my life easier

async function checkSwitcherEligibility() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const responsedata = tab.url

    const allowed_urls = whitelisted_urls.some(item => responsedata.includes(item))
    let errormsg = "If this extension is open while you're on a supported Rotur-affiliated site, then this will automatically log you into the selected Rotur account on that site."
    if (!allowed_urls) {
        document.getElementById('switchaccbtn').disabled = true
        if (responsedata.includes('rotur') || responsedata.includes('origin') || responsedata.includes('mistium')) {
            errormsg += `<br>While you are (likely) on a rotur-affiliated site, this feature may not be supported for that particular service yet.`
        } else {
            errormsg += `<br>You are not on a rotur-affiliated website. If you own a rotur-affiliated site and you want me to support your site, let me know on discord @dominic_the_gamer.`
        }
    }
        const errorhtml = parser.parseFromString(`
        <p class='switchertext'>${errormsg}</p>
        <p class='switchertext'>As of now, the following supported sites are:</p>
        <ul>
            ${genURLs()}
        </ul>`, 'text/html'); // Can't add support for gate.rotur.dev since it's auth loops infinitely. Maybe in the future
        const errorhtml2 = errorhtml.body.children
        document.getElementById('disabledcontext').replaceChildren(...errorhtml2)
}

async function buildlist() {
    const accounts = await new Promise(resolve =>
        chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
    ) ?? [];

    const activeacc = await new Promise(resolve =>
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
    ) ?? [];

    const flagged_accs = await new Promise(resolve =>
        chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
    ) ?? [];

    let activeindex = accounts.findIndex(acc => acc.name === activeacc.name);
    if (activeindex == -1) {
        activeindex = 0
    }

    let acc_html = ``

    if (accounts.length == 0) {
        acc_html += `
        <h2 id='noaccsyet'>No saved accounts yet!</h2>
        <a href="/pages/auth.html" class="addaccbtn">+ Add account</a>
        `
        document.getElementById('switchaccbtn').disabled = true
    } else {
        acc_html += `<form>`

        for (let i=0; i < accounts.length; i++) {
            let name = accounts[i].name
            acc_html += `
            <label class='acclistentry'>
                <input type="radio" name="account" value="${i}" ${i == activeindex ? 'checked' : ''} />
                <img src="${'https://avatars.rotur.dev/' + name}" alt="${name}" class="acclistimage" />
                <span ${name.length > 18 ? 'style="font-size: 12px;"' : ''}'>${name}</span>
                <div class='accountpanel'>
                    <button class='viewprofile' title='View Profile' data-name='${name}'><img src='../images/misc_icons/usericon.png' width=24 height=24></button>
                    ${flagged_accs.includes(accounts[i].uuid) ? `<button class='accwarning' title='Issue Detected' data-name='${name}' data-id='${accounts[i].uuid}'><img src='../images/misc_icons/auth_warning.png' width=24 height=24></button>` : `<button class='editprofile' title='Edit Profile' data-name='${name}'><img src='../images/misc_icons/edit.png' width=24 height=24></button>`}
                    <button class='removeacc' title='Remove Account' data-name='${name}' data-id='${accounts[i].uuid}'>✕</button>
                </div>
            </label>`
        }
        acc_html += `
        </form>
        <a href="/pages/auth.html" class="addaccbtn">+ Add account</a>
        `
        document.getElementById('switchaccbtn').disabled = flagged_accs.includes(activeacc.uuid)
    }

    document.getElementById('account_list').replaceChildren(...parseHTML(acc_html))
    await checkSwitcherEligibility()
    if (accounts.length == 0) {
        document.getElementById('disabledcontext').replaceChildren(...parseHTML('<p>You need at least one account added in order to use this feature.</p>'))
    }
}

buildlist()

async function switchAccount(idx) {
    let accounts = await new Promise(resolve =>
    chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
    ) ?? [];

    const flagged_accs = await new Promise(resolve =>
        chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
    ) ?? [];

    let activeacc = {}
    if (accounts.length != 0) {
        activeacc = accounts[idx]
    }

    chrome.storage.local.set({activeacc: activeacc})
    if (flagged_accs.includes(activeacc.uuid)) {
        document.getElementById('switchaccbtn').disabled = true
    } else {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const responsedata = tab.url
        if (whitelisted_urls.some(item => responsedata.includes(item))) {
            document.getElementById('switchaccbtn').disabled = false
        }
    }
    updateHeaderName(activeacc.name ?? "Not signed in")
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
        openAltLoginPopup()
        return;
    }
    if (e.target.className == 'addacctoken') {
        const token = document.getElementById('tokenloginbox').value
        closePopup()
        if (token == '') {
            openErrorPopup('No token was provided')
        } else {
            let accounts = await new Promise(resolve =>
                chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
            ) ?? [];
            const potentialuser = await fetch(`https://api.rotur.dev/get_user?auth=${token}`).then(res => res.json())
            let username = ''
            if (potentialuser.error && potentialuser.error == "Invalid authentication credentials" && !potentialuser.username) {
                openErrorPopup('Invalid Token')
            } else if (potentialuser['sys.banned']) {
                openErrorPopup('This token appears to be associated with a banned account.')
            } else {
                let uuid = ''
                if (!potentialuser['sys.tos_accepted']) {
                    let userdata2 = await fetch(`https://api.rotur.dev/profile?name=${potentialuser.username}`).then(res => res.json())
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
                }
                chrome.storage.local.set({userdata: accounts})
                chrome.storage.local.set({activeacc: {name: potentialuser.username, token: token, uuid: uuid}})
                updateHeaderName(potentialuser.username)
                buildlist()
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
        let accounts = await new Promise(resolve =>
            chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        );
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

        let accounts = await new Promise(resolve =>
            chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
        );
        let flagged = await new Promise(resolve =>
            chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
        );
        let activeacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
        ) ?? {};

        accounts = accounts.filter(acc => acc.uuid !== IDToRemove);
        flagged = flagged.filter(id => id != IDToRemove)
        chrome.storage.local.set({flagged: flagged})

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
        buildlist();
        if (accounts.length == 0) {
            updateHeaderName("Not signed in")
        }
        return;
    }
    if (e.target.className == 'accwarning') {
        e.preventDefault();
        openAuthErrorPopup(e.target.dataset.id)
        return;
    }
    if (e.target.id == 'switchaccbtn') {
        let activeacc = await new Promise(resolve =>
            chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
        ) ?? [];
        chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
            if (tabs[0].url.includes('https://warptheme.mistium.com')) {
                await chrome.cookies.remove({url: 'https://warptheme.mistium.com', name: 'auth_token'}) // WarpTheme gets VIP treatment since I had to modify manifest.json to allow permissions to modify cookies
            }
            if (tabs[0].url.includes('https://git.rotur.dev')) {
                await chrome.cookies.remove({url: 'https://git.rotur.dev', name: 'g_state'})
                await chrome.cookies.remove({url: 'https://git.rotur.dev', name: 'session'}) // Same goes for roturGIT
                await chrome.cookies.remove({url: 'https://git.rotur.dev', name: 'username'})
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
            syncstatus.replaceChildren(...parseHTML(`<p class='failure'>You need at least one account added in order to sync.</p>`))
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
            syncstatus.replaceChildren(...parseHTML(`<p class='success'>Synced successfully!</p>`))
        } else {
            syncstatus.replaceChildren(...parseHTML(`<p class='failure'>Due to google limitations, you can only sync if you have 20 or less accounts added.</p>`))
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
            syncstatus.replaceChildren(...parseHTML(`<p class='failure'>There is nothing stored in sync.</p>`))
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
            chrome.storage.local.set({flagged: []})
            syncstatus.replaceChildren(...parseHTML(`<p class='success'>Successfuly retrieved data from sync!</p>`))
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
        syncstatus.replaceChildren(...parseHTML(`<p class='success'>Sync cleared out successfully!</p>`))
        setTimeout(() => {
            syncstatus.replaceChildren()
        }, 10000);
        return;
    }
    if (e.target.className == "finalrosteroverwrite") {
        await chrome.storage.local.set({userdata: file_cache})
        await chrome.storage.local.set({activeacc: file_cache[0]})
        await chrome.storage.local.set({flagged: []})
        await chrome.storage.session.remove('sum_cache')
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