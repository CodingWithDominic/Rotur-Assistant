import { parseHTML, sanitize, openSuccessPopup, openErrorPopup, MiniError, CreateEmptyPlaceholder, openWarningPopup } from "../index.js";

const themedata = {
    oceanblue: ["#0F0052", "#004DB1", "#00002B", "#0012B4", "#4F46E5", "#4338CA", "#03009C"],
    forestgreen: ["#0A3100", "#00b83d", "#271e00", "#058a00", "#7c5500", "rgb(187, 106, 0)", "#006b17"],
    orange: ["#6d4100", "#7c280f", "#cf3000", "#741b00", "#FF4C4B", "#df2727", "#df795a"],
    blurple: ["#200044", "#35008b", "#28004e", "#4500b4", "#4918cf", "#4a00d4", "#2f009c"],
    discord: ["#323339", "#7D7E87", "#323339", "#2C2D32", "#5865F2", "#4452BB", "#393A41"],
    midnight: ["#000000", "#4d4d4d", "#242425", "#2e2e2e", "#5a5a5a", "#494949", "#3b3b3b"],
    blackout: ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"] // The "F... it, we ball" version of the midnight theme
}

function openConfirmOverwriteNotePopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Overwrite Note</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">You already have a note for ${user}. Would you like to overwrite the pre-existing note with the new note?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalnoteoverwrite" data-user="${user}">Yes</button>
        </div>
    `))
}

function openConfirmClearNotePopup(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Clear Note</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Are you sure you want to clear the note you have for this user?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalnoteclear" data-user='${user}'>Yes</button>
        </div>
    `))
}

function openConfirmClearNotePopup2(user) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Clear Note</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">You don't have anything typed in the box. Do you want to instead clear the note you have for this user?</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">No</button>
            <button class="finalnoteclear" data-user='${user}' data-origin='clearoverwrite'>Yes</button>
        </div>
    `))
}

function openConfirmClearCachePopup() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Clear Cache</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">Clear any cached data Rotur Assistant may have? Rotur Assistant caches some stuff in order to improve user experience and reduce overall load on the Rotur API.</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button id="finalcacheclear">Clear Cache</button>
        </div>
    `))
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function replaceCharAtIdx(string, index, newchar) {
    let strArray = string.split('');
    strArray[index] = newchar;
    let newStr = strArray.join('');
    return newStr;
}

const default_app_settings =
{
    rows: 3,
    utils: true,
    social: true,
    misc: true
}

const themevarnames = ["--bg-color", "--scrollbar-bar", "--scrollbar-bg", "--headerandfooter", "--button", "--buttonhover", "--popupbg"]
const currenttheme = await new Promise(resolve =>
    chrome.storage.local.get('theme', data => resolve(data.theme || "oceanblue"))
    ) ?? "oceanblue";

let settings = await new Promise(resolve =>
    chrome.storage.local.get('settings', data => resolve(data.settings || "00000000"))
    ) ?? "00000000";

let display_mode = await new Promise(resolve =>
    chrome.storage.local.get('ui_mode', data => resolve(data.ui_mode || "popup"))
    ) ?? "popup";

let preferredcdn = await new Promise(resolve =>
    chrome.storage.local.get('preferredcdn', data => resolve(data.preferredcdn || "roturcdn"))
    ) ?? "roturcdn";

let app_settings = await new Promise(resolve =>
    chrome.storage.local.get('app_settings', data => resolve(data.app_settings || default_app_settings))
    ) ?? default_app_settings;

document.getElementById('roturphotoswarning').style.display = (preferredcdn == 'roturphotos') ? 'block' : 'none'
document.getElementById('fluficdnwarning').style.display = (preferredcdn == 'fluficdn') ? 'block' : 'none'

document.getElementsByName('cdnoption').forEach(option => {
    if (option.value == preferredcdn) {
        option.selected = true;
    }
})

document.getElementById('showutils').checked = app_settings.utils
document.getElementById('showsocial').checked = app_settings.social
document.getElementById('showmisc').checked = app_settings.misc
document.getElementById('approwinput').value = app_settings.rows
document.getElementById('approwlabel').textContent = app_settings.rows

const setting_ids = ['renderoverlays', 'renderoverlaysglobal', 'anchorheader', 'anchorfooter', '24h', 'circular', 'showstatusicons']
for (let i=0; i<setting_ids.length; i++) {
    const setting = setting_ids[i]
    document.getElementById(setting).checked = (settings[i] == "1")
}

async function updateTheme() {
    const theme = await new Promise(resolve =>
    chrome.storage.local.get('theme', data => resolve(data.theme || "oceanblue"))
    ) ?? "oceanblue";
    const newtheme = themedata[theme]
    const cssvars = document.documentElement.style
    for (let i=0; i<themevarnames.length; i++) {
        cssvars.setProperty(themevarnames[i], newtheme[i])
    }
}

