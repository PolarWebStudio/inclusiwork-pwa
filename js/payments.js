// js/payments.js

const MIN_WITHDRAWAL = 10000; // 10.000 COP mínimo para retirar

function openPaymentModal() {
    document.getElementById("payment-modal").classList.remove("hidden");
    leerTexto("Opciones de retiro abiertas. Selecciona tu método de pago.");
}

function closePaymentModal() {
    document.getElementById("payment-modal").classList.add("hidden");
}

function requestWithdrawal(method) {
    if (userState.balance < MIN_WITHDRAWAL) {
        const errorMsg = `No tienes saldo suficiente. El mínimo de retiro es $${MIN_WITHDRAWAL.toLocaleString("es-CO")} COP.`;
        alert(errorMsg);
        leerTexto(errorMsg);
        return;
    }

    const confirmMsg = `¿Confirmas el retiro de $${userState.balance.toLocaleString("es-CO")} COP hacia tu cuenta de ${method}?`;
    if (confirm(confirmMsg)) {
        // Simular el proceso de retiro
        alert(
            `¡Solicitud enviada a ${method}! El dinero se reflejará en un máximo de 24 horas hábiles.`
        );
        leerTexto(`Retiro procesado hacia ${method}.`);

        // Resetear saldo
        userState.balance = 0;
        localStorage.setItem("inclusiwork_balance", userState.balance);
        actualizarInterfaz();
        closePaymentModal();
    }
}

