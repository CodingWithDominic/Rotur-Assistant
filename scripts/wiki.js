const default_app_settings =
{
    rows: 3,
    utils: true,
    social: true,
    misc: true
}

const app_settings = await new Promise(resolve =>
    chrome.storage.local.get('app_settings', data => resolve(data.app_settings || default_app_settings))
) ?? default_app_settings;

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

document.addEventListener('click', function(e) {
    if (e.target.className == 'appgridbtn') {
        window.location.href = `../pages/wiki_pages/${e.target.id}.html`
    }
})