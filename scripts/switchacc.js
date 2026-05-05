console.log('[Rotur Assistant] Rotur account switcher active') // This has to exist or else the switcher won't work

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

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "switchacc") {
    if (!message.data) {
        console.error('To prevent risking corrupting login information, this action has been aborted.')
        sendResponse({ result: "Action aborted" });
        return;
    }
    const url = window.location.href
    if (url.includes('https://originchats.mistium.com')) {
        localStorage.setItem('originchats_token', message.data)
        updateToken('originchats', 'session', message.data)
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://graphite.flufi.uk')) {
        updateToken('graphite', 'data', message.data)
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://origin.mistium.com')) {
        localStorage.setItem('origin_login', message.data)
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://rotur.dev/me')) {
        localStorage.setItem('rotur_token', message.data)
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://rotur.dev/key-manager')) {
        localStorage.setItem('rotur_token', message.data)
        localStorage.setItem('authToken', message.data)
        localStorage.setItem('rotur_username', message.datauser)
        localStorage.setItem('username', message.datauser.toLowerCase())
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }

    if (url.includes('https://rotur.dev/inventory-manager')) {
        localStorage.setItem('rotur_token', message.data)
        localStorage.setItem('authToken', message.data)
        localStorage.setItem('rotur_username', message.datauser)
        localStorage.setItem('username', message.datauser.toLowerCase())
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }

    if (url.includes('https://mobile.rotur.dev')) {
        localStorage.setItem('rotur_auth_token', message.data)
        localStorage.setItem('rotur_username', message.datauser)
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }

    if (url.includes('https://apps.rotur.dev')) {
        window.location.href = `https://apps.rotur.dev/auth?token=${message.data}`
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://devfund.rotur.dev')) {
        window.location.href = `https://devfund.rotur.dev/auth?token=${message.data}`
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://warptheme.mistium.com')) {
        window.location.href = `https://warptheme.mistium.com/auth?token=${message.data}`
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://notes.rotur.dev')) {
        window.location.href = `https://notes.rotur.dev/auth?token=${message.data}`
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://photos.rotur.dev')) {
        window.location.href = `https://photos.rotur.dev/auth?token=${message.data}`
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://warpdrive.team')) {
        localStorage.setItem('rotur_token', message.data)
        localStorage.setItem('warpdrive_rotur_token', message.data)
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://runnova.github.io/orion')) {
        localStorage.setItem('orion-rotur', JSON.stringify({"type":"token", "token":message.data}))
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://adthoughtsglobal.github.io/Orla')) {
        localStorage.setItem('orion-rotur', JSON.stringify({"type":"token", "token":message.data}))
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
    if (url.includes('https://antiviiris.github.io/originChats')) {
        localStorage.setItem('rotur_auth_token', message.data)
        localStorage.removeItem('validator')
        window.location.reload()
        sendResponse({ result: "done" });
        return;
    }
  }
});