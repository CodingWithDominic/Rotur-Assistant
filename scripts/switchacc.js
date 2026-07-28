console.log('[Rotur Assistant] Rotur account switcher active') // This has to exist or else the switcher won't work

const config = {
    removeElements: ['iframe', 'script', 'style', 'object', 'embed', 'applet', 'meta', 'link', 'base', 'form'],
    removeAttributes: ['onload', 'onclick', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onkeydown', 'onchange', 'onsubmit', 'srcdoc', 'formaction']
}
const sanitizer = new Sanitizer(config)

function BlockGIFs() {
    const TARGET_PREFIX = "https://gifs.originchats.com/api/";
    const CUSTOM_IMAGE_URL = "https://i.postimg.cc/1XCBXRcn/Rotur-Assistant-No-Gifs.png";

    function observePage() {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'data-image-url']
        });
    }

    function enforceCustomImage(img) {
        const needsDataUpdate = (img.dataset.imageUrl && img.dataset.imageUrl.startsWith(TARGET_PREFIX));

        if (needsDataUpdate) {
            observer.disconnect();
            img.src = CUSTOM_IMAGE_URL
            img.dataset.imageUrl = CUSTOM_IMAGE_URL;
            let intervalcount = 0;
            const imgoverwrite = setInterval(function() {
                img.src = CUSTOM_IMAGE_URL
                intervalcount += 1
                if (intervalcount > 10) {
                    clearInterval(imgoverwrite)
                }
            }, 50) // Catch any images missed by the first pass
            observePage();
        }
    }

    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === "IMG") {
                            enforceCustomImage(node);
                        }
                        const nested = node.getElementsByTagName("img");
                        for (let img of nested) {
                            enforceCustomImage(img);
                        }
                    }
                }
            }
            else if (mutation.type === 'attributes' && mutation.target.tagName === 'IMG') {
                enforceCustomImage(mutation.target);
            }
        }
    });

    const initialImages = document.getElementsByTagName("img");
    for (let img of initialImages) {
        enforceCustomImage(img)
    };

    observePage();
}

let generalname = ''
const site_selectors = {
    mist: ['[data-channel-name="general"], [data-channel="general"]', '[class*="mainHeaderChannelName"]'],
    indigo: ['.channel_item[channeltype][data-name="general"]', 'div.topbar span']
}

function OverrideGeneral(site) {
    const list_element = site_selectors[site][0]
    const header_element = site_selectors[site][1]
    
    function override(element) {
        if (site == 'indigo') {
            if (element.textContent.trim() === 'general') return;

            if (generalname == '') {
                element.querySelector('span')?.remove()
                generalname = element.textContent.trim();
                generalname = generalname.slice(7, 9999)
            }
            element.setHTML(`<span class="channel_icon">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" color="currentColor" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
                                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5"></path>
                                </svg>
                            </span>
                            general`, {sanitizer: sanitizer})
        } else {
            const span = (element.querySelector('span') ?? element.closest('span'));
            if (span) {
                if (generalname === '') {
                    generalname = span.textContent.trim();
                }
                
                if ((site == 'mist') && span.matches('[data-channel="general"]')) {
                    if (span.textContent === 'Message in #general') return;
                    span.textContent = 'Message in #general';
                    span.title = 'general'
                } else {
                    if (span.textContent === 'general') return;
                    span.textContent = "general"
                }
            }
        }
    }
    
    function overrideHeader() {
        const header = document.querySelector(header_element);
        if (header && header.textContent.trim() === generalname) {
            if (header.textContent === 'general') return;
            header.textContent = 'general';
        }
    }
    
    document.querySelectorAll(list_element).forEach(channel => {
        override(channel)
    })
    
    const observer = new MutationObserver((mutations) => {
        overrideHeader();
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1) { 
                        if (node.matches(list_element)) {
                            override(node);
                        }
                        const channelItem = node.querySelector(list_element);
                        if (channelItem) override(channelItem);
                    }
                }
            }
        }
    });
    
    function observePageForGeneral() {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }
    observePageForGeneral()
}

