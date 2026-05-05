function calculateTimePassed() {
    const pastDate = new Date('2007-07-10T00:00:00Z');
    const now = new Date();
    const diffInMs = now - pastDate;
    const msInYear = 1000 * 60 * 60 * 24 * 365.25;
    const yearsPassed = Math.floor(diffInMs / msInYear);
    return yearsPassed;
}

let text = document.getElementById('mistiumageplaceholder').innerText
text = text.replace('..', calculateTimePassed())
document.getElementById('mistiumageplaceholder').innerText = text