const indexconfig = {
    elements: ['div', 'p', 'h1', 'button'],
    attributes: ['id', 'class']
}
const indexsanitizer = new Sanitizer(indexconfig)

const settings = await new Promise(resolve =>
        chrome.storage.local.get('settings', data => resolve(data.settings?.padEnd(16, "0") || "0000000000000000"))
) ?? "0000000000000000";

// Functions used in multiple places

export function sanitize(input) {
    if (typeof input != 'string') {
        return input;
    }
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
    try {
        let date = new Date(input)
        date = date.toString().split(' ')
        let finaldate = date[0] + ', ' + date[1] + ' ' + date[2] + ', ' + date[3] + ' at ' + (settings[4] == "0" ? ConvertToAMPM(date[4]) : date[4])
        return finaldate;
    } catch (err) {
        return "Unknown Date"
    }
}

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
    `, {sanitizer: indexsanitizer})
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
    `, {sanitizer: indexsanitizer})
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
    `, {sanitizer: indexsanitizer})
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
    try {
        if ((typeof input) == 'string') {
            return input;
        }
        if (Math.floor(input) === input) {
            return input;
        }
        return ((String(input).split(".")[1].length || 0) > 2) ? (input).toFixed(2) : (input) // Get around JS sometimes elongating decimals (example: 0.2 + 0.1 = 0.300000004 instead of 0.3)
    } catch {
        return input;
    }
}

export function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function UploadImage(imagedata, cdnoverride, rawdata) {
    const preferredcdn = await new Promise(resolve =>
        chrome.storage.local.get('preferredcdn', data => resolve(data.preferredcdn || "roturcdn"))
    ) ?? "roturcdn";
    const activeacc = await new Promise(resolve =>
        chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
    ) ?? {};
    const authform = new FormData()
    if (activeacc.uuid) {
        authform.append("Authorization", `Bearer ${activeacc.token}`)
    }
    let potentialattachment = ''
    try {
        switch (cdnoverride ?? preferredcdn) {
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
                const validator = await fetch(`https://api.rotur.dev/generate_validator?key=originChats-${randkey}`, {headers: authform}).then(res => res.json())
                const json = {
                    validator: validator.validator,
                    validator_key: `originChats-${randkey}`,
                    file: imagedata,
                    name: imagedata.name,
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
                    potentialattachment = rawdata ? image.attachment : image.attachment.url
                }                     
                break;
            }
            case ('ochost'): {
                const validator = await fetch(`https://api.rotur.dev/generate_validator?key=RoturAssistantImage`, {headers: authform}).then(res => res.json())
                const json = {
                    validator: validator.validator,
                    validator_key: `RoturAssistantImage`,
                    file: imagedata,
                    name: imagedata.name,
                    mime_type: imagedata.type,
                };
                const formData = new FormData();

                for (const key in json) {
                    formData.append(key, json[key]);
                }
                const image = await fetch(`https://cdn.ochost.tech/attachments/upload`, {method: 'POST', body: formData}).then(res => res.json()).catch((err) => {
                    return;
                });
                if (!image || image.error) {
                    return;                    
                } else {
                    potentialattachment = rawdata ? image.attachment : image.attachment.url
                }                     
                break;
            }
        }
        return potentialattachment;
    } catch (err) {
        console.error(err)
        return null;
    }
}

async function HomePage() {
    const default_app_settings =
    {
        size: 2,
        utils: true,
        social: true,
        misc: true
    }

    const app_settings = await new Promise(resolve =>
        chrome.storage.local.get('app_settings', data => resolve(data.app_settings || default_app_settings))
    ) ?? default_app_settings;

    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'Enter'];
    let cursor = 0;

    chrome.storage.session.remove('acceptinprogress')

    if (!navigator.onLine) {
        const isOffline = await new Promise(resolve =>
            chrome.storage.session.get('isOffline', data => resolve(data.isOffline || false))
        ) ?? false;
        if (!isOffline) {
            if (window.location.href.includes('index.html')) {
                openWarningPopup('You do not have an internet connection. Some parts of Rotur Assistant may not work properly without a proper connection.')
            }
            chrome.storage.session.set({isOffline: true})
        }
    } else {
        chrome.storage.session.remove('isOffline')
    }

    switch (app_settings.size ?? 2) {
        case (1): {
            Array.from(document.getElementsByClassName('appgridbtn')).forEach(app => {
                app.style = "flex: 1 1 70px; max-width: 70px; min-width: 70px; height: 80px; font-size: 10px;"
                app.querySelector('img').width = 55
                app.querySelector('img').height = 55
            })
            break;
        }
        case (2): {
            break;
        }
        case (3): {
            Array.from(document.getElementsByClassName('appgridbtn')).forEach(app => {
                app.style = "flex: 1 1 150px; max-width: 150px; min-width: 150px; height: 150px; font-size: 14px;"
                app.querySelector('img').width = 100
                app.querySelector('img').height = 100
                app.querySelector('img').style = 'max-width: 150px; max-height: 150px;'
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
            if (ui_mode != 'sidebar') {
                await chrome.action.setPopup({ popup: '' });
                await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
                if (ui_mode == 'sidebar') {
                    await chrome.action.setPopup({ popup: '' });
                    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
                    await chrome.sidePanel.setOptions({ enabled: true });
                } else if (ui_mode == 'popup') {
                    await chrome.action.setPopup({ popup: 'index.html' });
                    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
                }
            }
        }
    }); // Failsafe in case Rotur Assistant is opened as a side panel via Chrome's right-click context menu, overriding the user's settings inside the extension.
}

if (window.location.href.includes('index.html')) {
    HomePage() // Less overhead and stuff running in the background since index also runs on every page, not just the home page
}