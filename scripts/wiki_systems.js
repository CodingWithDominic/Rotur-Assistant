import { parseHTML } from "../index.js";

const activeacc = await new Promise(resolve =>
    chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
) ?? [];

if (!activeacc.uuid) {
    Array.from(document.getElementsByClassName('systemswitch')).forEach(btn => {
        btn.style.display = 'none'
    })
}

function openSystemPopup(system_name, owner) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Confirm New System</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Change your system to ${system_name}? This will give the owner of the system, <img src='https://avatars.rotur.dev/${owner}' width=16 height=16> ${owner}, elevated permissions over your Rotur account, including the ability to ban or delete your Rotur account. Do note that Mistium, being the owner of Rotur, has elevated permissions over all Rotur accounts, regardless of system. On top of that, each time you claim a daily credit, the system owner will get 0.25 credits. Only proceed with this action if you trust the system's owner.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalsystemconfirm" data-keyname='system' data-finalsystem='${system_name}'>Confirm</button>
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

document.addEventListener('click', async function(e) {
    if (e.target.className == 'closebtn') {
        closePopup();
        return;
    }
    if (e.target.className == 'systemswitch') {
        openSystemPopup(e.target.dataset.sys, e.target.dataset.sysowner)
    }
    if (e.target.className == 'finalsystemconfirm') {
        const system = e.target.dataset.finalsystem
        const keyupdate = await fetch(`https://api.rotur.dev/users`,
        {method: 'PATCH', body: JSON.stringify({auth: activeacc.token, key: 'system', value: system})}).then(res => res.json())
        if (keyupdate.error) {
            openErrorPopup('There was an issue updating your system.')
        } else {
            openSuccessPopup(`Your system has been successfully updated to ${system}!`)
        }
    }
})