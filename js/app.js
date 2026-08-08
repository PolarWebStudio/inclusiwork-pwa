const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:5000/api"
        : "https://inclusiwork-api.onrender.com/api";

const userState = {
    username: "demo_user",
    balance: parseFloat(localStorage.getItem("inclusiwork_balance")) || 0,
    practiceBalance:
        parseFloat(localStorage.getItem("inclusiwork_practice_balance")) || 0,
    role: localStorage.getItem("inclusiwork_role") || "Operador",
    voiceEnabled: false
};

let currentOgadsOffers = [];
let currentTRM = 4000;
const MIN_WITHDRAWAL = 10000;

document.addEventListener("DOMContentLoaded", async () => {
    await fetchLiveTRM();
    actualizarInterfaz();
    syncBalanceWithBackend();
    loadMonlixOfferwall(userState.username);
    loadOgadsOffers();

    if (typeof loadTaskChannel === "function") {
        loadTaskChannel("api");
    }
});

async function fetchLiveTRM() {
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        if (response.ok) {
            const data = await response.json();
            if (data && data.rates && data.rates.COP) {
                currentTRM = Math.round(data.rates.COP);
            }
        }
    } catch (e) {
        console.warn("[InclusiWork] Usando TRM de respaldo:", e);
    }
}

function loadMonlixOfferwall(username = "demo_user") {
    const MONLIX_APP_ID = "AQUÍ_VA_TU_APP_ID";
    const container = document.getElementById("monlix-offerwall-container");
    if (!container) return;

    if (MONLIX_APP_ID === "AQUÍ_VA_TU_APP_ID") {
        container.innerHTML = `
      <div style="text-align: center; padding: 1.5rem 1rem; color: #555;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>
        <h4 style="margin-bottom: 0.5rem; color: #1a237e;">Muro en Proceso de Verificación</h4>
        <p style="max-width: 400px; margin: 0 auto; font-size: 0.85rem;">
          Estamos validando las credenciales de la red. Muy pronto podrás completar ofertas y sumar más saldo COP real.
        </p>
      </div>
    `;
    } else {
        const offerwallUrl = `https://offerwall.monlix.com/tag/${MONLIX_APP_ID}?userId=${encodeURIComponent(username)}`;
        container.innerHTML = `<iframe src="${offerwallUrl}" style="width: 100%; height: 500px; border: none;" title="Monlix Offerwall"></iframe>`;
    }
}

async function loadOgadsOffers() {
    const container = document.getElementById("ogads-offerwall-container");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/offers/ogads`);
        if (!response.ok) throw new Error("Error al obtener ofertas");

        const data = await response.json();
        if (data.offers && data.offers.length > 0) {
            currentOgadsOffers = data.offers;
            renderOgadsOffers(currentOgadsOffers);
        } else {
            container.innerHTML =
                '<p style="text-align: center; color: #555; padding: 1rem;">No hay ofertas de aplicaciones disponibles para tu ubicación en este momento.</p>';
        }
    } catch (err) {
        container.innerHTML =
            '<p style="text-align: center; color: #888; padding: 1rem;">Servicio de ofertas temporalmente no disponible.</p>';
    }
}

function renderOgadsOffers(offers) {
    const container = document.getElementById("ogads-offerwall-container");
    if (!container) return;

    if (!offers || offers.length === 0) {
        container.innerHTML =
            '<p style="text-align: center; color: #555; padding: 1rem;">No hay ofertas disponibles.</p>';
        return;
    }

    let html =
        '<div style="display: flex; flex-direction: column; gap: 12px;">';
    offers.forEach(offer => {
        const title = offer.translated_title || offer.name_short || offer.name;

        // Extraer la descripción o instrucción exacta desde cualquier propiedad enviada por la API
        const descRaw =
            offer.translated_desc ||
            offer.ad_description ||
            offer.instructions ||
            offer.description ||
            offer.requirements ||
            "";
        const desc = descRaw
            ? descRaw
            : "Instala y abre la aplicación para recibir la recompensa.";

        // Adjuntar subid del usuario
        let trackedLink = offer.link;
        if (trackedLink) {
            const separator = trackedLink.includes("?") ? "&" : "?";
            trackedLink = `${trackedLink}${separator}subid=${encodeURIComponent(userState.username)}`;
        }

        html += `
            <div style="border: 1px solid #d1d5db; padding: 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; background: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.03);">
                <div style="flex: 1;">
                    <strong style="display: block; font-size: 0.95rem; color: #1a237e; font-weight: 700;">${title}</strong>
                    <div style="margin-top: 6px; padding: 6px 8px; background: #f0f4f8; border-left: 3px solid #1a237e; border-radius: 4px;">
                        <span style="display: block; font-size: 0.75rem; color: #1a237e; font-weight: bold; text-transform: uppercase;">¿Qué debes hacer?</span>
                        <p style="font-size: 0.82rem; color: #374151; margin-top: 2px; line-height: 1.35;">${desc}</p>
                    </div>
                </div>
                <a href="${trackedLink}" target="_blank" rel="noopener noreferrer" style="background: #2e7d32; color: white; padding: 10px 14px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 0.85rem; text-align: center; flex-shrink: 0; align-self: center; box-shadow: 0 2px 4px rgba(46,125,50,0.2);">
                    Ganar +$${roundReward(offer.payout)} COP
                </a>
            </div>
        `;
    });
    html += "</div>";
    container.innerHTML = html;
}

async function toggleOgadsLanguage() {
    const langSelect = document.getElementById("ogads-lang-select");
    const selectedLang = langSelect ? langSelect.value : "original";
    const container = document.getElementById("ogads-offerwall-container");

    if (selectedLang === "original") {
        currentOgadsOffers.forEach(offer => {
            delete offer.translated_title;
            delete offer.translated_desc;
        });
        renderOgadsOffers(currentOgadsOffers);
        return;
    }

    if (selectedLang === "es") {
        container.innerHTML =
            '<p style="text-align: center; color: #1a237e; padding: 1.5rem;">Traduciendo ofertas e instrucciones...</p>';

        for (let offer of currentOgadsOffers) {
            const rawTitle = offer.name_short || offer.name;
            const rawDesc =
                offer.ad_description ||
                offer.instructions ||
                offer.description ||
                "";

            if (!offer.translated_title)
                offer.translated_title = await translateText(rawTitle, "es");
            if (rawDesc && !offer.translated_desc)
                offer.translated_desc = await translateText(rawDesc, "es");
        }
        renderOgadsOffers(currentOgadsOffers);
    }
}

async function translateText(text, targetLang = "es") {
    if (!text || text.trim() === "") return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data[0].map(item => item[0]).join("");
    } catch (e) {
        return text;
    }
}

function roundReward(payoutUsd) {
    const margin = 0.8;
    return Math.round(parseFloat(payoutUsd || 0) * currentTRM * margin);
}

async function syncBalanceWithBackend() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/user/balance?username=${userState.username}`
        );
        if (response.ok) {
            const data = await response.json();
            userState.balance = data.balance;
            userState.practiceBalance = data.practice_balance;
            localStorage.setItem("inclusiwork_balance", data.balance);
            localStorage.setItem(
                "inclusiwork_practice_balance",
                data.practice_balance
            );
            actualizarInterfaz();
        }
    } catch (error) {
        console.warn("[PWA] Servidor Offline. Usando caché local:", error);
    }
}

