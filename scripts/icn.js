/* This code originated from the browser extension: Rotur Assistant
For those who need a pure JS implementation of ICN, that's not dependent on Scratch's infrastructure
Rotur Assistant, alongside this code, was created by Dominic. Feel free to use this, as long as you give credit (leaving this comment alone will count as credit) */

import { openErrorPopup } from "../index.js";
import { parseICN, renderICN as renderICNCore, base_commands, special_commands } from "./icn_core.js";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const tab = urlParams.get('tab')
const url_icn = urlParams.get('icn')
if (tab && tab == 'docs') {
    document.getElementsByClassName('tab')[0].style = 'border-bottom: none;'
    document.getElementsByClassName('tab')[2].style = 'border-bottom: 2px solid white;'
    document.getElementById('icneditor').style.display = 'none'
    document.getElementById('icndocs').style.display = 'block'
}

const icn_default = 
{
    background: 'white',
    grid: true,
    exclusive: true,
    gridsize: 10,
    realtime: false,
    preserve: true,
    sharp: true
}

let icn_settings = await new Promise(resolve =>
    chrome.storage.local.get('icn_settings', data => resolve(data.icn_settings || icn_default))
) ?? icn_default;

let icn_lastsession = await new Promise(resolve =>
    chrome.storage.local.get('icn_lastsession', data => resolve(data.icn_lastsession || ""))
) ?? ""

document.getElementById('specialcommands').checked = icn_settings.exclusive ?? true
document.getElementById('togglegrid').checked = icn_settings.grid ?? true
document.getElementById('gridsizeslider').value = icn_settings.gridsize ?? 10
document.getElementById('gridsizeslider').disabled = !document.getElementById('togglegrid').checked
document.getElementById('gridslidervalue').textContent = icn_settings.gridsize ?? "10"
document.getElementById('realtimerendering').checked = icn_settings.realtime ?? false
document.getElementById('preservesession').checked = icn_settings.preserve ?? true
document.getElementById('sharp').checked = icn_settings.sharp ?? true
if (icn_settings.realtime === undefined) {
    icn_settings.realtime = false
}
if (icn_settings.preserve === undefined) {
    icn_settings.preserve = true
}
if (icn_settings.sharp === undefined) {
    icn_settings.sharp = true
}

Array.from(document.getElementsByName('canvasbg')).forEach(bg => {
    if (bg.value == icn_settings.background) {
        bg.checked = true;
    }
})

document.getElementById('icn_canvas').style.background = icn_settings.background == 'white' ? 'white' : icn_settings.background == 'black' ? 'black' : icn_settings.background == 'transparent' ? 'none' : '#0000006c'


const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

let icn_cache = []
let isDragging = false;
let startX = 0, startY = 0;
let offsetX = 185, offsetY = 185;
let scale = 5;
let dragStartX = 0;
let dragStartY = 0;
let initialOffsetX = 0;
let initialOffsetY = 0;
let scrollLeft = 0, scrollTop = 0;


const canvas = document.getElementById('icn_canvas')
const ctx = canvas.getContext('2d')

function renderICN(icn) {
    renderICNCore(ctx, icn, {
        width: canvas.width,
        height: canvas.height,
        scale,
        offsetX,
        offsetY,
        background: icn_settings.background,
        grid: icn_settings.grid,
        gridsize: icn_settings.gridsize,
        exclusive: icn_settings.exclusive,
        sharp: icn_settings.sharp,
        colordefault: 0
    })
}

canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    isDragging = true;
    
    startX = e.offsetX;
    startY = e.offsetY;
    
    scrollLeft = offsetX;
    scrollTop = offsetY;
});

canvas.addEventListener('mousemove', e => {
    if (!isDragging) {
        return;
    }
    
    const dx = e.offsetX - startX;
    const dy = e.offsetY - startY;
    
    offsetX = scrollLeft + dx;
    offsetY = scrollTop + dy;
    
    renderICN(icn_cache);
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    
    const delta = -e.deltaY;
    const zoomFactor = Math.pow(1.1, delta / 100); 
    
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    
    offsetX = mouseX - (mouseX - offsetX) * zoomFactor;
    offsetY = mouseY - (mouseY - offsetY) * zoomFactor;
    scale *= zoomFactor;
    
    renderICN(icn_cache);
}, { passive: false });

window.addEventListener('mouseup', () => {
    isDragging = false;
});

renderICN(parseICN(''))

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'input', 'a'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'type', 'style']
}
const sanitizer = new Sanitizer(config)

