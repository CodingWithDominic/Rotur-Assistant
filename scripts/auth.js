import { openWarningPopup } from "../index.js";

// Moved here because google wants to avoid a potential XSS vulnerability with inline js in html
window.addEventListener('message', function(event) {
    // Verify the origin for security
    if (event.origin !== 'https://rotur.dev') {
        return;
    }

    // Handle authentication success
    if (event.data.type === 'rotur-auth-token') {
        // Authentication was successful
        const token = event.data.token;
        
        // Hide the iframe and show success message

        async function handleData() {
            const userjson = await fetch(`https://api.rotur.dev/get_user?auth=${token}`).then(res => res.json()).catch(err => console.error("Unable to fetch data"));
            if (!userjson) return;

            const name = userjson.username;
            if (!name) return;

            let userobject = {}
            userobject.name = name
            userobject.token = token
            userobject.uuid = userjson['sys.id']
            if (!userobject.uuid) {
                const userdata2 = await fetch(`https://api.rotur.dev/profile?name=${name}`).then(res => res.json()); // Failsafe in case E-mail or TOS is not accepted.
                userobject.uuid = userdata2.id
            }

            let activeacc = await new Promise(resolve =>
                chrome.storage.local.get('activeacc', data => resolve(data.activeacc || {}))
            ) ?? {};

            let existing_users = await new Promise(resolve =>
                chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
            ) ?? [];

            let flagged_accs = await new Promise(resolve =>
                chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
            ) ?? [];

            const exist_index = existing_users.findIndex(user => user.uuid === userobject.uuid);

            if ((existing_users.length > 0) && (exist_index > -1)) {
                if (existing_users[exist_index].name != name) {
                    existing_users[exist_index].name = name
                }
                if (existing_users[exist_index].token != token) {
                    existing_users[exist_index].token = token
                }
                if (flagged_accs.includes(existing_users[exist_index].uuid)) {
                    flagged_accs = flagged_accs.filter(acc => acc != existing_users[exist_index].uuid)
                    chrome.storage.local.set({flagged: flagged_accs})
                }
                chrome.storage.local.set({activeacc: existing_users[exist_index]})
            } else {
                existing_users.push(userobject);
                activeacc = existing_users[existing_users.length - 1]
                chrome.storage.local.set({ activeacc: activeacc });
            }
            if (token.startsWith('rotur_st_')) {
                chrome.storage.session.set({roturstwarning: true})
            }

            chrome.storage.local.set({ userdata: existing_users });
            chrome.storage.session.remove('sum_cache')
            
            window.location.replace('../pages/accounts.html')
        }
        handleData()
    }
});

// Show the iframe when page loads
window.onload = function() {
    document.getElementById('auth-iframe').style.display = 'block';
    document.getElementById('loading').style.display = 'none';
};

document.getElementById('requiredperms').addEventListener('click', function(e) {
    openWarningPopup('')
    document.getElementById('popupdialogue').innerHTML = `If you see a screen saying "Choose what to share" upon signing in, Rotur Assistant requires (bare minimum) Read-only, economy, and social permissions. Even if you do choose the mentioned permissions, a few parts of Rotur Assistant may still not work correctly with a sub-token. To ensure the smoothest experience (since Rotur Assistant was designed and tested primarily around the main token), choose "Full account access". If you are scared that Rotur Assistant may delete your account, mess with your settings, or steal all your credits, you can always check the extension's <a href="https://github.com/CodingWithDominic/Rotur-Assistant" target="_blank" rel="noopener noreferrer">source code</a>.`
    document.getElementById('overlay').querySelector('h1').textContent = "Notice"
    Array.from(document.getElementsByClassName('closebtn')).forEach(btn => {
        btn.addEventListener('click', function(e) {
            document.getElementById('overlay').style.display = 'none'
        })
    })
})