window.onload = async () => {
    const settings = await new Promise(resolve =>
        chrome.storage.local.get('settings', data => resolve(data.settings?.padEnd(16, "0") || "0000000000000000"))
    ) ?? "0000000000000000";
    if (settings[8] == "1") {
        BlockGIFs()
        if (window.location.href.startsWith('https://gifs.originchats.com')) {
            const bg = document.createElement('div')
            const style = document.createElement('style')
            style.innerHTML = `
            .overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .popup {
                background: #4e4e4e;
                padding: 12px;
                border-radius: 12px;
                box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.3);
                width: 600px;
                max-width: 600px;
                text-align: center;
                color: white;
                position: relative;
            }
            .popup button {
                background: #727272;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
            }
            .popup p {
                margin: 3;
                font-size: 14px;
            }
            #popup-header {
                margin-bottom: 8px;
            }
            #popup-header h1 {
                margin-top: -10;
                margin-bottom: 5;
                font-weight: 500;
            }
            #popup-x {
                position: absolute;
                right: 0px;
                top: 0px;
                background: transparent;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
            }
            #popup-choices {
                margin-top: 16px;
                display: flex;
                flex-direction: row;
                gap: 10px;
                justify-content: center;
            }
            #popup-choices button {
                width: 400px;
            }`
            bg.className = 'overlay'
            bg.id = 'ra_overlay'
            const popup = document.createElement('div')
            popup.className = 'popup'
            popup.id = 'ra_popup'
            popup.innerHTML = `
                <div id="popup-header">
                    <h1>Warning</h1>
                    <button id="popup-x" class="closebtn">✕</button>
                </div>
                <p>Your current settings inside Rotur Assistant may cause issues when trying to use this service. Specifically, the option to block GIFs from showing. You may want to disable that setting to ensure a smooth experience on this service.<br>Home -> Settings -> Block GIFs from https://gifs.originchats.com</p>
                <div id="popup-choices">
                    <button class="closebtn">Dismiss</button>
                </div>`
            bg.appendChild(style)
            bg.appendChild(popup)
            document.body.appendChild(bg)
            document.getElementById('ra_popup').addEventListener('click', (e) => {
                if (e.target.className == 'closebtn') {
                    document.getElementById('ra_overlay').remove()
                }
            })
        }
    }
    if (settings[9] == '1') {
        if ((window.location.href.startsWith('https://originchats.com') || window.location.href.startsWith('https://originchats.mistium.com'))) {
            OverrideGeneral('mist')
        } else if (window.location.href.startsWith('https://runnova.github.io/indigo')) {
            OverrideGeneral('indigo')
        } else if (window.location.href.startsWith('https://graphite.flufi.uk')) {
            // Graphite doesn't give enough information in its DOM to allow for support
        }

    }
    chrome.runtime.sendMessage({ type: "Newsite", url: window.location.href });
    if (window.location.href.startsWith('https://rotur.dev/terms-of-service')) {
        const acceptinprogress = await new Promise(resolve =>
            chrome.storage.session.get('acceptinprogress', data => resolve(data.acceptinprogress || null))
        ) ?? null;
        if (acceptinprogress) {
            document.getElementById('accept-terms').click()
            document.getElementById('accept-button').click() // Get around the https://rotur.dev origin limitation
        }
        return;
    }
    if (window.location.href.startsWith('https://rotur.dev/auth')) {
        try {
            const acceptinprogress = await new Promise(resolve =>
                chrome.storage.session.get('acceptinprogress', data => resolve(data.acceptinprogress || null))
            ) ?? null;
            if (acceptinprogress) {
                chrome.runtime.sendMessage({status: 'accepted'})
            }
        } catch {
            return;
        }
        return;
    }
}

function updateToken(site, subspace, newToken) {
    const request = indexedDB.open(site);

    request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(subspace, 'readwrite');
        const store = transaction.objectStore(subspace);

        const getRequest = store.get('token');

        getRequest.onsuccess = function() {
        const data = getRequest.result;
        data.value = newToken;
        store.put(newToken, 'token');
        };
    };

    request.onerror = function(e) {
        console.error('DB error:', e.target.error);
    };
}

