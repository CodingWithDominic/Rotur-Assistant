/* This code originated from the browser extension: Rotur Assistant
For those who need a pure JS implementation of ICN, that's not dependent on Scratch's infrastructure
Rotur Assistant, alongside this code, was created by Dominic. Feel free to use this, as long as you give credit (leaving this comment alone will count as credit) */

import { openErrorPopup } from "../index.js";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const tab = urlParams.get('tab')
if (tab && tab == 'docs') {
    document.getElementsByClassName('tab')[0].style = 'border-bottom: none;'
    document.getElementsByClassName('tab')[2].style = 'border-bottom: 2px solid white;'
    document.getElementById('icneditor').style.display = 'none'
    document.getElementById('icndocs').style.display = 'block'
}

const icn_default = 
{
    background: 'white',
    grid: 'true',
    exclusive: 'true',
    gridsize: 10
}

let icn_settings = await new Promise(resolve =>
    chrome.storage.local.get('icn_settings', data => resolve(data.icn_settings || icn_default))
) ?? icn_default;

document.getElementById('specialcommands').checked = icn_settings.exclusive
document.getElementById('togglegrid').checked = icn_settings.grid
document.getElementById('gridsizeslider').value = icn_settings.gridsize
document.getElementById('gridsizeslider').disabled = !document.getElementById('togglegrid').checked
document.getElementById('gridslidervalue').textContent = icn_settings.gridsize

Array.from(document.getElementsByName('canvasbg')).forEach(bg => {
    if (bg.value == icn_settings.background) {
        bg.checked = true;
    }
})

document.getElementById('icn_canvas').style.background = icn_settings.background == 'white' ? 'white' : icn_settings.background == 'black' ? 'black' : icn_settings.background == 'transparent' ? 'none' : '#0000006c'

function parseHex(str) {
    if (typeof str === 'string' && str.startsWith('#')) {
        return parseInt(str.slice(1), 16);
    }
    return NaN;
};

let icn_cache = []
let isDragging = false;
let startX = 0, startY = 0;
let offsetX = 185, offsetY = 120;
let scale = 5;
let dragStartX = 0;
let dragStartY = 0;
let initialOffsetX = 0;
let initialOffsetY = 0;
let scrollLeft = 0, scrollTop = 0;

const base_commands = ['w', 'c', 'scale', 'image', 'rect', 'square', 'dot', 'line', 'tri', 'cutcircle', 'curve', 'cont', 'move', 'ellipse', 'back']
const whitelisted_arguments = ['filled', 'true']
const special_commands = ['weight', 'size', 'color', 'colour', 'rectangle', 'triangle', 'arc', 'continue', 'arc2', 'circle', 'cutcircle2'] // Commands that only work within Rotur Assistant
const π = Math.PI

function parseICN(data) {
    const rawicndata = data.split(/\s+/).filter(item => item != '');
    let icndata = [] // [ {"command":[1, 2, 3, 4]} , {"command":[1, 2, 3, 4]} ]
    rawicndata.forEach(item => {
        if (isNaN(parseFloat(item)) && isNaN(parseHex(item)) && !whitelisted_arguments.includes(item) && !(item.startsWith('https://') || item.startsWith('http://'))) {
            icndata.push({ [item]: [] });
        } else {
            const lastObject = icndata[icndata.length - 1];
            if (lastObject) {
                const lastKey = Object.keys(lastObject)[0];
                lastObject[lastKey].push(whitelisted_arguments.includes(item) || (item.startsWith('#') || item.startsWith('https://') || item.startsWith('http://')) ? item : parseFloat(item));
            }
        }
    })
    return icndata
}

const canvas = document.getElementById('icn_canvas')
const ctx = canvas.getContext('2d')

function drawGrid(gridSize) {
    ctx.save();

    const matrix = ctx.getTransform();
    const imatrix = matrix.invertSelf();

    const left = imatrix.a * 0 + imatrix.c * 0 + imatrix.e;
    const right = imatrix.a * canvas.width + imatrix.c * canvas.height + imatrix.e;
    const top = imatrix.b * 0 + imatrix.d * 0 + imatrix.f;
    const bottom = imatrix.b * canvas.width + imatrix.d * canvas.height + imatrix.f;

    const isDarkBg = (icn_settings.background != 'white');
    ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 0.5 / scale; // Keep grid lines visually consistently thin regardless of scale

    ctx.beginPath();

    const startX = Math.floor(left / gridSize) * gridSize;
    for (let x = startX; x <= right; x += gridSize) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
    }

    const startY = Math.floor(top / gridSize) * gridSize;
    for (let y = startY; y <= bottom; y += gridSize) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        9
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1.2 / scale;

    ctx.moveTo(left, 0);
    ctx.lineTo(right, 0);

    ctx.moveTo(0, top);
    ctx.lineTo(0, bottom);
    ctx.stroke();

    ctx.restore();
}

