const parser = new DOMParser();

const settings = await new Promise(resolve =>
        chrome.storage.local.get('settings', data => resolve(data.settings?.padEnd(8, "0") || "00000000"))
    ) ?? "00000000";

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

chrome.storage.session.remove('acceptinprogress')

document.addEventListener('click', function(e) {
    if (e.target.className == 'appgridbtn') {
        window.location.href = `/pages/${e.target.id}.html`
    }
})

const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'Enter'];
let cursor = 0;

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
// Success, warning, and error pop-ups

export function openErrorPopup(error) {
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
export function openSuccessPopup(msg) {
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
export function openWarningPopup(warning) {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].replaceChildren(...parseHTML(`
        <div id="popup-header">
            <h1>Warning</h1>
            <button id="popup-x" class="closebtn">✕</button>
        </div>
        <p id="deleteconfirmdialogue">${warning}</p>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">OK</button>
        </div>
    `))
}