function openNameICNFile() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Name ICN File</h1>
            <button id="popup-x" class="closebtn">âœ•</button>
        </div>
        <p id="deleteconfirmdialogue">Name of ICN file:</p>
        <input type='text' id='icnfilename'>
        <div id="popup-choices">
            <button id="cancel" class="closebtn">Cancel</button>
            <button class="finalicnexport">Export</button>
        </div>
    `, {sanitizer: sanitizer})
}

function closePopup() {
    document.getElementById('overlay').style.display = 'none';
}

function exportToICNFile(icndata, name) {
    const filename = name ? name : `icn_export`
    const blob = new Blob([icndata], { type: "application/icn" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.icn`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

document.addEventListener('click', async function(e) {
    if (e.target.className == 'closebtn') {
        closePopup()
        return;
    }
    if (e.target.className == 'tab') {
        Array.from(document.getElementsByClassName('tab')).forEach(tab => {
            tab.style = 'border-bottom: none;'
        })
        e.target.style = 'border-bottom: 2px solid white;'
        document.getElementById('icneditor').style.display = (e.target.id == 'icneditortab') ? 'block' : 'none'
        document.getElementById('icnsettings').style.display = (e.target.id == 'icnsettingstab') ? 'flex' : 'none'
        document.getElementById('icndocs').style.display = (e.target.id == 'icndocstab') ? 'block' : 'none'
        if (e.target.id == 'icneditortab') {
            document.getElementsByClassName('container')[0].style.maxWidth = "1200px"
        } else {
            document.getElementsByClassName('container')[0].style.maxWidth = "600px"
        }
        return;        
    }
    if (e.target.id == 'rendericn') {
        icn_cache = document.getElementById('icn_field').value
        icn_cache = parseICN(icn_cache)
        renderICN(icn_cache)
        return;
    }
    if (e.target.id == 'icn_linebyline') {
        const rawText = document.getElementById('icn_field').value;
        const allCommands = [...base_commands, ...special_commands];
        
        const words = rawText.split(/\s+/).filter(w => w !== '');
        
        let formattedLines = [];
        let currentLine = [];
        let i = 0;

        while (i < words.length) {
            const word = words[i];

            if (word.startsWith('//')) {
                if (currentLine.length > 0) {
                    formattedLines.push(currentLine.join(' '));
                    currentLine = [];
                }

                let commentTokens = [word];
                i++;
                while (i < words.length && !allCommands.includes(words[i])) {
                    commentTokens.push(words[i]);
                    i++;
                }
                
                formattedLines.push(commentTokens.join(' '));
                continue;
            }

            if (allCommands.includes(word) && !word.startsWith('#')) {
                if (currentLine.length > 0) {
                    formattedLines.push(currentLine.join(' '));
                }
                currentLine = [word];
            } else {
                currentLine.push(word);
            }
            i++;
        }
        if (currentLine.length > 0) {
            formattedLines.push(currentLine.join(' '));
        }

        document.getElementById('icn_field').value = formattedLines.join('\n');
        return;
    }
    if (e.target.id == 'icn_oneline') {
        document.getElementById('icn_field').value = document.getElementById('icn_field').value.replace(/\s+/g, ' ')
        return;
    }
    if (e.target.id == 'specialcommands') {
        icn_settings.exclusive = e.target.checked
        chrome.storage.local.set({icn_settings: icn_settings})
        return;
    }
    if (e.target.id == 'realtimerendering') {
        icn_settings.realtime = e.target.checked
        chrome.storage.local.set({icn_settings: icn_settings})
        return;
    }
    if (e.target.id == 'sharp') {
        icn_settings.sharp = e.target.checked
        chrome.storage.local.set({icn_settings: icn_settings})
        renderICN(icn_cache)
        return;
    }
    if (e.target.id == 'preservesession') {
        icn_settings.preserve = e.target.checked
        chrome.storage.local.set({icn_settings: icn_settings})
        if (icn_settings.preserve) {
            icn_lastsession = document.getElementById('icn_field').value
            chrome.storage.local.set({icn_lastsession: icn_lastsession})
        }
        return;
    }
    if (e.target.id == 'icn_import') {
        if (e.shiftKey) {
            try {
                const clipboardText = await navigator.clipboard.readText();
                document.getElementById('icn_field').value = clipboardText
                document.getElementById('rendericn').click()
            } catch (error) {
                openErrorPopup('Your clipboard was empty.')
            }                     
        } else {
            document.getElementById('icnimportbtn').click()
        }
        return;
    }
    if (e.target.id == 'icn_export') {
        if (document.getElementById('icn_field').value.trim() == '') {
            openErrorPopup('ICN file is empty')
        } else {
            openNameICNFile()
        }
        return;
    }
    if (e.target.className == 'finalicnexport') {
        closePopup()
        exportToICNFile(document.getElementById('icn_field').value, document.getElementById('icnfilename').value)
        document.getElementById('icnfilename').value = ''
        return;
    }
    if (e.target.id == 'togglegrid') {
        document.getElementById('gridsizeslider').disabled = !document.getElementById('togglegrid').checked
        icn_settings.grid = document.getElementById('togglegrid').checked
        chrome.storage.local.set({icn_settings: icn_settings})
        renderICN(icn_cache)
        return;
    }
    if (e.target.id == 'resetcamera') {
        startX = 0
        startY = 0
        offsetX = Math.round(canvas.width / 2)
        offsetY = Math.round(canvas.height / 2)
        scale = 5;
        initialOffsetX = 0;
        initialOffsetY = 0;
        scrollLeft = 0
        scrollTop = 0;
        renderICN(icn_cache)
        return;
    }
})