Array.from(document.getElementsByName('themeselect')).forEach(theme => {
    if (theme.value == currenttheme) {
        theme.checked = true;
    }
})

Array.from(document.getElementsByName('ra_displayoption')).forEach(mode => {
    if (mode.value == display_mode) {
        mode.checked = true;
    }
})

function checkanchor() {
    if (settings[2] == '1') {
        document.getElementsByClassName('container')[0].style = ('margin-top: 40px;' + (settings[3] == '1' ? ' padding-bottom: 105px;' : ''))
        document.getElementById('header-placeholder').style = 'position: fixed; z-index: 99999;'
    } else {
        document.getElementById('header-placeholder').style = 'position: relative;'
        document.getElementsByClassName('container')[0].style = (settings[3] == '1' ? ' margin-bottom: 90px;' : '')
    }
    if (settings[3] == '1') {
        document.getElementsByClassName('container')[0].style = ('padding-bottom: 105px;' + (settings[2] == '1' ? ' margin-top: 40px;' : ''))
        document.getElementById('footer-placeholder').style = 'position: fixed; bottom: 0; z-index: 89999;'
    } else {
        document.getElementById('footer-placeholder').style = 'position: relative;'
        document.getElementsByClassName('container')[0].style = (settings[2] == '1' ? ' margin-top: 40px;' : '')
    }
}

async function getNotes() {
    const notes1 = await new Promise(resolve =>
        chrome.storage.sync.get('notes1', data => resolve(data.notes1 || {}))
    ) ?? {};
    const notes2 = await new Promise(resolve =>
        chrome.storage.sync.get('notes2', data => resolve(data.notes2 || {}))
    ) ?? {};
    const notes3 = await new Promise(resolve =>
        chrome.storage.sync.get('notes3', data => resolve(data.notes3 || {}))
    ) ?? {};
    const notes4 = await new Promise(resolve =>
        chrome.storage.sync.get('notes4', data => resolve(data.notes4 || {}))
    ) ?? {};
    const notes5 = await new Promise(resolve =>
        chrome.storage.sync.get('notes5', data => resolve(data.notes5 || {}))
    ) ?? {};
    return ({...notes1, ...notes2, ...notes3, ...notes4, ...notes5})
}

async function setNotes(notesobject) {
    const notes1 = Object.fromEntries(Object.entries(notesobject).slice(0, 20)) ?? {};
    const notes2 = Object.fromEntries(Object.entries(notesobject).slice(20, 40)) ?? {};
    const notes3 = Object.fromEntries(Object.entries(notesobject).slice(40, 60)) ?? {};
    const notes4 = Object.fromEntries(Object.entries(notesobject).slice(60, 80)) ?? {};
    const notes5 = Object.fromEntries(Object.entries(notesobject).slice(80, 100)) ?? {};
    chrome.storage.sync.set({notes1: notes1})
    chrome.storage.sync.set({notes2: notes2})
    chrome.storage.sync.set({notes3: notes3})
    chrome.storage.sync.set({notes4: notes4})
    chrome.storage.sync.set({notes5: notes5})
}

const notes = await getNotes()

function CreateNoteElement(user) {
    const notecard = document.getElementById('notecardtemplate').content.cloneNode(true)
    notecard.querySelector('li').id = `notepanel-${user.replaceAll(' ', '~')}`
    notecard.querySelectorAll('[data-user]').forEach(elem => {
        elem.dataset.user = user
    })
    notecard.querySelector('img').src = `https://avatars.rotur.dev/${user}`
    notecard.querySelector('img').alt = user
    notecard.querySelector('h3').textContent = user
    if (user.length > 13) {
        notecard.querySelector('h3').style = `font-size: ${30 - user.length}px;`
    }
    notecard.querySelector('textarea').value = (notes[user] ?? '')
    notecard.querySelector('textarea').id = `noteman-${user.replaceAll(' ', '~')}`
    notecard.querySelector('.notemancharlimit').textContent = `${(notes[user] ?? '').length}/300`
    notecard.querySelector('.notemancharlimit').id = `limit-${user.replaceAll(' ', '~')}`
    return notecard;
}

function updateNotes() {
    const note_users = Object.keys(notes)
    const notelist = document.getElementById('usernotelist')
    if (note_users.length == 0) {
        notelist.replaceChildren(CreateEmptyPlaceholder("You haven't created any notes yet!"))
        notelist.style = 'border: none;'
    } else {
        const notes_html = []
        note_users.forEach(user => {
            notes_html.push(CreateNoteElement(user))
        })

        notelist.replaceChildren(...notes_html)
        notelist.style = 'border: 1px solid white;'
    }
}

updateNotes()

