// Side Menu & Overlay Toggle
const menuToggleBtn = document.getElementById('menuToggleBtn');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

menuToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sideMenu.classList.toggle('active');
    menuOverlay.style.display = sideMenu.classList.contains('active') ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
    if (!sideMenu.contains(e.target) && e.target !== menuToggleBtn) {
        sideMenu.classList.remove('active');
        menuOverlay.style.display = 'none';
    }
});

// Menu Options Hide/Show
function toggleMenuInfo(btnId, infoId) {
    document.getElementById(btnId).addEventListener('click', (e) => {
        e.stopPropagation(); 
        const infoBox = document.getElementById(infoId);
        if (infoBox.style.display === 'block') {
            infoBox.style.display = 'none';
        } else {
            document.querySelectorAll('.menu-info-box').forEach(box => box.style.display = 'none');
            infoBox.style.display = 'block';
        }
    });
}

toggleMenuInfo('versionBtn', 'versionInfo');
toggleMenuInfo('manualBtn', 'manualInfo');
toggleMenuInfo('contactBtn', 'contactInfo');

// Tab Switching
const pairTabBtn = document.getElementById('pairTabBtn');
const qrTabBtn = document.getElementById('qrTabBtn');
const pairCodeView = document.getElementById('pairCodeView');
const qrCodeView = document.getElementById('qrCodeView');

pairTabBtn.addEventListener('click', () => {
    pairTabBtn.classList.add('active');
    qrTabBtn.classList.remove('active');
    pairCodeView.style.display = 'block';
    qrCodeView.style.display = 'none';
});

qrTabBtn.addEventListener('click', () => {
    qrTabBtn.classList.add('active');
    pairTabBtn.classList.remove('active');
    pairCodeView.style.display = 'none';
    qrCodeView.style.display = 'block';
});

// Generator Logic
const linkBtn = document.getElementById('linkBtn');
const loaderContainer = document.getElementById('loaderContainer');
const statusBox = document.getElementById('statusBox');
const statusHeading = document.getElementById('statusHeading');
const codeWrapper = document.getElementById('codeWrapper');
const codeText = document.getElementById('codeText');
const congratsText = document.getElementById('congratsText');
const copyBtn = document.getElementById('copyBtn');

linkBtn.addEventListener('click', () => {
    const phoneInput = document.querySelector('.phone-input').value.trim();

    statusBox.style.display = 'none';
    loaderContainer.style.display = 'block';

    setTimeout(() => {
        loaderContainer.style.display = 'none';

        if (phoneInput.length < 9 || isNaN(phoneInput)) {
            statusHeading.innerText = "ERROR OCCURRED";
            statusHeading.style.color = "#ff0000";
            codeWrapper.style.display = "none";
            congratsText.innerText = "❌ Code Not Found";
            congratsText.style.color = "#ff0000";
            statusBox.style.display = 'block';
            return;
        }

        statusHeading.innerText = "YOUR PAIRING CODE";
        statusHeading.style.color = "#ffcc00";
        codeWrapper.style.display = "flex"; 
        
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomCode = 'SASI-';
        for (let i = 0; i < 4; i++) {
            randomCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        codeText.innerText = randomCode;
        congratsText.innerText = "🎉 Congratulations! Code Generated.";
        congratsText.style.color = "#2ecc71";
        statusBox.style.display = 'block';
        copyBtn.innerText = "📋 Copy"; 
    }, 1500); 
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeText.innerText).then(() => {
        copyBtn.innerText = "✅ Copied!";
    });
});
