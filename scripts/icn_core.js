/* This code originated from the browser extension: Rotur Assistant
For those who need a pure JS implementation of ICN, that's not dependent on Scratch's infrastructure
Rotur Assistant, alongside this code, was created by Dominic. Feel free to use this, as long as you give credit (leaving this comment alone will count as credit) */

/*
Shared ICN (Image Creation Notation) parser and renderer.

This is the exact rendering logic used by the ICN editor (icn.js), factored out so
that other parts of Rotur Assistant (such as profile badges) can render ICN data
with the same behaviour instead of re-implementing it.

`renderICN` is fully parameterised so it can draw into any canvas at any scale.
*/

export const base_commands = ['w', 'c', 'scale', 'image', 'rect', 'square', 'dot', 'line', 'tri', 'cutcircle', 'curve', 'cont', 'move', 'ellipse', 'back']
export const whitelisted_arguments = ['filled', 'true']
export const special_commands = ['weight', 'size', 'color', 'colour', 'rectangle', 'triangle', 'arc', 'continue', 'arc2', 'circle', 'cutcircle2'] // Commands that only work within Rotur Assistant
const π = Math.PI

export function parseHex(str) {
    if (typeof str === 'string' && str.startsWith('#')) {
        return parseInt(str.slice(1), 16);
    }
    return NaN;
};

