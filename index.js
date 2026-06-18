const parser = new DOMParser();

const config = {
    elements: ['div', 'p', 'h1', 'button'],
    attributes: ['id', 'class']
}
const sanitizer = new Sanitizer(config)

const default_app_settings =
{
    rows: 3,
    utils: true,
    social: true,
    misc: true
}

const settings = await new Promise(resolve =>
        chrome.storage.local.get('settings', data => resolve(data.settings?.padEnd(8, "0") || "00000000"))
) ?? "00000000";

const app_settings = await new Promise(resolve =>
    chrome.storage.local.get('app_settings', data => resolve(data.app_settings || default_app_settings))
) ?? default_app_settings;

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'Enter'];
let cursor = 0;

// Functions used in multiple places

export function sanitize(input) {
    return input.replace(/[<>&'"/()=]/g, char => {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            case '/': return '&sol;';
            case '(': return '&lpar;';
            case ')': return '&rpar;';
            case '=': return '&equals;';
        }
    });
}; // Prevents HTML formatting from showing up in unwanted places and also decreases the chance of XSS (or SQL injection, though idk if that's a possible issue since this extension does not rely on an SQL database of its own)
export function fillspace(input) {
    return input.replaceAll(' ', '&MediumSpace;') // Better handling of HTML objects that use IDs based on characters with strings in them
}

function ConvertToAMPM(time) {
    const timearray = time.split(':')
    let timestamp = parseInt(timearray[0])
    let suffix = "AM"
    if (timestamp > 11) {
        timestamp -= 12
        suffix = "PM"
    }
    if (timestamp == 0) {
        timestamp = 12
    }
    timearray[0] = timestamp
    return (timearray.join(':') + ` ${suffix}`)
}

export function formatDate(input) {
    let date = new Date(input)
    date = date.toString().split(' ')
    let finaldate = date[0] + ', ' + date[1] + ' ' + date[2] + ', ' + date[3] + ' at ' + (settings[4] == "0" ? ConvertToAMPM(date[4]) : date[4])
    return finaldate;
}

export function parseHTML(string) {
    const prototype = parser.parseFromString(string, 'text/html')
    const final = prototype.body.children
    return final;
} // To satisfy Mozilla's security requirements (it didn't like variables inside innerHTML arguments)

// Success, warning, and error pop-ups

export function openErrorPopup(error) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Error</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">${sanitize(error)}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `, {sanitizer: sanitizer})
}
export function openSuccessPopup(msg) {
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
export function openWarningPopup(warning) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Warning</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="popupdialogue">${sanitize(warning)}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `, {sanitizer: sanitizer})
}
export function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

export function MiniError(type, dialogue) {
    const p = document.createElement('p')
    p.innerText = dialogue
    p.className = type
    return p;
} // Replacement for using innerHTML for all the non-popup errors

export function CreateEmptyPlaceholder(value, noli) {
    const li = document.createElement('li')
    const h2 = document.createElement('h2')
    h2.textContent = value
    li.appendChild(h2)
    return noli ? h2 : li;
}

export function FixDecimal(input) {
    if (Math.floor(input) === input) {
        return input;
    }
    return ((String(input).split(".")[1].length || 0) > 2) ? (input).toFixed(2) : (input) // Get around JS sometimes elongating decimals (example: 0.2 + 0.1 = 0.300000004 instead of 0.3)
}

export function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function UploadImage(imagedata) {
    const preferredcdn = await new Promise(resolve =>
        chrome.storage.local.get('preferredcdn', data => resolve(data.preferredcdn || "roturcdn"))
    ) ?? "roturcdn";
    const activeacc = await new Promise(resolve =>
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
    ) ?? {};

    let potentialattachment = ''
    try {
        switch (preferredcdn) {
            case (undefined): // Failsafe
            case ('roturcdn'): {
                const response = await fetch('https://roturcdn.milosantos.com/api/image/upload?public=true', {
                    method: 'POST',
                    body: imagedata
                }).then(res => res.json()).catch((err) => {
                    return;
                });
                if (!response) {
                    return;
                }
                potentialattachment = `https://roturcdn.milosantos.com/${response.id}`;
                if (potentialattachment.includes('undefined')) {
                    return;
                }
                break;
            }
            case ('fluficdn'): {
                const response = await fetch('https://cdn.flufi.uk/api/image/upload?public=true', {
                    method: 'POST',
                    body: imagedata
                }).then(res => res.json()).catch((err) => {
                    return;
                });
                if (!response) {
                    return;
                }
                potentialattachment = `https://cdn.flufi.uk/${response.id}`;
                if (potentialattachment.includes('undefined')) {
                    return;
                }                
                break;
            }
            case ('mistiums3'): {
                const randkey = `RA_${Date.now()}`
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${activeacc.token}&key=originChats-${randkey}`).then(res => res.json())
                const json = {
                    validator: validator.validator,
                    validator_key: `originChats-${randkey}`,
                    file: imagedata,
                    name: `RA_image.${imagedata.type.split('/')[1]}`,
                    mime_type: imagedata.type,
                    channel: 'bots'
                };
                const formData = new FormData();

                for (const key in json) {
                    formData.append(key, json[key]);
                }
                const image = await fetch(`https://chats.mistium.com/attachments/upload`, {method: 'POST', body: formData}).then(res => res.json()).catch((err) => {
                    return;
                });
                if (!image || image.error) {
                    return;                    
                } else {
                    potentialattachment = image.attachment.url
                }                     
                break;
            }
            /* Temporarily deprecated since Rotur Photos changed its API to be a lot more locked-down; Thankfully, this happened before 1.2 made it to production.

            case ('roturphotos'): {
                const headers = {
                    "Accept": "* / *",
                    "Content-Type": imagedata.type,
                    "Cookie": ''
                }
                const validator = await fetch(`https://api.rotur.dev/generate_validator?auth=${activeacc.token}&key=rotur-photos`).then(res => res.json()).then(res => res.validator)
                const response = await fetch(`https://photos.rotur.dev/api/image/upload?public=true`, {
                    method: 'POST',
                    body: imagedata,
                    headers: validator
                }).then(res => res.json()).catch((err) => {
                    return;
                });
                if (!response) {
                    return;
                }
                potentialattachment = `https://photos.rotur.dev/${activeacc.uuid}/${response.id}`;
                if (potentialattachment.includes('undefined')) {
                    return;
                }                
                break;
            }
            */
        }
        return potentialattachment;
    } catch (err) {
        console.error(err)
        return null;
    }
}