function renderICN(icn) {
    ctx.reset()
    ctx.lineCap = "round";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    if (icn_settings.grid) {
        drawGrid(icn_settings.gridsize)
    }

    let color = 0
    let width = 1
    let icn_scale = 1
    let cont_cache_x = 0
    let cont_cache_y = 0
    let icn_transformX = 0
    let icn_transformY = 0
    icn.forEach(cmdobj => {
        if (width < 0.1) {
            width = 0.1
        }
        const cmd = Object.keys(cmdobj)[0]
        const icn_arguments = cmdobj[cmd]
        while (icn_arguments.length < 10) {
            icn_arguments.push(0) // Failsafe in case a command has insufficient arguments
        }
        switch (cmd) {
            case 'w':
            case 'width':
            case 'weight': {
                if (cmd == 'w' || icn_settings.exclusive) {
                    width = icn_arguments[0]
                }
                break
            }
            case 'c':
            case 'color': // Exclusive Alias
            case 'colour': { // Exclusive Alias
                if (cmd == 'c' || icn_settings.exclusive) {
                    color = icn_arguments[0]
                }
                break
            }
            case 'move': {
                icn_transformX = icn_arguments[0]
                icn_transformY = icn_arguments[1]
                break
            }
            case 'back': {
                icn_transformX = 0
                icn_transformY = 0
                break
            }
            case 'line': {
                ctx.beginPath()
                ctx.lineWidth = width * icn_scale
                ctx.strokeStyle = color;
                ctx.moveTo((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale)
                ctx.lineTo((icn_arguments[2] + icn_transformX) * icn_scale, (icn_arguments[3] + icn_transformY) * icn_scale)
                ctx.stroke()
                cont_cache_x = icn_arguments[2]
                cont_cache_y = icn_arguments[3]
                break
            }
            case 'cont': {
                ctx.beginPath()
                ctx.lineWidth = width * icn_scale
                ctx.strokeStyle = color;
                ctx.moveTo((cont_cache_x + icn_transformX) * icn_scale, (cont_cache_y + icn_transformY) * icn_scale)
                ctx.lineTo((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale)
                ctx.stroke()
                cont_cache_x = icn_arguments[0]
                cont_cache_y = icn_arguments[1]
                break                
            }
            case 'curve': {
                ctx.beginPath()
                ctx.lineWidth = width * icn_scale
                ctx.strokeStyle = color;
                ctx.moveTo((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale)
                ctx.quadraticCurveTo((icn_arguments[4] + icn_transformX) * icn_scale, (icn_arguments[5] + icn_transformY) * icn_scale, (icn_arguments[2] + icn_transformX) * icn_scale, (icn_arguments[3] + icn_transformY) * icn_scale)
                ctx.stroke()
                cont_cache_x = icn_arguments[2]
                cont_cache_y = icn_arguments[3]
                break
            }
            case 'square': {
                ctx.lineWidth = width * icn_scale
                ctx.strokeStyle = color;
                let rectx = (icn_arguments[0] + icn_transformX) * icn_scale
                let recty = (icn_arguments[1] + icn_transformY) * icn_scale
                let rect_width = icn_arguments[2] * icn_scale * 2
                let rect_height = icn_arguments[3] * icn_scale * 2
                rectx -= (rect_width / 2)
                recty -= (rect_height / 2)
                ctx.strokeRect(rectx, recty, rect_width, rect_height)
                break
            }
            case 'rect':
            case 'rectangle': { // Exclusive Alias
                if (cmd == 'rect' || icn_settings.exclusive) {
                    ctx.lineWidth = width * icn_scale
                    ctx.fillStyle = color;
                    let rectx = (icn_arguments[0] + icn_transformX) * icn_scale
                    let recty = (icn_arguments[1] + icn_transformY) * icn_scale
                    let rect_width = icn_arguments[2] * icn_scale * 2
                    let rect_height = icn_arguments[3] * icn_scale * 2
                    rectx -= (rect_width / 2)
                    recty -= (rect_height / 2)
                    ctx.fillRect(rectx, recty, rect_width, rect_height)
                }
                break
            }
            case 'cutcircle':
            case 'arc': { // Exclusive Alias
                if (cmd == 'cutcircle' || icn_settings.exclusive) {
                    ctx.lineWidth = width * icn_scale
                    let cx = (icn_arguments[0] + icn_transformX) * icn_scale
                    let cy = (icn_arguments[1] + icn_transformY) * icn_scale
                    let radius = icn_arguments[2] * icn_scale
                    let angle = (icn_arguments[3] * -5) + 45
                    let sweep_angle = icn_arguments[4]
                    let start_angle = (angle - (sweep_angle / 2)) * (π/90)
                    let end_angle = (angle + (sweep_angle / 2)) * (π/90)
                    ctx.strokeStyle = color;
                    ctx.beginPath()
                    ctx.arc(cx, cy, radius, start_angle, end_angle)
                    ctx.stroke()
                    if (icn_settings.exclusive && (icn_arguments[5] == 1 || icn_arguments[5] == 'filled' || icn_arguments[5] == 'true')) {
                        ctx.fillStyle = color;
                        ctx.beginPath()
                        ctx.arc(cx, cy, radius, start_angle, end_angle)
                        ctx.fill()
                    }
                }
                break
            }
            case 'dot': {
                ctx.fillStyle = color;
                let cx = (icn_arguments[0] + icn_transformX) * icn_scale
                let cy = (icn_arguments[1] + icn_transformY) * icn_scale
                ctx.beginPath()
                ctx.arc(cx, cy, (width * icn_scale)/2, 0, 2*π)
                ctx.fill()
                cont_cache_x = icn_arguments[0]
                cont_cache_y = icn_arguments[1]
                break
            }
            case 'tri':
            case 'triangle': { // Exclusive Alias
                if (cmd == 'tri' || icn_settings.exclusive) {
                    ctx.beginPath();
                    ctx.moveTo((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale);
                    ctx.lineTo((icn_arguments[2] + icn_transformX) * icn_scale, (icn_arguments[3] + icn_transformY) * icn_scale); // A lot easier than when I did the vanilla scratch implementation
                    ctx.lineTo((icn_arguments[4] + icn_transformX) * icn_scale, (icn_arguments[5] + icn_transformY) * icn_scale); 
                    ctx.fillStyle = color;
                    ctx.fill();
                }
                break
            }
            case 'ellipse':
            case 'oval': { // Exclusive Alias
                if (cmd == 'ellipse' || icn_settings.exclusive) {
                    ctx.beginPath();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width * icn_scale
                    ctx.ellipse((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale, icn_arguments[2] * icn_scale, icn_arguments[2] * icn_scale * icn_arguments[3], icn_arguments[4] * (π/-180), 0, 2*π)
                    ctx.stroke();
                    if (icn_settings.exclusive && (icn_arguments[5] == 1 || icn_arguments[5] == 'filled' || icn_arguments[5] == 'true')) {
                        ctx.fillStyle = color;
                        ctx.ellipse((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale, icn_arguments[2] * icn_scale, icn_arguments[2] * icn_scale * icn_arguments[3], icn_arguments[4] * (π/-180), 0, 2*π)
                        ctx.fill();
                    }
                }
                break
            }
            case 'image': {
                const img = new Image();
                img.onload = function() {
                    ctx.save()
                    ctx.scale(1, -1)
                    const newheight = icn_arguments[1]
                    const imgwidth = img.width
                    const imgheight = img.height
                    const aspectratio = imgwidth / imgheight
                    const newwidth = newheight * aspectratio
                    ctx.drawImage(img, -10 - (newwidth / 2), 10 - (newheight / 2), newwidth, newheight);
                    ctx.restore()
                };
                img.src = icn_arguments[0]
                break
            }
            // ICN Commands that only work within Rotur Assistant
            case 'ellipse2':
            case 'oval2': {
                if (icn_settings.exclusive) {
                    ctx.beginPath();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width * icn_scale
                    ctx.ellipse((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale, icn_arguments[2] * icn_scale, icn_arguments[3] * icn_scale, icn_arguments[4] * (π/-180), 0, 2*π)
                    ctx.stroke();
                    if (icn_arguments[5] == 1 || icn_arguments[5] == 'filled' || icn_arguments[5] == 'true') {
                        ctx.fillStyle = color;
                        ctx.ellipse((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale, icn_arguments[2] * icn_scale, icn_arguments[3] * icn_scale, icn_arguments[4] * (π/-180), 0, 2*π)
                        ctx.fill();
                    }
                }
                break
            }
            case 'circle':
            case 'cir': {
                if (icn_settings.exclusive) {
                    ctx.fillStyle = color;
                    let cx = (icn_arguments[0] + icn_transformX) * icn_scale
                    let cy = (icn_arguments[1] + icn_transformY) * icn_scale
                    let radius = icn_arguments[2] * icn_scale
                    ctx.beginPath()
                    ctx.arc(cx, cy, radius, 0, 2*π)
                    ctx.fill()
                }
                break
            }
            case 'cutcircle2':
            case 'arc2': {
                if (icn_settings.exclusive) {
                    ctx.lineWidth = width * icn_scale
                    let cx = (icn_arguments[0] + icn_transformX) * icn_scale
                    let cy = (icn_arguments[1] + icn_transformY) * icn_scale
                    let radius = icn_arguments[2] * icn_scale
                    let angle = icn_arguments[3]
                    let end_angle = icn_arguments[4] * (π/180)
                    let cw = icn_arguments[6]
                    if (cw == 'true') {
                        cw = 1;
                    }
                    ctx.strokeStyle = color;
                    ctx.beginPath()
                    ctx.arc(cx, cy, radius, angle, end_angle, cw)
                    ctx.stroke()
                    if (icn_arguments[5] == 1 || icn_arguments[5] == 'filled' || icn_arguments[5] == 'true') {
                        ctx.fillStyle = color;
                        ctx.beginPath()
                        ctx.arc(cx, cy, radius, angle, end_angle, cw)
                        ctx.fill()
                    }
                }
                break
            }
        }
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

// Everything past this point is code that just makes Rotur Assistant's menus function. This will likely not be necessary for your ICN-incorporated program.

renderICN(parseICN(''))

const config = {
    elements: ['p', 'img', 'div', 'h1', 'h2', 'h3', 'h4', 'button', 'ul', 'li', 'select', 'option', 'input'],
    attributes: ['src', 'alt', 'href', 'width', 'height', 'id', 'class', 'data', 'value', 'title', 'disabled', 'type']
}
const sanitizer = new Sanitizer(config)

function openNameICNFile() {
    document.getElementById('overlay').style.display = 'flex';
    document.getElementsByClassName('popup')[0].setHTML(`
        <div id="popup-header">
            <h1>Name ICN File</h1>
            <button id="popup-x" class="closebtn">✕</button>
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
    }
    if (e.target.className == 'tab') {
        Array.from(document.getElementsByClassName('tab')).forEach(tab => {
            tab.style = 'border-bottom: none;'
        })
        e.target.style = 'border-bottom: 2px solid white;'
        document.getElementById('icneditor').style.display = (e.target.id == 'icneditortab') ? 'block' : 'none'
        document.getElementById('icnsettings').style.display = (e.target.id == 'icnsettingstab') ? 'flex' : 'none'
        document.getElementById('icndocs').style.display = (e.target.id == 'icndocstab') ? 'block' : 'none'
        return;        
    }
    if (e.target.id == 'rendericn') {
        icn_cache = document.getElementById('icn_field').value
        icn_cache = parseICN(icn_cache)
        renderICN(icn_cache)
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
    }
    if (e.target.id == 'icn_oneline') {
        document.getElementById('icn_field').value = document.getElementById('icn_field').value.replace(/\s+/g, ' ')
    }
    if (e.target.id == 'specialcommands') {
        icn_settings.exclusive = e.target.checked
        chrome.storage.local.set({icn_settings: icn_settings})
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
    }
    if (e.target.id == 'togglegrid') {
        document.getElementById('gridsizeslider').disabled = !document.getElementById('togglegrid').checked
        icn_settings.grid = document.getElementById('togglegrid').checked
        chrome.storage.local.set({icn_settings: icn_settings})
        renderICN(icn_cache)
    }
    if (e.target.id == 'resetcamera') {
        startX = 0
        startY = 0
        offsetX = 185
        offsetY = 120;
        scale = 5;
        initialOffsetX = 0;
        initialOffsetY = 0;
        scrollLeft = 0
        scrollTop = 0;
        renderICN(icn_cache)
    }
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

/* This code originated from the browser extension: Rotur Assistant
For those who need a pure JS implementation of ICN, that's not dependent on Scratch's infrastructure
Rotur Assistant, alongside this code, was created by Dominic. Feel free to use this, as long as you give credit (leaving this comment alone will count as credit) */