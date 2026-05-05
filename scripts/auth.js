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
            const userjson = await fetch(`https://social.rotur.dev/get_user?auth=${token}`).then(res => res.json()).catch(err => console.error("Unable to fetch data"));
            if (!userjson) return;

            const name = userjson.username;
            if (!name) return;

            let userobject = {}
            userobject.name = name
            userobject.token = token
            userobject.uuid = userjson['sys.id']

            let activeacc = await new Promise(resolve =>
                chrome.storage.local.get('activeacc', data => resolve(data.activeacc || []))
            ) ?? [];

            let existing_users = await new Promise(resolve =>
                chrome.storage.local.get('userdata', data => resolve(data.userdata || []))
            ) ?? [];

            let flagged_accs = await new Promise(resolve =>
                chrome.storage.local.get('flagged', data => resolve(data.flagged || []))
            ) ?? [];

            const exist_index = existing_users.findIndex(user => user.uuid === userobject.uuid);

            if ((existing_users.length > 0) && (exist_index > -1)) {
                if (existing_users[exist_index].uuid == userobject.uuid) {
                    console.log('This user is already authenticated');
                }
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
                if (activeacc.uuid == existing_users[exist_index].uuid) {
                    chrome.storage.local.set({activeacc: existing_users[exist_index]})
                }
            } else {
                existing_users.push(userobject);
            }

            chrome.storage.local.set({ userdata: existing_users });

            if (Object.keys(activeacc).length == 0) {
                activeacc = existing_users[existing_users.length - 1]
                chrome.storage.local.set({ activeacc: activeacc });
            }
            
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