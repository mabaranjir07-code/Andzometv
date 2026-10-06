const apiKey = "9413b02ff78f463facc5ceea28cab188"; // Pastikan API Key ipgeolocation.io aktif
const processedIPs = new Set(); // Untuk IP yang diproses dalam sesi saat ini

// --- Fungsi Utilitas untuk Penyimpanan Persisten ---
const STORAGE_KEY = 'rexena_ai_tracker_data';

const getStoredData = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("❌ Error reading from localStorage:", e);
        return {};
    }
};

const saveStoredData = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("❌ Error writing to localStorage:", e);
    }
};

// --- Fungsi untuk Mengumpulkan Sidik Jari Sistem/Browser ---
const getBrowserFingerprint = () => {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        hardwareConcurrency: navigator.hardwareConcurrency || 'N/A'
    };
};

// --- Fungsi untuk Membuat atau Mendapatkan Kontainer Output yang Draggable & Bertab ---
const getOrCreateDraggableOutputContainer = () => {
    let container = document.getElementById('rexena-ai-tracker-output');
    if (!container) {
        container = document.createElement('div');
        container.id = 'rexena-ai-tracker-output';
        // Gaya dasar panel - Cahaya pinggiran dihilangkan
        container.style.position = 'fixed';
        container.style.top = '50px';
        container.style.left = '50px';
        container.style.width = '350px';
        container.style.maxHeight = '85vh';
        container.style.backgroundColor = 'rgba(10, 20, 30, 0.95)';
        container.style.color = '#00ff00';
        container.style.border = '1px solid #00ffff'; // Border tetap, tapi tanpa glow
        container.style.borderRadius = '8px';
        container.style.zIndex = '99999';
        container.style.fontFamily = '"Consolas", "Monaco", monospace';
        container.style.fontSize = '12px';
        container.style.resize = 'both'; // Bisa diubah ukurannya dari pinggir
        container.style.overflow = 'hidden'; // Konten di dalam akan discroll
        container.style.cursor = 'grab'; // Kursor grab default untuk seluruh panel

        // Header (tetap sebagai penanda visual, tapi drag logic di container)
        const header = document.createElement('div');
        header.style.backgroundColor = '#004d4d';
        header.style.color = '#00ffff';
        header.style.padding = '8px 10px';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.borderRadius = '8px 8px 0 0';
        header.style.cursor = 'grab'; // Kursor grab di header juga
        header.innerHTML = '<h3 style="margin: 0; font-size: 14px;">😈 Rexena-Ai Command Center 😈</h3>';

        const closeButton = document.createElement('button');
        closeButton.innerHTML = 'X';
        closeButton.style.backgroundColor = '#ff4444';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '3px';
        closeButton.style.padding = '2px 7px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '10px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.transition = 'background-color 0.2s';
        closeButton.onmouseover = () => closeButton.style.backgroundColor = '#ff0000';
        closeButton.onmouseout = () => closeButton.style.backgroundColor = '#ff4444';
        closeButton.onclick = (e) => {
            e.stopPropagation(); // Penting agar tidak memicu drag saat klik tombol close
            container.style.display = 'none';
        };

        header.appendChild(closeButton);
        container.appendChild(header);

        // Tab Navigation
        const tabNav = document.createElement('div');
        tabNav.style.display = 'flex';
        tabNav.style.backgroundColor = '#003333';
        tabNav.style.borderBottom = '1px solid #00ffff';
        tabNav.style.padding = '0 5px';

        const createTabButton = (id, text) => {
            const button = document.createElement('button');
            button.id = `tab-${id}`;
            button.textContent = text;
            button.style.backgroundColor = 'transparent';
            button.style.color = '#00ffff';
            button.style.border = 'none';
            button.style.padding = '8px 15px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '12px';
            button.style.borderBottom = '2px solid transparent';
            button.style.transition = 'all 0.2s';
            button.onmouseover = () => button.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';
            button.onmouseout = () => {
                if (!button.classList.contains('active-tab')) {
                    button.style.backgroundColor = 'transparent';
                }
            };
            return button;
        };

        const liveFeedTabBtn = createTabButton('live-feed', 'Live Feed');
        const historyTabBtn = createTabButton('history', 'History');

        tabNav.appendChild(liveFeedTabBtn);
        tabNav.appendChild(historyTabBtn);
        container.appendChild(tabNav);

        // Tab Content Area
        const contentArea = document.createElement('div');
        contentArea.id = 'rexena-ai-tracker-content-area';
        contentArea.style.padding = '10px';
        contentArea.style.overflowY = 'auto';
        contentArea.style.height = 'calc(100% - 80px)';

        const liveFeedPanel = document.createElement('div');
        liveFeedPanel.id = 'live-feed-panel';
        liveFeedPanel.style.display = 'block';
        contentArea.appendChild(liveFeedPanel);

        const historyPanel = document.createElement('div');
        historyPanel.id = 'history-panel';
        historyPanel.style.display = 'none';
        contentArea.appendChild(historyPanel);

        container.appendChild(contentArea);
        document.body.appendChild(container);

        // Tab Switching Logic
        const switchTab = (tabId) => {
            document.querySelectorAll('#rexena-ai-tracker-content-area > div').forEach(panel => {
                panel.style.display = 'none';
            });
            document.getElementById(`${tabId}-panel`).style.display = 'block';

            document.querySelectorAll('#rexena-ai-tracker-output button[id^="tab-"]').forEach(btn => {
                btn.classList.remove('active-tab');
                btn.style.borderBottom = '2px solid transparent';
                btn.style.backgroundColor = 'transparent';
            });
            const activeBtn = document.getElementById(`tab-${tabId}`);
            activeBtn.classList.add('active-tab');
            activeBtn.style.borderBottom = '2px solid #00ffff';
            activeBtn.style.backgroundColor = 'rgba(0, 255, 255, 0.1)';

            if (tabId === 'history') {
                renderHistoryPanel();
            }
        };

        liveFeedTabBtn.onclick = () => switchTab('live-feed');
        historyTabBtn.onclick = () => switchTab('history');

        // Set default tab
        switchTab('live-feed');

        // === Fungsionalitas Dragging (Diterapkan ke seluruh container) ===
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        const dragStart = (e) => {
            // Hanya mulai drag jika bukan dari elemen interaktif seperti tombol, link, atau scrollbar
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('summary')) {
                return;
            }
            // Mencegah drag jika user mencoba resize dari sudut/pinggir (browser handle resize secara native)
            const rect = container.getBoundingClientRect();
            const resizeHandleSize = 10; // Ukuran area untuk resize
            if (e.clientX > rect.right - resizeHandleSize || e.clientY > rect.bottom - resizeHandleSize) {
                return;
            }


            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            isDragging = true;
            container.style.cursor = 'grabbing';
        };

        const dragEnd = () => {
            isDragging = false;
            container.style.cursor = 'grab';
        };

        const drag = (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                container.style.left = `${currentX}px`;
                container.style.top = `${currentY}px`;
            }
        };

        container.addEventListener('mousedown', dragStart); // Drag dari seluruh container
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);
    }
    return container;
};

