document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);

    const currency = new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0
    });

    const categories = [
        "sueldos",
        "pensiones",
        "honorarios",
        "retiros",
        "dividendos",
        "intereses",
        "ganancias",
        "pension-alimenticia",
        "actividades-independientes"
    ];

    const format = (value) => currency.format(Number(value) || 0);

   const readPayload = () => {
    try {
        // PRIMERA OPCIÓN: sessionStorage
        const sessionData = sessionStorage.getItem(
            "simulador_fuas_comprobante"
        );

        console.log(
            "PASO 4 - sessionStorage:",
            sessionData
        );

        if (sessionData) {
            const payload = JSON.parse(sessionData);

            console.log(
                "PASO 4 - COMPROBANTE RECIBIDO DESDE SESSION STORAGE:",
                payload
            );

            return {
                ...payload,
                integrantes: Array.isArray(payload.integrantes)
                    ? payload.integrantes
                    : [],
                ingresos: Array.isArray(payload.ingresos)
                    ? payload.ingresos
                    : []
            };
        }

        // SEGUNDA OPCIÓN: localStorage
        const localData = localStorage.getItem(
            "simulador_fuas_comprobante"
        );

        console.log(
            "PASO 4 - localStorage:",
            localData
        );

        if (localData) {
            const payload = JSON.parse(localData);

            console.log(
                "PASO 4 - COMPROBANTE RECIBIDO DESDE LOCAL STORAGE:",
                payload
            );

            return {
                ...payload,
                integrantes: Array.isArray(payload.integrantes)
                    ? payload.integrantes
                    : [],
                ingresos: Array.isArray(payload.ingresos)
                    ? payload.ingresos
                    : []
            };
        }

       // TERCERA OPCIÓN: URL
const comprobanteUrl =
    params.get("comprobante") ||
    params.get("postulante");

console.log(
    "PASO 4 - datos encontrados en URL:",
    comprobanteUrl
);

if (comprobanteUrl) {
    const payload = JSON.parse(comprobanteUrl);

    console.log(
        "PASO 4 - DATOS RECIBIDOS DESDE URL:",
        payload
    );

    return {
        ...payload,
        integrantes: Array.isArray(payload.integrantes)
            ? payload.integrantes
            : [],
        ingresos: Array.isArray(payload.ingresos)
            ? payload.ingresos
            : []
    };
}

        console.warn(
            "PASO 4 - NO SE ENCONTRÓ COMPROBANTE"
        );

        return {
            integrantes: [],
            ingresos: []
        };

    } catch (error) {
        console.error(
            "PASO 4 - ERROR LEYENDO COMPROBANTE:",
            error
        );

        return {
            integrantes: [],
            ingresos: []
        };
    }
};


    const payload = readPayload();
    console.log("PAYLOAD FINAL:", payload);

    const members = payload.integrantes.length
        ? payload.integrantes
        : [{ numero: 1 }];

    const findIncome = (member, year, category) =>
        payload.ingresos.find(
            (item) =>
                item.member === member &&
                item.year === year &&
                item.category === category
        )?.value || "";

    const rowTotal = (member, year) =>
        categories.reduce(
            (sum, category) =>
                sum + (Number(findIncome(member, year, category)) || 0),
            0
        );

    const applicant =
        members.find((member) => member.relacion === "Postulante") ||
        members[0];

    const applicantName =
        [
            applicant.nombre,
            applicant.apellidoPaterno,
            applicant.apellidoMaterno
        ]
            .filter(Boolean)
            .join(" ") || "No informado";

    const receiptNumber =
        "SIM-2027-" +
        String(JSON.stringify(payload).length).padStart(6, "0");

    const details = [
        ["Nombre completo del postulante", applicantName],
        ["RUT", applicant.rut || "No informado"],
        [
            "Fecha de simulación",
            new Intl.DateTimeFormat("es-CL").format(new Date())
        ],
        ["Número de comprobante simulado", receiptNumber],
        ["Período de simulación", "2025 - 2026"]
    ];

    details.forEach(([term, description]) => {
        const dt = document.createElement("dt");
        dt.className = "col-sm-4 text-secondary";
        dt.textContent = term;

        const dd = document.createElement("dd");
        dd.className = "col-sm-8 fw-semibold";
        dd.textContent = description;

        document
            .getElementById("datos-comprobante")
            .append(dt, dd);
    });

    members.forEach((member) => {
        const row = document.createElement("tr");

        [
            member.nombre,
            member.apellidoPaterno,
            member.apellidoMaterno,
            member.rut,
            member.relacion,
            member.actividad
        ].forEach((value) => {
            const cell = document.createElement("td");
            cell.textContent = value || "";
            row.append(cell);
        });

        document.getElementById("familia-body").append(row);
    });

    members.forEach((member, index) => {
        [2025, 2026].forEach((year) => {
            const row = document.createElement("tr");

            const name = document.createElement("th");
            name.scope = "row";
            name.textContent =
                [
                    member.nombre,
                    member.apellidoPaterno,
                    member.apellidoMaterno
                ]
                    .filter(Boolean)
                    .join(" ") || `Integrante ${index + 1}`;

            row.append(name);

            const yearCell = document.createElement("td");
            yearCell.textContent = year;
            row.append(yearCell);

            categories.forEach((category) => {
                const cell = document.createElement("td");
                cell.textContent = format(
                    findIncome(index, year, category)
                );
                row.append(cell);
            });

            const total = document.createElement("td");
            total.textContent = format(rowTotal(index, year));
            row.append(total);

            document.getElementById("ingresos-body").append(row);
        });
    });

    const totalByYear = (year) =>
        members.reduce(
            (sum, member, index) =>
                sum + rowTotal(index, year),
            0
        );

    const total2025 = totalByYear(2025);
const total2026 = totalByYear(2026);

document.getElementById("promedio-2025").textContent =
  format(total2025);

document.getElementById("promedio-2026").textContent =
  format(total2026);

    const backQuery =
        new URLSearchParams({
            comprobante: JSON.stringify(payload)
        }).toString();

    document.getElementById("volver").href =
        `paso3.html?${backQuery}`;

    document
        .getElementById("imprimir")
        .addEventListener("click", () => {
            window.print();
        });

    const boton = document.getElementById("finalizar");

    boton.addEventListener("click", async () => {
        boton.disabled = true;

        try {
            const respuesta = await fetch(
                "https://script.google.com/macros/s/AKfycbz4Ykg_5-7lhcOlOTxZgtoCcttp0mOHDqHuJRmvd7S3STPZt7CsAGrFDCKvgiU_1tnI/exec",
                {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    body: JSON.stringify(payload)
                }
            );

           

            document
                .getElementById("mensaje-final")
                .classList.remove("d-none");

        } catch (error) {
            console.error(
                "Error al enviar los datos:",
                error
            );

            alert(
                "No fue posible guardar la información. Intenta nuevamente."
            );

            boton.disabled = false;
        }
    });
});