export function parseICN(data) {
    if (typeof data !== 'string') {
        return [];
    }
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

export function drawGrid(ctx, settings, width, height, scale) {
    ctx.save();

    const matrix = ctx.getTransform();
    const imatrix = matrix.invertSelf();

    const left = imatrix.a * 0 + imatrix.c * 0 + imatrix.e;
    const right = imatrix.a * width + imatrix.c * 0 + imatrix.e;
    const top = imatrix.b * 0 + imatrix.d * 0 + imatrix.f;
    const bottom = imatrix.b * 0 + imatrix.d * height + imatrix.f;

    const isDarkBg = (settings.background != 'white');
    ctx.strokeStyle = isDarkBg ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 0.5 / scale; // Keep grid lines visually consistently thin regardless of scale

    ctx.beginPath();

    const startX = Math.floor(left / settings.gridsize) * settings.gridsize;
    for (let x = startX; x <= right; x += settings.gridsize) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
    }

    const startY = Math.floor(top / settings.gridsize) * settings.gridsize;
    for (let y = startY; y <= bottom; y += settings.gridsize) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
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

/**
 * Renders parsed ICN data onto a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx - Context to draw into
 * @param {Array} icn - Output of parseICN()
 * @param {Object} [options]
 * @param {number} [options.width] - Canvas width in device pixels (defaults to ctx.canvas.width)
 * @param {number} [options.height] - Canvas height in device pixels (defaults to ctx.canvas.height)
 * @param {number} [options.scale=5] - Pixels per ICN unit
 * @param {number} [options.offsetX] - X position of ICN origin in pixels (defaults to horizontal centre)
 * @param {number} [options.offsetY] - Y position of ICN origin in pixels (defaults to vertical centre)
 * @param {string} [options.background='transparent'] - Background name used for grid contrast
 * @param {boolean} [options.grid=false] - Draw the editor grid
 * @param {number} [options.gridsize=10] - Grid spacing in ICN units
 * @param {boolean} [options.exclusive=true] - Enable Rotur Assistant's extra commands/aliases
 * @param {boolean} [options.sharp=true] - Draw rectangles/triangles with sharp corners
 * @param {CanvasLineCap} [options.lineCap='round'] - Canvas line cap
 */
export function renderICN(ctx, icn, options = {}) {
    const canvas = ctx.canvas
    const width = options.width ?? canvas?.width ?? 0
    const height = options.height ?? canvas?.height ?? 0
    const scale = options.scale ?? 5
    const offsetX = options.offsetX ?? width / 2
    const offsetY = options.offsetY ?? height / 2

    const icn_settings = {
        background: options.background ?? 'transparent',
        grid: options.grid ?? false,
        gridsize: options.gridsize ?? 10,
        exclusive: options.exclusive ?? true,
        sharp: options.sharp ?? true
    }

    if (typeof ctx.reset === 'function') {
        ctx.reset()
    }
    ctx.lineCap = options.lineCap ?? "round";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    if (icn_settings.grid) {
        drawGrid(ctx, icn_settings, width, height, scale)
    }

    let color = options.colordefault ?? 0
    let linewidth = 1
    let icn_scale = 1
    let cont_cache_x = 0
    let cont_cache_y = 0
    let icn_transformX = 0
    let icn_transformY = 0
    ;(icn ?? []).forEach(cmdobj => {
        if (linewidth < 0.1) {
            linewidth = 0.1
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
                    linewidth = icn_arguments[0]
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
            case 'scale': {
                icn_scale = icn_arguments[0]
                if (icn_scale < 0.1) {
                    icn_scale = 0.1
                }
                break
            }
            case 'reset':
            case 'back': {
                if (cmd == 'back' || icn_settings.exclusive) {
                    icn_transformX = 0
                    icn_transformY = 0
                }
                break
            }
            case 'l': // Milo's AI gave me the idea to add this alias
            case 'line': {
                if (cmd == 'line' || icn_settings.exclusive) {
                    ctx.beginPath()
                    ctx.lineWidth = linewidth * icn_scale
                    ctx.strokeStyle = color;
                    ctx.moveTo((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale)
                    ctx.lineTo((icn_arguments[2] + icn_transformX) * icn_scale, (icn_arguments[3] + icn_transformY) * icn_scale)
                    ctx.stroke()
                    cont_cache_x = icn_arguments[2]
                    cont_cache_y = icn_arguments[3]
                    ctx.closePath()
                }
                break
            }
            case 'continue':
            case 'cont': {
                if (cmd == 'cont' || icn_settings.exclusive) {
                    ctx.beginPath()
                    ctx.lineWidth = linewidth * icn_scale
                    ctx.strokeStyle = color;
                    ctx.moveTo((cont_cache_x + icn_transformX) * icn_scale, (cont_cache_y + icn_transformY) * icn_scale)
                    ctx.lineTo((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale)
                    ctx.stroke()
                    cont_cache_x = icn_arguments[0]
                    cont_cache_y = icn_arguments[1]
                    ctx.closePath()
                }
                break
            }
            case 'curve': {
                ctx.beginPath()
                ctx.lineWidth = linewidth * icn_scale
                ctx.strokeStyle = color;
                ctx.moveTo((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale)
                ctx.quadraticCurveTo((icn_arguments[4] + icn_transformX) * icn_scale, (icn_arguments[5] + icn_transformY) * icn_scale, (icn_arguments[2] + icn_transformX) * icn_scale, (icn_arguments[3] + icn_transformY) * icn_scale)
                ctx.stroke()
                cont_cache_x = icn_arguments[2]
                cont_cache_y = icn_arguments[3]
                ctx.closePath()
                break
            }
            case 'square': {
                ctx.lineWidth = linewidth * icn_scale
                ctx.strokeStyle = color;
                let rectx = (icn_arguments[0] + icn_transformX) * icn_scale
                let recty = (icn_arguments[1] + icn_transformY) * icn_scale
                let rect_width = icn_arguments[2] * icn_scale * 2
                let rect_height = icn_arguments[3] * icn_scale * 2
                rectx -= (rect_width / 2)
                recty -= (rect_height / 2)
                if (!icn_settings.sharp) {
                    ctx.beginPath()
                    ctx.roundRect(rectx, recty, rect_width, rect_height, ((linewidth/4) * (icn_scale/2)))
                    ctx.stroke()
                    ctx.closePath()
                } else {
                    ctx.strokeRect(rectx, recty, rect_width, rect_height)
                }
                break
            }
            case 'rect':
            case 'rectangle': { // Exclusive Alias
                if (cmd == 'rect' || icn_settings.exclusive) {
                    ctx.lineWidth = linewidth * icn_scale
                    ctx.fillStyle = color;
                    let rectx = (icn_arguments[0] + icn_transformX) * icn_scale
                    let recty = (icn_arguments[1] + icn_transformY) * icn_scale
                    let rect_width = icn_arguments[2] * icn_scale * 2
                    let rect_height = icn_arguments[3] * icn_scale * 2
                    rectx -= (rect_width / 2)
                    recty -= (rect_height / 2)
                    ctx.fillRect(rectx, recty, rect_width, rect_height)
                    if (!icn_settings.sharp) {
                        ctx.strokeStyle = color;
                        ctx.beginPath()
                        ctx.roundRect(rectx, recty, rect_width, rect_height, ((linewidth/4) * (icn_scale/2)))
                        ctx.stroke()
                        ctx.closePath()
                    }
                }
                break
            }
            case 'cutcircle':
            case 'arc': { // Exclusive Alias
                if (cmd == 'cutcircle' || icn_settings.exclusive) {
                    ctx.lineWidth = linewidth * icn_scale
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
                    ctx.closePath()
                }
                break
            }
            case 'dot': {
                ctx.fillStyle = color;
                let cx = (icn_arguments[0] + icn_transformX) * icn_scale
                let cy = (icn_arguments[1] + icn_transformY) * icn_scale
                ctx.beginPath()
                ctx.arc(cx, cy, (linewidth * icn_scale)/2, 0, 2*π)
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
                    ctx.closePath()
                    ctx.fillStyle = color;
                    ctx.fill();
                    if (!icn_settings.sharp) {
                        ctx.lineWidth = linewidth * icn_scale;
                        ctx.strokeStyle = color;
                        ctx.lineJoin = "round";
                        ctx.stroke()
                    }
                    ctx.closePath()
                }
                break
            }
            case 'ellipse':
            case 'oval': { // Exclusive Alias
                if (cmd == 'ellipse' || icn_settings.exclusive) {
                    ctx.beginPath();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = linewidth * icn_scale
                    ctx.ellipse((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale, icn_arguments[2] * icn_scale, icn_arguments[2] * icn_scale * icn_arguments[3], icn_arguments[4] * (π/-180), 0, 2*π)
                    ctx.stroke();
                    if (icn_settings.exclusive && (icn_arguments[5] == 1 || icn_arguments[5] == 'filled' || icn_arguments[5] == 'true')) {
                        ctx.fillStyle = color;
                        ctx.ellipse((icn_arguments[0] + icn_transformX) * icn_scale, (icn_arguments[1] + icn_transformY) * icn_scale, icn_arguments[2] * icn_scale, icn_arguments[2] * icn_scale * icn_arguments[3], icn_arguments[4] * (π/-180), 0, 2*π)
                        ctx.fill();
                    }
                    ctx.closePath()
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
                    ctx.lineWidth = linewidth * icn_scale
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
                    ctx.lineWidth = linewidth * icn_scale
                    let cx = (icn_arguments[0] + icn_transformX) * icn_scale
                    let cy = (icn_arguments[1] + icn_transformY) * icn_scale
                    let radius = icn_arguments[2] * icn_scale
                    let angle = icn_arguments[3] * (π/180)
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

/**
 * Renders an ICN string into a square canvas suitable for display as an icon.
 *
 * ICN badge art is drawn within roughly ±10 units of the origin (a 20×20 unit
 * viewbox), so the requested size is mapped to 20 ICN units. This makes ICN
 * badges fill the same 24×24 box as the bundled PNG badges.
 *
 * @param {string} icnString - Raw ICN data
 * @param {number} [size=24] - Display size in CSS pixels
 * @returns {HTMLCanvasElement}
 */
export function createICNCanvas(icnString, size = 24, colordefault, sharp) {
    const canvas = document.createElement('canvas')
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3)
    const resolution = Math.round(size * pixelRatio)
    canvas.width = resolution
    canvas.height = resolution
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    renderICN(canvas.getContext('2d'), parseICN(icnString), {
        width: resolution,
        height: resolution,
        scale: resolution / 20, // 20 ICN units across the icon (badge art spans ~±10 units)
        offsetX: resolution / 2,
        offsetY: resolution / 2,
        background: 'transparent',
        grid: false,
        exclusive: true,
        sharp: sharp,
        colordefault: colordefault
    })

    return canvas
}