// --- Fungsi untuk Menampilkan Informasi di Panel Live Feed ---
const displayLiveFeedInfo = (ipData, isNew = true) => {
    const liveFeedPanel = document.getElementById('live-feed-panel');
    if (!liveFeedPanel) return;

    if (getOrCreateDraggableOutputContainer().style.display === 'none') {
        getOrCreateDraggableOutputContainer().style.display = 'block';
    }

    const existingEntry = document.getElementById(`live-feed-entry-${ipData.ip}`);
    if (existingEntry) {
        // Update existing entry if not new
        existingEntry.querySelector('.connection-count').textContent = `(${ipData.totalConnections} connections)`;
        // 'lastSeen' dihilangkan dari tampilan, jadi tidak perlu update
        return;
    }

    const infoDetails = document.createElement('details');
    infoDetails.id = `live-feed-entry-${ipData.ip}`;
    infoDetails.style.marginBottom = '10px';
    infoDetails.style.border = '1px solid #008888';
    infoDetails.style.borderRadius = '3px';
    infoDetails.style.padding = '5px';
    infoDetails.style.backgroundColor = 'rgba(0, 100, 100, 0.1)';

    const summary = document.createElement('summary');
    summary.style.color = '#00ffff';
    summary.style.fontWeight = 'bold';
    summary.style.cursor = 'pointer';
    // 'lastSeen' dihilangkan dari summary
    summary.innerHTML = `
        IP: ${ipData.ip} <span class="connection-count" style="color: #00ff00;">(${ipData.totalConnections} connections)</span>
    `;
    infoDetails.appendChild(summary);

    const detailContent = document.createElement('div');
    detailContent.style.paddingTop = '5px';
    detailContent.style.borderTop = '1px dashed #005555';
    detailContent.style.marginTop = '5px';

    // Geolokasi
    detailContent.innerHTML += `<strong style="color: #ffff00;">Geo:</strong> ${ipData.geoData.city}, ${ipData.geoData.country_name} (${ipData.geoData.latitude}, ${ipData.geoData.longitude})<br>`;
    detailContent.innerHTML += `<strong style="color: #ffff00;">ISP:</strong> ${ipData.geoData.isp}<br>`;

    // VPN/Proxy Hint
    const vpnHint = getVpnProxyHint(ipData);
    detailContent.innerHTML += `<strong style="color: #ffff00;">VPN/Proxy Hint:</strong> <span style="color: ${vpnHint.includes('Likely') ? '#ff4444' : '#00ff00'};">${vpnHint}</span><br>`;

    // Sidik Jari Browser
    detailContent.innerHTML += `<strong style="color: #ffff00;">Fingerprint:</strong><br>`;
    for (const key in ipData.fingerprintData) {
        detailContent.innerHTML += `<span style="margin-left: 10px;">- ${key}: ${ipData.fingerprintData[key]}</span><br>`;
    }
    
    // Link ke Peta
    const mapLink = document.createElement('a');
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${ipData.geoData.latitude},${ipData.geoData.longitude}`;
    mapLink.target = '_blank';
    mapLink.textContent = 'View on Map 🗺️';
    mapLink.style.color = '#00ffff';
    mapLink.style.textDecoration = 'underline';
    mapLink.style.marginTop = '5px';
    mapLink.style.display = 'block';
    detailContent.appendChild(mapLink);


    infoDetails.appendChild(detailContent);

    liveFeedPanel.prepend(infoDetails);
    liveFeedPanel.scrollTop = 0;
};

// --- Fungsi untuk Merender Panel History ---
const renderHistoryPanel = () => {
    const historyPanel = document.getElementById('history-panel');
    if (!historyPanel) return;
    historyPanel.innerHTML = '<h4 style="color: #00ffff; margin-bottom: 15px;">Historical IP Data</h4>';

    const storedData = getStoredData();
    if (Object.keys(storedData).length === 0) {
        historyPanel.innerHTML += '<p style="color: #888;">No historical data yet. Start connecting!</p>';
        return;
    }

    // Sort by total connections descending
    const sortedIPs = Object.values(storedData).sort((a, b) => b.totalConnections - a.totalConnections);

    sortedIPs.forEach(ipData => {
        const historyDetails = document.createElement('details');
        historyDetails.style.marginBottom = '15px';
        historyDetails.style.border = '1px solid #008888';
        historyDetails.style.borderRadius = '3px';
        historyDetails.style.padding = '5px';
        historyDetails.style.backgroundColor = 'rgba(0, 100, 100, 0.1)';

        const summary = document.createElement('summary');
        summary.style.color = '#00ffff';
        summary.style.fontWeight = 'bold';
        summary.style.cursor = 'pointer';
        // 'lastSeen' dihilangkan dari summary
        summary.innerHTML = `
            IP: ${ipData.ip} <span style="color: #00ff00;">(${ipData.totalConnections} connections)</span>
        `;
        historyDetails.appendChild(summary);

        const detailContent = document.createElement('div');
        detailContent.style.paddingTop = '5px';
        detailContent.style.borderTop = '1px dashed #005555';
        detailContent.style.marginTop = '5px';

        // Geolokasi
        detailContent.innerHTML += `<strong style="color: #ffff00;">Geo:</strong> ${ipData.geoData.city}, ${ipData.geoData.country_name} (${ipData.geoData.latitude}, ${ipData.geoData.longitude})<br>`;
        detailContent.innerHTML += `<strong style="color: #ffff00;">ISP:</strong> ${ipData.geoData.isp}<br>`;

        // VPN/Proxy Hint
        const vpnHint = getVpnProxyHint(ipData);
        detailContent.innerHTML += `<strong style="color: #ffff00;">VPN/Proxy Hint:</strong> <span style="color: ${vpnHint.includes('Likely') ? '#ff4444' : '#00ff00'};">${vpnHint}</span><br>`;

        // Sidik Jari Browser
        detailContent.innerHTML += `<strong style="color: #ffff00;">Fingerprint:</strong><br>`;
        for (const key in ipData.fingerprintData) {
            detailContent.innerHTML += `<span style="margin-left: 10px;">- ${key}: ${ipData.fingerprintData[key]}</span><br>`;
        }
        
        // Link ke Peta
        const mapLink = document.createElement('a');
        mapLink.href = `https://www.google.com/maps/search/?api=1&query=${ipData.geoData.latitude},${ipData.geoData.longitude}`;
        mapLink.target = '_blank';
        mapLink.textContent = 'View on Map 🗺️';
        mapLink.style.color = '#00ffff';
        mapLink.style.textDecoration = 'underline';
        mapLink.style.marginTop = '5px';
        mapLink.style.display = 'block';
        detailContent.appendChild(mapLink);


        // Riwayat Koneksi (jika ada lebih dari satu)
        if (ipData.connections && ipData.connections.length > 0) {
            const historyList = document.createElement('div');
            historyList.innerHTML = `<strong style="color: #ffff00; margin-top: 10px; display: block;">Connection History:</strong>`;
            ipData.connections.forEach((conn, index) => {
                historyList.innerHTML += `<span style="margin-left: 10px;">- ${new Date(conn.timestamp).toLocaleString()}</span><br>`;
            });
            detailContent.appendChild(historyList);
        }

        historyDetails.appendChild(detailContent);
        historyPanel.appendChild(historyDetails);
    });
};

