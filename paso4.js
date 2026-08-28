document.addEventListener("DOMContentLoaded", () => {
	const params = new URLSearchParams(window.location.search);
	const currency = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
	const categories = ["sueldos", "pensiones", "honorarios", "retiros", "dividendos", "intereses", "ganancias", "pension-alimenticia", "actividades-independientes"];
	const format = (value) => currency.format(Number(value) || 0);
	const readPayload = () => {
		try {
			const payload = JSON.parse(params.get("comprobante") || "{}");
			return { integrantes: Array.isArray(payload.integrantes) ? payload.integrantes : [], ingresos: Array.isArray(payload.ingresos) ? payload.ingresos : [] };
		} catch {
			return { integrantes: [], ingresos: [] };
		}
	};
	const payload = readPayload();
	const members = payload.integrantes.length ? payload.integrantes : [{ numero: 1 }];
	const findIncome = (member, year, category) => payload.ingresos.find((item) => item.member === member && item.year === year && item.category === category)?.value || "";
	const rowTotal = (member, year) => categories.reduce((sum, category) => sum + (Number(findIncome(member, year, category)) || 0), 0);
	const applicant = members.find((member) => member.relacion === "Postulante") || members[0];
	const applicantName = [applicant.nombre, applicant.apellidoPaterno, applicant.apellidoMaterno].filter(Boolean).join(" ") || "No informado";
	const receiptNumber = `SIM-2027-${String(JSON.stringify(payload).length).padStart(6, "0")}`;
	const details = [["Nombre completo del postulante", applicantName], ["RUT", applicant.rut || "No informado"], ["Fecha de simulación", new Intl.DateTimeFormat("es-CL").format(new Date())], ["Número de comprobante simulado", receiptNumber], ["Período", "2027"]];
	details.forEach(([term, description]) => {
		const dt = document.createElement("dt"); dt.className = "col-sm-4 text-secondary"; dt.textContent = term;
		const dd = document.createElement("dd"); dd.className = "col-sm-8 fw-semibold"; dd.textContent = description;
		document.getElementById("datos-comprobante").append(dt, dd);
	});
	members.forEach((member) => {
		const row = document.createElement("tr");
		[member.nombre, member.apellidoPaterno, member.apellidoMaterno, member.rut, member.relacion, member.actividad].forEach((value) => { const cell = document.createElement("td"); cell.textContent = value || ""; row.append(cell); });
		document.getElementById("familia-body").append(row);
	});
	members.forEach((member, index) => [2025, 2026].forEach((year) => {
		const row = document.createElement("tr");
		const name = document.createElement("th"); name.scope = "row"; name.textContent = [member.nombre, member.apellidoPaterno, member.apellidoMaterno].filter(Boolean).join(" ") || `Integrante ${index + 1}`; row.append(name);
		const yearCell = document.createElement("td"); yearCell.textContent = year; row.append(yearCell);
		categories.forEach((category) => { const cell = document.createElement("td"); cell.textContent = format(findIncome(index, year, category)); row.append(cell); });
		const total = document.createElement("td"); total.textContent = format(rowTotal(index, year)); row.append(total);
		document.getElementById("ingresos-body").append(row);
	}));
	const totalByYear = (year) => members.reduce((sum, member, index) => sum + rowTotal(index, year), 0);
	const average2025 = totalByYear(2025) / 12;
	const average2026 = totalByYear(2026) / 9;
	document.getElementById("promedio-2025").textContent = format(average2025);
	document.getElementById("promedio-2026").textContent = format(average2026);
	document.getElementById("promedio-grupo").textContent = format((average2025 + average2026) / 2);
	const backQuery = new URLSearchParams({ comprobante: JSON.stringify(payload) }).toString();
	document.getElementById("volver").href = `paso3.html?${backQuery}`;
	document.getElementById("imprimir").addEventListener("click", () => window.print());
	document.getElementById("finalizar").addEventListener("click", () => document.getElementById("mensaje-final").classList.remove("d-none"));
});
