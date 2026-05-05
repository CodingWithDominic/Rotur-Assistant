const themedata = {
    oceanblue: ["#0F0052", "#004DB1", "#00002B", "#0012B4", "#4F46E5", "#4338CA", "#03009C"],
    forestgreen: ["#0A3100", "#00b83d", "#271e00", "#058a00", "#7c5500", "rgb(187, 106, 0)", "#006b17"],
    orange: ["#6d4100", "#7c280f", "#cf3000", "#741b00", "#FF4C4B", "#df2727", "#df795a"],
    blurple: ["#200044", "#35008b", "#28004e", "#4500b4", "#4918cf", "#4a00d4", "#2f009c"],
    discord: ["#323339", "#7D7E87", "#323339", "#2C2D32", "#5865F2", "#4452BB", "#393A41"],
    midnight: ["#000000", "#4d4d4d", "#242425", "#2e2e2e", "#5a5a5a", "#494949", "#3b3b3b"],
    blackout: ["#000000", "#000000", "#000000", "#000000", "#000000", "#000000", "#000000"] // The "F... it, we ball" version of the midnight theme
}

const themevarnames = ["--bg-color", "--scrollbar-bar", "--scrollbar-bg", "--headerandfooter", "--button", "--buttonhover", "--popupbg"]
const currenttheme = await new Promise(resolve =>
    chrome.storage.local.get('theme', data => resolve(data.theme || "oceanblue"))
    ) ?? "oceanblue";

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

document.getElementById('themepicker').addEventListener('change', async function(e) {
    await chrome.storage.local.set({theme: e.target.value})
    updateTheme()
})