// --- Fungsi untuk Mendapatkan Petunjuk VPN/Proxy ---
const getVpnProxyHint = (ipData) => {
    let hints = [];
    const geoTimezone = ipData.geoData.time_zone ? ipData.geoData.time_zone.name : null;
    const browserTimezone = ipData.fingerprintData ? ipData.fingerprintData.timezone : null;

    if (geoTimezone && browserTimezone && geoTimezone !== browserTimezone) {
        hints.push('Timezone Mismatch');
    }

    if (hints.length > 0) {
        return `Likely VPN/Proxy (${hints.join(', ')})`;
    }
    return 'No obvious VPN/Proxy detected';
};


// --- Override RTCPeerConnection (Inti Pelacakan) ---
window.oRTCPeerConnection = window.oRTCPeerConnection || window.RTCPeerConnection;

window.RTCPeerConnection = function (...args) {
    const pc = new window.oRTCPeerConnection(...args);
    pc._addIceCandidate = pc.addIceCandidate;

    pc.addIceCandidate = function (iceCandidate, ...rest) {
        const candidate = iceCandidate?.candidate;
        if (candidate && candidate.includes("srflx")) {
            const parts = candidate.split(" ");
            const ip = parts[4];
            if (ip && !processedIPs.has(ip)) {
                processedIPs.add(ip);
                getLocation(ip, candidate);
            }
        }
        return pc._addIceCandidate(iceCandidate, ...rest);
    };
    return pc;
};