const rotursdk_sites = ["https://beam.rotur.dev", "https://place.rotur.dev", "https://devfund.rotur.dev", "https://photos.rotur.dev", "https://mail.rotur.dev",
                      "https://rotur.dev", "https://pounce.rotur.dev", "https://gifs.originchats.com", "https://sable.rotur.dev", "http://localhost:5173"] // All these sites share the exact same method of storing your token, so to optimize code, I put them in an array

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    const url = window.location.href
    if (message.action === "switchacc") {
        if (!message.data) {
            console.error('To prevent risking corrupting login information, this action has been aborted.')
            sendResponse({ result: "Action aborted" });
            return;
        }
        if (!url) {
            console.error('To prevent risking corrupting login information, this action has been aborted.')
            sendResponse({ result: "Action aborted" });
            return;
        }
        if (url.startsWith('https://originchats.mistium.com/app') || url.startsWith('https://originchats.com/app')) {
            localStorage.setItem('originchats_token', message.data)
            updateToken('originchats', 'session', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://graphite.flufi.uk')) {
            updateToken('graphite', 'data', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://music.flufi.uk')) {
            updateToken('flufi-music', 'data', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://origin.mistium.com')) {
            localStorage.setItem('origin_login', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://rotur.dev/key-manager')) {
            localStorage.setItem('rotur_token', message.data)
            localStorage.setItem('authToken', message.data)
            localStorage.setItem('rotur_username', message.datauser)
            localStorage.setItem('username', message.datauser.toLowerCase())
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://rotur.dev/inventory-manager')) {
            localStorage.setItem('rotur_token', message.data)
            localStorage.setItem('authToken', message.data)
            localStorage.setItem('rotur_username', message.datauser)
            localStorage.setItem('username', message.datauser.toLowerCase())
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://mobile.rotur.dev')) {
            localStorage.setItem('rotur_auth_token', message.data)
            localStorage.setItem('rotur_username', message.datauser)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://git.rotur.dev')) {
            window.location.href = `https://git.rotur.dev/user/rotur/callback?token=${message.data}`
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://apps.rotur.dev')) {
            window.location.href = `https://apps.rotur.dev/auth?token=${message.data}`
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://gate.rotur.dev')) {
            window.location.href = `https://gate.rotur.dev/auth?token=${message.data}`
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://warptheme.mistium.com')) {
            window.location.href = `https://warptheme.mistium.com/auth?token=${message.data}`
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://authenticator.rotur.dev')) {
            window.location.href = `https://authenticator.rotur.dev/auth?token=${message.data}`
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://notes.rotur.dev')) {
            window.location.href = `https://notes.rotur.dev/auth?token=${message.data}`
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://connect.rotur.dev')) {
            localStorage.setItem('rotur_connect_token', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://warpdrive.team')) {
            localStorage.setItem('rotur_token', message.data)
            localStorage.setItem('warpdrive_rotur_token', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://warp.mistium.com')) {
            localStorage.removeItem('mw:mistwarp-session')
            localStorage.setItem('mw:rotur-token', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://runnova.github.io/orion') || url.startsWith('https://adthoughtsglobal.github.io/Orla')) {
            localStorage.setItem('orion-rotur', JSON.stringify({"type":"token", "token":message.data}))
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://runnova.github.io/indigo')) {
            localStorage.setItem('settings', JSON.stringify({"type":"token", "token":message.data}))
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (url.startsWith('https://antiviiris.github.io/originChats') || url.startsWith('https://chat.0stormy.xyz')) {
            localStorage.setItem('rotur_auth_token', message.data)
            localStorage.removeItem('validator')
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
        if (rotursdk_sites.some(item => (url.startsWith(item)))){
            localStorage.setItem('rotur_token', message.data)
            window.location.reload()
            sendResponse({ result: "done" });
            return;
        }
    }
});