function actualizarInterfaz() {
    const balanceEl = document.getElementById("user-balance");
    if (balanceEl) {
        balanceEl.textContent = `$${userState.balance.toLocaleString("es-CO", { minimumFractionDigits: 2 })} COP`;
    }

    const practiceEl = document.getElementById("user-practice-balance");
    if (practiceEl) {
        practiceEl.textContent = `${userState.practiceBalance.toLocaleString("es-CO")} pts`;
    }

    const trmEl = document.getElementById("trm-indicator");
    if (trmEl) {
        trmEl.textContent = `1 USD ≈ $${currentTRM.toLocaleString("es-CO")} COP`;
    }

    const roleEl = document.getElementById("role-indicator");
    if (roleEl) {
        roleEl.textContent = `Modo: ${userState.role}`;
    }
}

function switchUserRole() {
    userState.role = userState.role === "Operador" ? "Tutor" : "Operador";
    localStorage.setItem("inclusiwork_role", userState.role);
    actualizarInterfaz();
    const mensaje = `Modo cambiado a ${userState.role}.`;
    alert(mensaje);
    leerTexto(mensaje);
}

function toggleVoiceAssist() {
    userState.voiceEnabled = !userState.voiceEnabled;
    const btn = document.getElementById("btn-voice");

    if (userState.voiceEnabled) {
        if (btn) btn.style.background = "rgba(76, 175, 80, 0.5)";
        leerTexto("Asistente de voz activado.");
    } else {
        if (btn) btn.style.background = "rgba(255, 255, 255, 0.2)";
        window.speechSynthesis.cancel();
    }
}

function leerTexto(texto) {
    if (!userState.voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CO";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

function selectChannel(channelId) {
    document
        .querySelectorAll(".channel-card")
        .forEach(card => card.classList.remove("active"));
    const targetCard = document.getElementById(`chan-${channelId}`);
    if (targetCard) targetCard.classList.add("active");

    if (typeof loadTaskChannel === "function") {
        loadTaskChannel(channelId);
    }
}

/* MODAL DE TÉRMINOS Y CONDICIONES */
function openTermsModal() {
    const modal = document.getElementById("terms-modal");
    if (modal) {
        modal.classList.remove("hidden");
        leerTexto("Abriendo reglas y políticas de retiro.");
    }
}

function closeTermsModal() {
    const modal = document.getElementById("terms-modal");
    if (modal) modal.classList.add("hidden");
}

/* SISTEMA DE RETIRO */
function openPaymentModal() {
    const modal = document.getElementById("payment-modal");
    if (modal) {
        modal.classList.remove("hidden");
        leerTexto("Abriendo ventana de retiros.");
    }
}

function closePaymentModal() {
    const modal = document.getElementById("payment-modal");
    if (modal) modal.classList.add("hidden");
}

async function requestWithdrawal(method) {
    if (userState.balance < MIN_WITHDRAWAL) {
        const errorMsg = `Saldo insuficiente. El monto mínimo para retirar es de $${MIN_WITHDRAWAL.toLocaleString("es-CO")} COP.`;
        alert(errorMsg);
        leerTexto(errorMsg);
        return;
    }

    let accountInfo = prompt(
        `Estás solicitando un retiro vía ${method}.\nPor favor ingresa tu número de cuenta o celular:`
    );
    if (!accountInfo || accountInfo.trim() === "") {
        alert("Operación cancelada.");
        return;
    }

    const confirmacion = confirm(
        `¿Confirmas el retiro de $${userState.balance.toLocaleString("es-CO")} COP a ${method} (${accountInfo})?`
    );
    if (confirmacion) {
        const retiroMonto = userState.balance;
        userState.balance = 0;
        localStorage.setItem("inclusiwork_balance", userState.balance);
        actualizarInterfaz();
        closePaymentModal();
        alert(
            `¡Solicitud de retiro enviada! $${retiroMonto.toLocaleString("es-CO")} COP procesados hacia ${method}.`
        );
    }
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .catch(err => console.error("SW error:", err));
    });
}