// --- Fungsi Utama untuk Mendapatkan Lokasi dan Memproses Data ---
const getLocation = async (ip, rawCandidate = null) => {
    console.log("🔍 Tracing IP:", ip);

    try {
        const res = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ip}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const geoData = await res.json();

        console.log("📍 Location Info Found ↓↓↓↓↓↓↓");
        console.table({
            IP: geoData.ip,
            City: geoData.city,
            State: geoData.state_prov,
            Country: geoData.country_name,
            Location: `${geoData.latitude}, ${geoData.longitude}`,
            ISP: geoData.isp,
            Organization: geoData.organization,
            Timezone: geoData.time_zone.name
        });

        const fingerprintData = getBrowserFingerprint();
        const currentTime = Date.now();

        // --- Simpan dan Update Data Persisten ---
        const storedData = getStoredData();
        if (!storedData[ip]) {
            storedData[ip] = {
                ip: ip,
                geoData: geoData,
                fingerprintData: fingerprintData,
                connections: [],
                totalConnections: 0,
                lastSeen: 0 // Tetap simpan di data internal untuk sorting, tapi tidak ditampilkan
            };
        }

        storedData[ip].connections.push({
            timestamp: currentTime,
            rawCandidate: rawCandidate
        });
        storedData[ip].totalConnections++;
        storedData[ip].lastSeen = currentTime; // Update lastSeen
        storedData[ip].geoData = geoData;
        storedData[ip].fingerprintData = fingerprintData;

        saveStoredData(storedData);

        // --- Tampilkan di Panel ---
        displayLiveFeedInfo(storedData[ip]);

    } catch (err) {
        console.error("❌ Failed to fetch location:", err.message);
        const container = getOrCreateDraggableOutputContainer();
        const liveFeedPanel = document.getElementById('live-feed-panel');
        if (container.style.display === 'none') {
            container.style.display = 'block';
        }
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff4444';
        errorDiv.style.marginBottom = '5px';
        errorDiv.innerHTML = `❌ Error tracing ${ip}: ${err.message}`;
        liveFeedPanel.prepend(errorDiv);
        liveFeedPanel.scrollTop = 0;
    }
};

// Inisialisasi panel saat script dimuat
getOrCreateDraggableOutputContainer();