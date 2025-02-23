const LOADER_ID = "loader"
const ERROR_ID = "error"
const RESULTS_ID = "results"

const selectButton = (airlineWebsite) => airlineWebsite ? `
  <button data-airline="${airlineWebsite}" class="openURL bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg flex items-center gap-2 transition-colors">
    Select 
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  </button>
` : ""

const observer = new MutationObserver(() => {
  document.querySelectorAll(".openURL").forEach((button) => {
    if(!button.dataset.airline) return

    if (!button.dataset.listener) { // Prevent duplicate listeners
        button.dataset.listener = "true";
        button.addEventListener("click", () => {
            chrome.runtime.sendMessage({ id: "openURL", url: button.dataset.airline })
        })
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true })


function openURL(url) {
  chrome.runtime.sendMessage({ id: "openURL", url })
}

function show(elemntId) {
  const elemnt = document.getElementById(elemntId);
  elemnt.classList.remove("hidden");
}

function hide(elemntId) {
  const elemnt = document.getElementById(elemntId);
  elemnt.classList.add("hidden");
}


function highlightMatch(text, search) {
  if (text === undefined) return ""
  const regex = new RegExp(`(${search})`, "gi");
  return text.replace(regex, "<strong>$1</strong>");
}

document.addEventListener("DOMContentLoaded", async () => {
  
  const flightFilter = (await chrome.storage.local.get("flightFilter")).flightFilter
  
  if (flightFilter) {
    document.getElementById("from_airport").value = flightFilter.from_airport
    document.getElementById("to_airport").value = flightFilter.to_airport
    document.getElementById("fly_date").value = flightFilter.fly_date
    document.getElementById("nb_adults").value = flightFilter.nb_adults
    document.getElementById("nb_children").value = flightFilter.nb_children
    document.getElementById("nb_infants_in_seat").value = flightFilter.nb_infants_in_seat
    document.getElementById("nb_infants_on_lap").value = flightFilter.nb_infants_on_lap
    document.getElementById("cabin_class").value = flightFilter.cabin_class
    document.getElementById("trip_type").value = flightFilter.trip_type
  } else {
    const today = new Date()
    const day = (today.getDate() < 10) ? `0${today.getDate()}` : today.getDate()
    const month = (today.getMonth() + 1 < 10) ? `0${today.getMonth() + 1}` : today.getMonth() + 1
    document.getElementById("fly_date").value = `${today.getFullYear()}-${month}-${day}`
  }

  const form = document.getElementById("flightSearchForm")
  const resultsDiv = document.getElementById("results")
  const fromAirport = document.getElementById("from_airport")
  const toAirport = document.getElementById("to_airport")
  
  
  async function fetchAirports(search) {
    const backendUrl = "http://localhost:8000";

    try {
      const response = await fetch(`${backendUrl}/airports?search=${search}`, {
        method: "GET",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching airports:", error);
      return [];
    }
  }

  function createAutocomplete(input) {
    let currentFocus;
    input.addEventListener("input", async function () {
      const val = this.value.trim();
      closeAllLists();
      if (!val) return false;

      currentFocus = -1;
      const airports = await fetchAirports(val);
      const listContainer = document.createElement("DIV");
      listContainer.setAttribute("id", this.id + "autocomplete-list");
      listContainer.setAttribute("class", "autocomplete-items");
      this.parentNode.appendChild(listContainer);

      airports.forEach((airport) => {
        const item = document.createElement("DIV");
        item.innerHTML = `
          <div class="autocomplete-option">
            <span class="airport-icon">✈️</span>
            <div class="airport-info">
              <div class="airport-name">
                ${highlightMatch(airport.airport_name, val)} (${highlightMatch(airport.airport_code, val)})
              </div>
              <div class="airport-location">
                ${highlightMatch(airport.city, val)}, ${highlightMatch(airport.country, val)}
              </div>
            </div>
          </div>
          <input type='hidden' value='${airport.airport_code}'>
        `;

        
        item.addEventListener("click", function () {
          input.value = this.getElementsByTagName("input")[0].value;
          closeAllLists();
        });

        listContainer.appendChild(item);
      });
    });

    input.addEventListener("keydown", function (e) {
      let x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode === 40) {
        currentFocus++;
        addActive(x);
      } else if (e.keyCode === 38) {
        currentFocus--;
        addActive(x);
      } else if (e.keyCode === 13) {
        e.preventDefault();
        if (currentFocus > -1 && x) x[currentFocus].click();
      }
    });

    function addActive(x) {
      if (!x) return false;
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = x.length - 1;
      x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
      for (let i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }


    document.addEventListener("click", (e) => {
      closeAllLists(e.target);
    });

    function closeAllLists(elmnt) {
      const x = document.getElementsByClassName("autocomplete-items");
      for (let i = 0; i < x.length; i++) {
        if (elmnt !== x[i] && elmnt !== input) {
          x[i].parentNode.removeChild(x[i]);
        }
      }
    }
  }

  createAutocomplete(fromAirport);
  createAutocomplete(toAirport);

  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    hide(RESULTS_ID)

    const fly_date = document.getElementById("fly_date").value
    const from_airport = document.getElementById("from_airport").value
    const to_airport = document.getElementById("to_airport").value
    const nb_adults = document.getElementById("nb_adults").value
    const nb_children = document.getElementById("nb_children").value
    const nb_infants_in_seat = document.getElementById("nb_infants_in_seat").value
    const nb_infants_on_lap = document.getElementById("nb_infants_on_lap").value
    const cabin_class = document.getElementById("cabin_class").value
    const trip_type = document.getElementById("trip_type").value

    const flightFilterBody = {
      fly_date,
      from_airport,
      to_airport,
      cabin_class,
      trip_type,
      nb_adults,
      nb_children,
      nb_infants_in_seat,
      nb_infants_on_lap
    }

    // Save filter for next time
    chrome.storage.local.set({ flightFilter: flightFilterBody })


    hide(ERROR_ID) 
    show(LOADER_ID)

    const backendUrl = "http://localhost:8000"
    const response = await fetch(`${backendUrl}/flights`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flightFilterBody), 
    });

    if (!response.ok) {
      hide(LOADER_ID)
      show(ERROR_ID)
      return;
    }
    
    const flights = await response.json();
    hide(LOADER_ID)

    // Display results header
    show(RESULTS_ID)
    resultsDiv.innerHTML = `
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-blue-800">Flight Results</h2>
          <p class="text-gray-600">${from_airport} → ${to_airport} · ${fly_date} · ${cabin_class} · ${trip_type}</p>
        </div>
      `

    // Display each flight card
    flights.forEach((flight) => {
      resultsDiv.innerHTML += `
          <div class="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg p-4 mb-4">
            <div class="grid grid-flow-col grid-cols-1 items-center justify-between w-full gap-3">
              ${flight.airline.name}
            </div>
            <div class="grid grid-flow-col grid-cols-3 items-center justify-between w-full gap-3">
              <div class="col-span-2 flex items-center gap-8">
                
                <div class="flex items-center gap-6 w-full justify-between">
                  <div class="flex flex-col items-start">
                    <span class="text-xl font-semibold text-blue-900">${flight.departure_time}</span>
                    <span class="text-sm text-gray-500 m-auto">${from_airport}</span>
                  </div>
  
                  <div class="flex flex-col items-center mx-2">
                    <div class="flex items-center gap-2 -mb-1">
                      <div class="w-12 h-[1px] bg-gray-300"></div>
                      <span class="text-xs text-gray-500">${flight.duration}</span>
                      <div class="w-12 h-[1px] bg-gray-300"></div>
                    </div>
                    <span class="text-sm text-blue-600">Direct</span>
                  </div>
  
                  <div class="flex flex-col items-start">
                    <span class="text-xl font-semibold text-blue-900">${flight.arrival_time}</span>
                    <span class="text-sm text-gray-500 m-auto">${to_airport}</span>
                  </div>
                </div>
              </div>
  
              <div class="flex items-center gap-2">
                <div class="flex flex-col items-center gap-4">
                  <div class="flex flex-col items-end">
                    <span class="text-2xl font-bold text-blue-900">${flight.price}</span>
                  </div>
                  ${selectButton(flight.airline.website)}
                </div>
                <button class="text-gray-400 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
              </div>
            </div>
          </div>
        `
    })
  })
})