document.getElementById('gensettings').addEventListener('click', async function(e) {
    if (e.target.id == 'anchorheader') {
        settings = replaceCharAtIdx(settings, 2, (e.target.checked ? '1' : '0'))
        checkanchor()
        chrome.storage.local.set({settings: settings})
    }
    if (e.target.id == 'renderoverlays') {
        settings = replaceCharAtIdx(settings, 0, (e.target.checked ? '1' : '0'))
        chrome.storage.local.set({settings: settings})
    }
    if (e.target.id == 'anchorfooter') {
        settings = replaceCharAtIdx(settings, 3, (e.target.checked ? '1' : '0'))
        checkanchor()
        chrome.storage.local.set({settings: settings})
    }
    if (e.target.id == '24h') {
        settings = replaceCharAtIdx(settings, 4, (e.target.checked ? '1' : '0'))
        chrome.storage.local.set({settings: settings})
    }
    if (e.target.id == 'circular') {
        settings = replaceCharAtIdx(settings, 5, (e.target.checked ? '1' : '0'))
        chrome.storage.local.set({settings: settings})
    }
    if (e.target.id == 'showstatusicons') {
        settings = replaceCharAtIdx(settings, 6, (e.target.checked ? '1' : '0'))
        chrome.storage.local.set({settings: settings})
    }
    if (e.target.id == 'renderoverlaysglobal') {
        if (e.target.checked) {
            settings = replaceCharAtIdx(settings, 1, '1')
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [123], 
                addRules: [{
                    id: 123,
                    priority: 1,
                    action: { type: "block" },
                    condition: {
                        urlFilter: `|https://avatars.rotur.dev/.overlay/*`,
                        resourceTypes: ["image"]
                    }
                }]
            });
        } else {
            settings = replaceCharAtIdx(settings, 1, '0')
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [123]
            });
        }
        chrome.storage.local.set({settings: settings})
        return;
    }
    if (e.target.id == 'showutils') {
        app_settings.utils = e.target.checked
        chrome.storage.local.set({app_settings: app_settings})
        return;
    }
    if (e.target.id == 'showsocial') {
        app_settings.social = e.target.checked
        chrome.storage.local.set({app_settings: app_settings})
        return;
    }
    if (e.target.id == 'showmisc') {
        app_settings.misc = e.target.checked
        chrome.storage.local.set({app_settings: app_settings})
        return;
    }
    if (e.target.id == 'clearcache') {
        openConfirmClearCachePopup()
        return;
    }
})

document.getElementById('themepicker').addEventListener('change', async function(e) {
    await chrome.storage.local.set({theme: e.target.value})
    updateTheme()
})

