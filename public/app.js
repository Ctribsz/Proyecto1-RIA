const form = document.querySelector("#search-form");
const specialtyInput = document.querySelector("#especialidad");
const zoneInput = document.querySelector("#zona");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status");
const errorMessage = document.querySelector("#error-message");
const emptyMessage = document.querySelector("#empty-message");
const tableContainer = document.querySelector("#table-container");
const resultsBody = document.querySelector("#results-body");
const pagination = document.querySelector("#pagination");
const previousButton = document.querySelector("#previous-page");
const nextButton = document.querySelector("#next-page");
const pageLabel = document.querySelector("#page-label");

const projectId = "ria-proyecto1";
const localHosts = new Set(["127.0.0.1", "localhost"]);
const apiBaseUrl = localHosts.has(location.hostname)
  ? `http://${location.hostname}:5001/${projectId}/us-central1/api`
  : `https://us-central1-${projectId}.cloudfunctions.net/api`;

const state = {
  page: 1,
  pageSize: 10,
  hasNext: false,
  filters: {
    specialty: "",
    zone: "",
  },
};

const attemptedCollections = new Set();
const collectionKeywords = new Map([
  ["cardiologia", "cardiólogo"],
  ["dermatologia", "dermatólogo"],
  ["ginecologia", "ginecólogo"],
  ["neurologia", "neurólogo"],
  ["ortopedia", "ortopedista"],
  ["pediatria", "pediatra"],
]);

function createTextCell(label, value) {
  const cell = document.createElement("td");
  cell.dataset.label = label;
  cell.textContent = value || "No disponible";
  if (!value) {
    cell.classList.add("empty-value");
  }
  return cell;
}

function createContactCell(doctor) {
  const cell = document.createElement("td");
  const links = document.createElement("div");
  cell.dataset.label = "Contacto";
  links.className = "contact-links";

  if (doctor.telefono) {
    const phone = document.createElement("a");
    phone.href = `tel:${doctor.telefono.replace(/[^+\d]/g, "")}`;
    phone.textContent = doctor.telefono;
    links.append(phone);
  }

  if (doctor.sitio_web) {
    const website = document.createElement("a");
    website.href = doctor.sitio_web;
    website.target = "_blank";
    website.rel = "noopener noreferrer";
    website.textContent = "Sitio web";
    links.append(website);
  }

  if (!links.childElementCount) {
    links.textContent = "No disponible";
    links.classList.add("empty-value");
  }

  cell.append(links);
  return cell;
}

function formatDate(value) {
  if (!value) {
    return "No disponible";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No disponible"
    : new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" }).format(date);
}

function renderRows(doctors) {
  resultsBody.replaceChildren();

  for (const doctor of doctors) {
    const row = document.createElement("tr");
    row.append(
      createTextCell("Nombre", doctor.nombre),
      createTextCell("Especialidad", doctor.especialidad),
      createTextCell("Zona", doctor.zona),
      createTextCell("Dirección", doctor.direccion),
      createContactCell(doctor),
      createTextCell("Recolectado", formatDate(doctor.fecha_recoleccion)),
    );
    resultsBody.append(row);
  }
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  previousButton.disabled = isLoading || state.page === 1;
  nextButton.disabled = isLoading || !state.hasNext;
  statusMessage.textContent = isLoading ? "Consultando…" : statusMessage.textContent;
}

function updateUrl() {
  const params = new URLSearchParams();

  if (state.filters.specialty) {
    params.set("especialidad", state.filters.specialty);
  }
  if (state.filters.zone) params.set("zona", state.filters.zone);
  if (state.page > 1) params.set("page", String(state.page));

  const query = params.toString();
  history.replaceState(null, "", query ? `/?${query}` : "/");
}

function normalizeSearchText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-GT")
    .replace(/\s+/g, " ");
}

function collectionKey() {
  return `${normalizeSearchText(state.filters.specialty)}|${state.filters.zone}`;
}

