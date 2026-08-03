// --- SISTEMA DE PAGOS Y RETIROS (InclusiWork) ---

const MIN_WITHDRAWAL = 10000; // 10.000 COP mínimo para retirar

// Abrir el modal de pagos
function openPaymentModal() {
    const modal = document.getElementById("payment-modal");
    if (modal) {
        modal.classList.remove("hidden");
        if (typeof leerTexto === "function") {
            leerTexto(
                "Abriendo ventana de retiros. Selecciona tu método de pago."
            );
        }
    }
}

// Cerrar el modal de pagos
function closePaymentModal() {
    const modal = document.getElementById("payment-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

// Solicitar Retiro (Nequi, Daviplata, Binance)
async function requestWithdrawal(method) {
    if (userState.balance < MIN_WITHDRAWAL) {
        const errorMsg = `Saldo insuficiente. El monto mínimo para retirar es de $${MIN_WITHDRAWAL.toLocaleString("es-CO")} COP.`;
        alert(errorMsg);
        if (typeof leerTexto === "function") {
            leerTexto(errorMsg);
        }
        return;
    }

    // Pedir datos de la cuenta según el método seleccionado
    let accountInfo = prompt(
        `Estás solicitando un retiro vía ${method}.\nPor favor ingresa tu número de celular o cuenta de destino:`
    );

    if (!accountInfo || accountInfo.trim() === "") {
        alert("Operación cancelada. Debes ingresar un destino válido.");
        return;
    }

    // Confirmación del retiro
    const confirmacion = confirm(
        `¿Confirmas el retiro de $${userState.balance.toLocaleString("es-CO")} COP a tu cuenta de ${method} (${accountInfo})?`
    );

    if (confirmacion) {
        const retiroMonto = userState.balance;
        userState.balance = 0; // Se descuenta el saldo local

        // Guardar nuevo saldo en localStorage
        localStorage.setItem("inclusiwork_balance", userState.balance);

        // Actualizar interfaz
        if (typeof actualizarInterfaz === "function") {
            actualizarInterfaz();
        }

        closePaymentModal();

        const successMsg = `¡Solicitud de retiro exitosa! Se han enviado $${retiroMonto.toLocaleString("es-CO")} COP a tu ${method} (${accountInfo}). Procesando transferencia...`;
        alert(successMsg);

        if (typeof leerTexto === "function") {
            leerTexto(
                "Retiro solicitado con éxito. Pronto verás los fondos en tu cuenta."
            );
        }
    }
}