document.addEventListener('click', async function(e) {
    if (e.target.className == 'closebtn') {
        closePopup()
    }
    if (e.target.className == 'tab') {
        Array.from(document.getElementsByClassName('tab')).forEach(tab => {
            tab.style = 'border-bottom: none;'
        })
        e.target.style = 'border-bottom: 2px solid white;'
        document.getElementById('gensettings').style.display = (e.target.id == 'settingsgentab') ? 'flex' : 'none'
        document.getElementById('themessect').style.display = (e.target.id == 'settingsthemetab') ? 'block' : 'none'
        document.getElementById('notemanager').style.display = (e.target.id == 'settingsnotestab') ? 'block' : 'none'
        return;
    }
    if (e.target.className == 'notemanuserbar') {
        this.location.href = `/pages/lookup.html?user=${e.target.dataset.user}`
    }
    if (e.target.className == 'notemansavebtn') {
        if (document.getElementById(`noteman-${e.target.dataset.user.replaceAll(' ', '~')}`).value == '') {
            openConfirmClearNotePopup(e.target.dataset.user)
        } else if (document.getElementById(`noteman-${e.target.dataset.user.replaceAll(' ', '~')}`).value.length > 300) {
            openErrorPopup('Your note is too long')
        } else {
            notes[e.target.dataset.user] = document.getElementById(`noteman-${e.target.dataset.user.replaceAll(' ', '~')}`).value.replaceAll(`'`, `\'`)
            setNotes(notes)
            openSuccessPopup(`Note for ${e.target.dataset.user} was saved successfully!`)
        }
    }
    if (e.target.className == 'notemandelbtn') {
        openConfirmClearNotePopup(e.target.dataset.user)
    }
    if (e.target.className == 'finalnoteclear') {
        if (e.target.dataset.origin == 'clearoverwrite') {
            document.getElementById('createusernoteuser').value = ''
            document.getElementById('createusernotenote').value = ''
            document.getElementById(`createnotecharlimit`).value = '0/300'
        }
        closePopup()
        delete notes[e.target.dataset.user]
        setNotes(notes)
        document.getElementById(`notepanel-${e.target.dataset.user.replaceAll(' ', '~')}`).remove()
        const notelist = document.getElementById('usernotelist')
        if (notelist.childElementCount == 0) {
            notelist.replaceChildren(CreateEmptyPlaceholder("You haven't created any notes yet!"))
        }
        return;
    }
    if (e.target.className == 'finalnoteoverwrite') {
        closePopup()
        const user = document.getElementById('createusernoteuser').value
        const note = document.getElementById('createusernotenote').value
        if (note == '') {
            openConfirmClearNotePopup2(user)
        } else {
            notes[user] = note.replaceAll(`'`, `\'`)
            setNotes(notes)
            document.getElementById(`noteman-${user.replaceAll(' ', '~')}`).value = note
            document.getElementById(`limit-${user.replaceAll(' ', '~')}`).textContent = `${note.length}/300`
        }
        document.getElementById('createnotestatusplaceholder').replaceChildren(MiniError('success', `Note for ${user} was overwritten successfully!`))
        document.getElementById('createusernoteuser').value = ''
        document.getElementById('createusernotenote').value = ''
        document.getElementById(`createnotecharlimit`).value = '0/300'
        setTimeout(function() { document.getElementById('createnotestatusplaceholder').replaceChildren() }, 10000)
        return;
    }
    if (e.target.id == 'createnotebtn') {
        const target = e.target
        target.disabled = true
        target.textContent = "Creating..."
        let user = document.getElementById('createusernoteuser').value
        const userexists = await fetch(`https://api.rotur.dev/profile?name=${user}&include_posts=no`).then(res => res.json()).catch(err => {
            return {error: "Communcation Error"}
        })
        user = userexists.username ?? ''
        const note = document.getElementById('createusernotenote').value
        if (userexists.error) {
            document.getElementById('createnotestatusplaceholder').replaceChildren(MiniError('failure', `${userexists.error == "Communication Error" ? `A communication error has occurred.` : `This user does not exist`}`))
        } else if (note.length > 300) {
            document.getElementById('createnotestatusplaceholder').replaceChildren(MiniError('failure', "Your note is too long"))
        } else if (Object.keys(notes).some(item => item.toLowerCase() == user.toLowerCase())) {
            openConfirmOverwriteNotePopup(user)
        } else if (Object.keys(notes).length > 99) {
            openErrorPopup('Due to Google limitations, you can only save notes on up to 100 users.')
        } else {
            notes[user] = note.replaceAll(`'`, `\'`)
            setNotes(notes)
            document.getElementById('usernotelist').appendChild(CreateNoteElement(user))
            document.getElementById('createnotestatusplaceholder').replaceChildren(MiniError('success', `Note for ${user} was created successfully!`))
            document.getElementById('createusernoteuser').value = ''
            document.getElementById('createusernotenote').value = ''
            document.getElementById(`createnotecharlimit`).textContent = '0/300'
        }
        target.disabled = false
        target.textContent = "+ Create Note"
        
        setTimeout(function() { document.getElementById('createnotestatusplaceholder').replaceChildren() }, 10000)
        return;
    }
    if (e.target.id == 'finalcacheclear') {
        closePopup()
        chrome.storage.session.clear()
        openSuccessPopup('Cache cleared successfully.')
    }
})

document.getElementById('usernotelist').addEventListener('input', function(e) {
    if (e.target.className == 'notemantextbox') {
        const textlimit = document.getElementById(`limit-${e.target.dataset.user.replaceAll(' ', '~')}`)
        textlimit.textContent = `${e.target.value.length}/300`
        textlimit.style = e.target.value.length > 300 ? 'color: red;' : 'color: white;'
    }
})

document.getElementById('createnotesect').addEventListener('input', function(e) {
    if (e.target.id == 'createusernotenote') {
        const textlimit = document.getElementById(`createnotecharlimit`)
        textlimit.textContent = `${e.target.value.length}/300`
        textlimit.style = e.target.value.length > 300 ? 'color: red;' : 'color: white;'
    }
})

const modeToggle = document.getElementById('mode-toggle');

document.getElementById('popupsidebaroptions').addEventListener('change', (e) => {
    display_mode = e.target.value
    const newMode = e.target.value
    chrome.storage.local.set({ ui_mode: newMode });
});

document.getElementById('preferredcdnoptions').addEventListener('change', (e) => {
    preferredcdn = e.target.value
    chrome.storage.local.set({ preferredcdn: preferredcdn });
    document.getElementById('roturphotoswarning').style.display = (preferredcdn == 'roturphotos') ? 'block' : 'none'
    document.getElementById('fluficdnwarning').style.display = (preferredcdn == 'fluficdn') ? 'block' : 'none'
});

document.getElementById('approwinput').addEventListener('input', function(e) {
    document.getElementById('approwlabel').textContent = e.target.value
})

document.getElementById('approwinput').addEventListener('change', function(e) {
    app_settings.rows = Number(e.target.value)
    chrome.storage.local.set({app_settings: app_settings})
})
