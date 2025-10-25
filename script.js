javascript
function startFlood() {
    const target = document.getElementById('target').value;
    const statusDiv = document.getElementById('status');
    let reportsSent = 0;

    if (!target) {
        statusDiv.innerHTML = 'Please enter a target username or channel link.';
        return;
    }

    statusDiv.innerHTML = 'Flooding reports...';

    const floodInterval = setInterval(() => {
        fetch(`https://api.telegram.org/bot<8021598214:AAF-6-530XLoDwvLLozV0Gs6Tz8ulFTW-ho>/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: '@spambot',
                text: `/report ${target} spam`
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                reportsSent++;
                statusDiv.innerHTML = `Reports sent: ${reportsSent}`;
            } else {
                clearInterval(floodInterval);
                statusDiv.innerHTML = 'Flooding stopped. Target might be banned.';
            }
        })
        .catch(error => {
            clearInterval(floodInterval);
            statusDiv.innerHTML = 'Error occurred. Flooding stopped.';
        });
    }, 1000); // Adjust the interval as needed
}