chrome.storage.session.remove('acceptinprogress')

if (!navigator.onLine) {
    const isOffline = await new Promise(resolve =>
        chrome.storage.session.get('isOffline', data => resolve(data.isOffline || false))
    ) ?? false;
    if (!isOffline) {
        openWarningPopup('You do not have an internet connection. Some parts of Rotur Assistant may not work properly without a proper connection.')
        chrome.storage.session.set({isOffline: true})
    }
} else {
    chrome.storage.session.remove('isOffline')
}

switch (app_settings.rows) {
    case (2): {
        Array.from(document.getElementsByClassName('appgridbtn')).forEach(app => {
            app.style = "flex: 1 1 150px; max-width: 150px; min-width: 150px; height: 150px; font-size: 14px;"
            app.querySelector('img').width = 100
            app.querySelector('img').height = 100
            app.querySelector('img').style = 'max-width: 150px; max-height: 150px;'
        })
        break;
    }
    case (3): {
        break;
    }
    case (4): {
        Array.from(document.getElementsByClassName('appgridbtn')).forEach(app => {
            app.style = "flex: 1 1 70px; max-width: 70px; min-width: 70px; height: 80px; font-size: 10px;"
            app.querySelector('img').width = 55
            app.querySelector('img').height = 55
        })
        break;
    }
}

if (!app_settings.utils) {
    Array.from(document.querySelectorAll('[data-category="util"]')).forEach(app => {
        app.style.display = 'none'
    })
}
if (!app_settings.social) {
    Array.from(document.querySelectorAll('[data-category="social"]')).forEach(app => {
        app.style.display = 'none'
    })
}
if (!app_settings.misc) {
        Array.from(document.querySelectorAll('[data-category="misc"]')).forEach(app => {
        app.style.display = 'none'
    })
}

document.addEventListener('click', function(e) {
    if (e.target.className == 'appgridbtn') {
        window.location.href = `/pages/${e.target.id}.html`
    }
    if (e.target.className == 'closebtn') {
        closePopup()
    }
})

document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[cursor]) {
        cursor++;
        if (cursor === konamiCode.length) {
            if (window.location.href.includes('index.html')) {
                window.location.href = "/pages/vip_lounge.html"
            }
            cursor = 0;
        }
    } else {
        cursor = 0;
    }
});

chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] }, async (contexts) => {
    if (contexts && contexts.length > 0) {
        let ui_mode = await new Promise(resolve =>
            chrome.storage.local.get('ui_mode', data => resolve(data.ui_mode || "popup"))
        ) ?? "popup";
        if (ui_mode == 'popup') {
            ui_mode = 'sidebar'
            chrome.storage.local.set({ui_mode: ui_mode})
            await chrome.action.setPopup({ popup: 'index.html' });
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
        }
    }
}); // Failsafe in case Rotur Assistant is opened as a side panel via Chrome's right-click context menu