function fixCanvasWidth() {
    const cv = document.getElementById('icn_canvas')
    const wide = document.getElementById('icneditorlayout').classList.contains('wide')
    const oldheight = cv.height
    let newwidth = clamp(document.body.clientWidth, 400, 660) - 30 // stacked default
    let newheight = 370

    if (wide) {
        newwidth = cv.clientWidth // CSS makes the canvas fill its column; match the buffer to it
        const left = document.getElementById('icnsect1')
        const reset = document.getElementById('resetcamera')
        const rs = getComputedStyle(reset)
        const cs = getComputedStyle(cv)
        const used = reset.offsetHeight
            + parseFloat(rs.marginTop) + parseFloat(rs.marginBottom)
            + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)
            + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
        newheight = Math.max(200, Math.floor(left.offsetHeight - used))
    }

    cv.width = newwidth
    cv.height = newheight
    offsetX = Math.round(newwidth / 2)
    offsetY += (newheight - oldheight) / 2
    renderICN(icn_cache)
}

let old_height = 200
function fitEditorHeight() {
    const field = document.getElementById('icn_field')
    const top = field.getBoundingClientRect().top + window.scrollY
    const below = document.getElementById('rendericn').offsetHeight
        + document.getElementById('footer-placeholder').offsetHeight
        + 40 // margins/padding around the Render button and footer; tweak to taste
    field.style.height = `${Math.max(200, window.innerHeight - top - below)}px`
}

function AdjustLayout() {
    const field = document.getElementById('icn_field')
    const wide = document.body.clientWidth > 984
    document.getElementById('icneditorlayout').classList.toggle('wide', wide)

    if (wide) {
        field.style.resize = 'none'
        fitEditorHeight()
    } else {
        field.style.resize = 'vertical'
        field.style.height = `${old_height}px`
    }
    fixCanvasWidth()
}

window.addEventListener('resize', () => {
    AdjustLayout()
})

document.getElementById('canvasbgsettings').addEventListener('change', function(e) {
    const newbg = e.target.value
    document.getElementById('icn_canvas').style.background = newbg == 'white' ? 'white' : newbg == 'black' ? 'black' : newbg == 'transparent' ? 'none' : '#0000006c'
    icn_settings.background = newbg
    chrome.storage.local.set({icn_settings: icn_settings})
    renderICN(icn_cache)
})

document.getElementById('icnimportbtn').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            document.getElementById('icn_field').value = e.target.result
            document.getElementById('rendericn').click()
        } catch {
            openErrorPopup('The file submitted was not a valid text or ICN file.')
        }
    };

    reader.readAsText(file);
});

document.getElementById('gridsizeslider').addEventListener('change', function(e) {
    icn_settings.gridsize = Number(e.target.value)
    chrome.storage.local.set({icn_settings: icn_settings})
    renderICN(icn_cache)
})

document.getElementById('gridsizeslider').addEventListener('input', function(e) {
    document.getElementById('gridslidervalue').textContent = e.target.value
})

document.getElementById('icn_field').addEventListener('input', function(e) {
    if (icn_settings.realtime ?? false) {
        icn_cache = document.getElementById('icn_field').value
        icn_cache = parseICN(icn_cache)
        renderICN(icn_cache)
    }
    if (icn_settings.preserve ?? true) {
        icn_lastsession = document.getElementById('icn_field').value
        chrome.storage.local.set({icn_lastsession: icn_lastsession})
    }
})

AdjustLayout()
AdjustLayout()

if (url_icn) {
    document.getElementById('icn_field').value = url_icn
    icn_cache = url_icn
    icn_cache = parseICN(icn_cache)
    renderICN(icn_cache)
} else if (icn_settings.preserve ?? true) {
    document.getElementById('icn_field').value = icn_lastsession
    icn_cache = icn_lastsession
    icn_cache = parseICN(icn_cache)
    renderICN(icn_cache)
}

/* This code originated from the browser extension: Rotur Assistant
For those who need a pure JS implementation of ICN, that's not dependent on Scratch's infrastructure
Rotur Assistant, alongside this code, was created by Dominic. Feel free to use this, as long as you give credit (leaving this comment alone will count as credit) */