async function collectDoctors() {
  statusMessage.textContent = "No había resultados. Buscando nuevos médicos…";

  const response = await fetch(`${apiBaseUrl}/recolectar`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keyword:
        collectionKeywords.get(normalizeSearchText(state.filters.specialty)) ||
        state.filters.specialty,
      especialidad: state.filters.specialty,
      zona: state.filters.zone,
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.error || "No fue posible buscar nuevos resultados en Google Places.",
    );
  }

  statusMessage.textContent = "Actualizando el directorio…";
}

async function loadDirectory() {
  setLoading(true);
  errorMessage.hidden = true;
  emptyMessage.hidden = true;
  tableContainer.hidden = true;
  pagination.hidden = true;

  const params = new URLSearchParams({
    page: String(state.page),
    pageSize: String(state.pageSize),
  });
  if (state.filters.specialty) {
    params.set("especialidad", state.filters.specialty);
  }
  if (state.filters.zone) params.set("zona", state.filters.zone);

  try {
    const response = await fetch(`${apiBaseUrl}/directorio?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const defaultMessage =
        response.status === 403
          ? "Esta red no está autorizada para consultar el directorio."
          : "No se pudo completar la consulta. Inténtalo nuevamente.";
      throw new Error(payload.error || defaultMessage);
    }

    let doctors = Array.isArray(payload.datos) ? payload.datos : [];

    const shouldCollect =
      doctors.length === 0 &&
      state.page === 1 &&
      state.filters.specialty !== "" &&
      state.filters.zone !== "";

    if (shouldCollect) {
      const key = collectionKey();

      if (!attemptedCollections.has(key)) {
        await collectDoctors();
        attemptedCollections.add(key);

        const refreshedResponse = await fetch(
          `${apiBaseUrl}/directorio?${params.toString()}`,
          { headers: { Accept: "application/json" } },
        );
        const refreshedPayload = await refreshedResponse.json().catch(() => ({}));

        if (!refreshedResponse.ok) {
          throw new Error(
            refreshedPayload.error ||
              "Los datos se recolectaron, pero no fue posible actualizar el directorio.",
          );
        }

        doctors = Array.isArray(refreshedPayload.datos)
          ? refreshedPayload.datos
          : [];
        payload.paginacion = refreshedPayload.paginacion;
      }
    }

    state.hasNext = Boolean(payload.paginacion?.hasNext);
    renderRows(doctors);
    tableContainer.hidden = doctors.length === 0;
    emptyMessage.hidden = doctors.length !== 0;
    pagination.hidden = doctors.length === 0 && state.page === 1;
    previousButton.disabled = state.page === 1;
    nextButton.disabled = !state.hasNext;
    pageLabel.textContent = `Página ${state.page}`;
    statusMessage.textContent = `${doctors.length} resultado${doctors.length === 1 ? "" : "s"} en esta página`;
    updateUrl();
  } catch (error) {
    errorMessage.textContent =
      error instanceof TypeError
        ? "No fue posible conectar con la API. Verifica tu red y que tu IP esté autorizada."
        : error.message;
    errorMessage.hidden = false;
    statusMessage.textContent = "Consulta no disponible";
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.page = 1;
  state.filters.specialty = specialtyInput.value.trim();
  state.filters.zone = zoneInput.value.trim();
  loadDirectory();
});

previousButton.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    loadDirectory();
  }
});

nextButton.addEventListener("click", () => {
  if (state.hasNext) {
    state.page += 1;
    loadDirectory();
  }
});

const initialParams = new URLSearchParams(location.search);
specialtyInput.value = initialParams.get("especialidad") || "";
zoneInput.value = initialParams.get("zona") || "";
state.filters.specialty = specialtyInput.value;
state.filters.zone = zoneInput.value;
const initialPage = Number(initialParams.get("page"));
state.page = Number.isSafeInteger(initialPage) && initialPage > 0 ? initialPage : 1;

loadDirectory();
