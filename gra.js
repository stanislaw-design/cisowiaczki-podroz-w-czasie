(() => {
  "use strict";

  const story = window.opowiescCisowiaczkow;
  const settings = window.ustawieniaCisowiaczkow;
  const game = document.querySelector("#game");
  const scene = document.querySelector("#scene");
  const panel = document.querySelector("#panel");
  const timeline = document.querySelector("#timeline");
  const announcement = document.querySelector("#announcement");
  const timeTransition = document.querySelector("#time-transition");
  const years = ["1976", "2026", "2076"];
  const backgrounds = {
    "1976": "tla/sala-1976",
    "2026": "tla/sala-2026",
    "2076": "tla/pracownia-2076"
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const visited = new Set();

  const escape = value => String(value).replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const asset = path => "./assets/" + path + ".webp";
  const image = (path, className = "", alt = "") =>
    `<img class="${className}" src="${asset(path)}" alt="${escape(alt)}" draggable="false">`;
  const chapter = text => `<p class="eyebrow">${text}</p>`;
  const heading = text => `<h2 tabindex="-1">${text}</h2>`;
  const button = (label, action, variant = "") =>
    `<button class="button ${variant}" type="button" data-action="${action}">${label}</button>`;
  const normalize = value => value.normalize("NFC").trim().toLocaleUpperCase("pl-PL");

  function announce(text) {
    announcement.textContent = text;
  }

  function selectAction(element, name, action) {
    element.querySelector(`[data-action="${name}"]`).addEventListener("click", action);
  }

  function drag(element, { move, release }) {
    let start;
    const offset = event => ({ x: event.clientX - start.x, y: event.clientY - start.y });
    element.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
      element.setPointerCapture(event.pointerId);
      element.classList.add("dragging");
    });
    element.addEventListener("pointermove", event => {
      if (start?.id === event.pointerId) move(offset(event));
    });
    function end(event) {
      if (start?.id !== event.pointerId) return;
      const point = offset(event);
      start = undefined;
      element.classList.remove("dragging");
      release(event.type === "pointerup" ? point : { x: 0, y: 0 });
    }
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    element.addEventListener("lostpointercapture", end);
  }

  function setPanel(markup, focus = true) {
    panel.innerHTML = markup;
    if (focus) panel.querySelector("[tabindex='-1']")?.focus({ preventScroll: true });
  }

  function setView(name, year) {
    game.dataset.screen = name;
    game.dataset.year = year;
    timeline.innerHTML = years.map(item => {
      const current = item === year ? ' aria-current="step"' : "";
      const complete = visited.has(item) ? ' class="visited"' : "";
      return `<li${current}${complete}><span class="lamp"></span><span>${item}</span></li>`;
    }).join("");
    if (window.scrollY > 0) window.scrollTo(0, 0);
  }

  function background(path) {
    return image(path, "backdrop") + '<div class="scene-shade"></div>';
  }

  function cast(pose = "neutralny") {
    const professor = pose.startsWith("ola-") || pose.startsWith("kuba-") ? "neutralny" : pose;
    const ola = pose.startsWith("ola-") ? pose : "ola-neutralna";
    const kuba = pose.startsWith("kuba-") ? pose : "kuba-neutralny";
    return image("postacie/dzieci/" + ola, "character ola") +
      image("postacie/dzieci/" + kuba, "character kuba") +
      image("postacie/profesor/" + professor, "character professor");
  }

  function room(year, contents = "") {
    paint(backgrounds[year] || backgrounds["2026"], contents);
  }

  function paint(path, contents) {
    const previous = scene.querySelector(".backdrop");
    const pathChanged = previous && previous.getAttribute("src") !== asset(path);
    if (!previous || pathChanged) {
      scene.innerHTML = background(path) + '<div class="scene-objects"></div>';
    }
    scene.querySelector(".scene-objects").innerHTML = contents;
    if (pathChanged && !reducedMotion.matches && timeTransition.hidden) {
      previous.className = "backdrop leaving-scene";
      scene.querySelector(".backdrop").after(previous);
      previous.addEventListener("animationend", () => previous.remove(), { once: true });
    }
  }

  function opening() {
    visited.clear();
    setView("start", "start");
    room("2026",
      image("rekwizyty/girlanda", "girlanda") +
      image("wehikul/korpus", "opening-machine") +
      cast("z-kronika"));
    setPanel(chapter("50 lat przedszkola nr 32") +
      '<h1 tabindex="-1">Podróż<br>w czasie<span>.</span></h1>' +
      '<p class="lead">Profesor Czasik znalazł sposób, by zajrzeć do pierwszych Cisowiaczków. Pomożesz mu uruchomić wehikuł?</p>' +
      button("Rozpocznij podróż", "start") +
      (settings.trybTestowy ? '<p class="quiet">Wersja testowa</p>' : ""), false);
    selectAction(panel, "start", () => dialogue("start", story.wprowadzenie.slice(0, 2), "Pokaż kronikę", chronicle));
  }

  function chronicle() {
    setView("chronicle", "start");
    room("2026", `<button class="prop-button chronicle-book" type="button" aria-label="Okładka kroniki">
      ${image("rekwizyty/kronika-zamknieta", "closed-book")}
      ${image("rekwizyty/kronika-otwarta", "open-book")}
    </button>`);
    setPanel(chapter("Kronika Cisowiaczków") + heading("Otwórz kronikę") +
      '<p class="lead">Przesuń palcem po okładce albo dotknij książki.</p>' + button("Otwórz książkę", "book"));
    const book = scene.querySelector(".chronicle-book");
    let opened = false;
    function openBook() {
      if (opened) return;
      opened = true;
      book.classList.add("opened");
      book.disabled = true;
      panel.querySelector("[data-action='book']").disabled = true;
      window.setTimeout(() =>
        dialogue("start", story.wprowadzenie.slice(2), "Szukamy zębatki", () => gate("1976")),
        reducedMotion.matches ? 0 : 460);
    }
    book.addEventListener("click", openBook);
    selectAction(panel, "book", openBook);
    drag(book, {
      move: ({ x }) => { book.style.setProperty("--book-turn", `${Math.min(Math.abs(x), 42)}deg`); },
      release: ({ x }) => {
        book.style.removeProperty("--book-turn");
        if (Math.abs(x) > 25) openBook();
      }
    });
  }

  function dialogue(year, lines, lastLabel, done) {
    setView("dialogue", year);
    let step = 0;

    function nextLine() {
      const [speaker, copy, pose = "neutralny"] = lines[step];
      const openingScene = year === "start"
        ? image("rekwizyty/girlanda", "girlanda") + image("wehikul/korpus", "opening-machine") : "";
      const futureToy = year === "2076" ? image("zabawki-2076/skrzydlaty-konik", "flying-toy") : "";
      room(year, openingScene + futureToy + cast(pose));
      const last = step === lines.length - 1;
      setPanel(chapter(year === "start" ? "Jubileusz Cisowiaczków" : year) +
        `<h2 class="speaker" tabindex="-1">${speaker}</h2><p class="speech">${copy}</p>` +
        '<div class="dialog-actions">' +
        (step > 0 ? button("Wstecz", "back", "secondary") : "") +
        button(last ? lastLabel : "Dalej", "next") + '</div>');
      if (step > 0) selectAction(panel, "back", () => { step -= 1; nextLine(); });
      selectAction(panel, "next", () => {
        if (last) done();
        else { step += 1; nextLine(); }
      });
    }
    nextLine();
  }

  function gate(year) {
    const door = story.drzwi[year];
    setView("gate", year);
    const previous = year === "2026" ? "1976" : "2026";
    const extra = year === "2026"
      ? image("symbole/wieza-z-klockow", "victory-tower")
      : image("postacie/profesor/wskazuje", "character professor");
    room(previous, extra + `<div class="door-token">${image("symbole/" + door.znak, "", door.nazwaZnaku)}</div>`);
    setPanel(chapter("Hasło do roku " + year) + heading("Znajdź właściwe drzwi") +
      `<p class="lead">${door.wskazowka}</p>
      <form id="password-form" novalidate>
        <label class="field-label" for="password">Hasło z drzwi</label>
        <input id="password" name="password" class="field" type="text" autocomplete="off"
          autocapitalize="characters" spellcheck="false" maxlength="80" aria-describedby="password-error">
        <p id="password-error" class="feedback" role="status"></p>
        <button class="button" type="submit">Odblokuj wehikuł</button>
      </form>` +
      (settings.trybTestowy
        ? `<p class="testing">Hasło testowe <strong>${escape(settings.haslaDrzwi[year])}</strong></p>` : ""));
    const form = panel.querySelector("form");
    const field = form.querySelector("input");
    const error = form.querySelector(".feedback");
    field.addEventListener("input", () => {
      field.removeAttribute("aria-invalid");
      error.textContent = "";
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (normalize(field.value) === normalize(settings.haslaDrzwi[year])) {
        travel(year);
        return;
      }
      field.setAttribute("aria-invalid", "true");
      error.textContent = field.value.trim()
        ? "To hasło nie pasuje. Sprawdź napis przy drzwiach."
        : "Wpisz hasło znalezione przy drzwiach.";
      field.focus();
    });
  }

  function travel(year) {
    setView("travel", year);
    let selected = false;
    let moving = false;
    const previous = year === "2026" ? "1976" : "2026";
    const destination = year === "1976" ? "tla/pole-i-przedszkole-1976" : backgrounds[year];
    const upcoming = new Image();
    upcoming.src = asset(destination);

    function draw() {
      const viewLayers = selected ? image(destination, "portal-picture") +
        (year === "1976" ? image("rekwizyty/klosy", "portal-wheat") : "") : "";
      room(previous,
        image("postacie/profesor/" + (moving ? "pociaga-dzwignie" : "neutralny"), "character professor travel-professor") +
        `<div class="machine ${selected ? "selected" : ""} ${moving ? "moving" : ""}">
          <div class="portal-window">${viewLayers}</div>
          ${image("wehikul/korpus", "machine-body")}
          ${selected ? image("wehikul/blask-portalu", "portal-glow") : ""}
          ${image("wehikul/pokretlo", "dial")}
          ${image("wehikul/dzwignia", "lever")}
          <div class="machine-date">${image("wehikul/tabliczka-roku", "date-plate")}<span>${selected ? year : "····"}</span></div>
        </div>`);

      const controls = scene.querySelector(".machine");
      if (!moving) {
        const hotspot = document.createElement("button");
        hotspot.type = "button";
        hotspot.className = "hotspot " + (selected ? "lever-hit" : "dial-hit");
        hotspot.setAttribute("aria-label", selected ? "Dźwignia wehikułu" : "Pokrętło wehikułu, rok " + year);
        hotspot.addEventListener("click", selected ? pull : tune);
        controls.append(hotspot);
        const mechanism = controls.querySelector(selected ? ".lever" : ".dial");
        const distance = ({ x, y }) => selected ? Math.max(y, x, 0) : Math.max(Math.abs(x), Math.abs(y));
        drag(hotspot, {
          move: point => {
            const angle = Math.min(distance(point) * 1.75, selected ? 56 : 73);
            mechanism.style.transform = `rotate(${(selected ? 8 : -43) + angle}deg)`;
          },
          release: point => {
            if (distance(point) > 23) {
              if (selected) pull();
              else tune();
            } else {
              mechanism.style.removeProperty("transform");
            }
          }
        });
      }
    }

    function pull() {
      if (moving) return;
      const previousPosition = scene.querySelector(".lever").style.transform;
      moving = true;
      draw();
      if (previousPosition) scene.querySelector(".lever").style.setProperty("--lever-start", previousPosition);
      setPanel(chapter("Wehikuł w ruchu") + heading("Lecimy do " + year + "!"));
      if (reducedMotion.matches) {
        arrive(year);
        return;
      }
      timeTransition.hidden = false;
      window.setTimeout(() => arrive(year), 500);
      timeTransition.addEventListener("animationend", () => { timeTransition.hidden = true; }, { once: true });
    }

    function tune() {
      if (selected) return;
      const previousPosition = scene.querySelector(".dial").style.transform;
      selected = true;
      draw();
      if (previousPosition) scene.querySelector(".dial").style.setProperty("--dial-start", previousPosition);
      const line = year === "1976"
        ? "Ola: „Profesorze, czy my trafiliśmy na pole?” Profesor: „Prawie! Kiedyś rosła tu pszenica. W 1976 roku otwarto w tym miejscu przedszkole. Zobaczmy je z bliska!”"
        : year === "2076" ? "Profesor: „Gotowe. Ciekawe, co zastaniemy po drugiej stronie!”"
          : "Profesor: „Gotowe. Wracamy do dzisiejszych Cisowiaczków!”";
      setPanel(chapter("Nastawiono " + year) +
        heading(year === "1976" ? "Kłosy za oknem" : "Wehikuł gotowy") +
        `<p class="lead">${line}</p><p class="gesture-hint">Przeciągnij czerwoną dźwignię w dół.</p>` +
        button("Pociągnij dźwignię", "lever"));
      selectAction(panel, "lever", pull);
    }

    draw();
    setPanel(chapter("Wehikuł profesora") + heading("Ustaw rok " + year) +
      '<p class="lead">Przesuń palcem po pokrętle, żeby nastawić rok podróży.</p>' +
      button("Nastaw " + year, "dial"));
    selectAction(panel, "dial", tune);
  }

  function arrive(year) {
    if (year === "1976") {
      setView("field", year);
      paint("tla/pole-i-przedszkole-1976", `<button class="prop-button wheat-sweep" type="button" aria-label="Odsuń kłosy na ilustracji">
        ${image("rekwizyty/klosy", "field-wheat left")}
        ${image("rekwizyty/klosy", "field-wheat right")}
      </button>`);
      setPanel(chapter("1976 · Kcyńska 6") + heading("Co kryje się za kłosami?") +
        '<p class="lead">Rozsuń pszenicę palcem, żeby zobaczyć przedszkole.</p>' + button("Odsuń kłosy", "sweep"));
      const wheat = scene.querySelector(".wheat-sweep");
      let cleared = false;
      function reveal() {
        if (cleared) return;
        cleared = true;
        wheat.classList.add("cleared");
        wheat.disabled = true;
        setPanel(chapter("1976 · Kcyńska 6") + heading("Tu zaczęła się historia") +
          '<p class="lead">W małym, parterowym budynku otwarto przedszkole. Zajrzyj do sali z zabawkami.</p>' +
          button("Wejdźmy do środka", "enter"));
        selectAction(panel, "enter", () => dialogue(year, story.przeszlosc, "Szukamy zabawek", toyGame));
      }
      selectAction(panel, "sweep", reveal);
      wheat.addEventListener("click", reveal);
      drag(wheat, {
        move: ({ x }) => { wheat.style.setProperty("--sweep", `${Math.abs(x) * .85}px`); },
        release: ({ x }) => {
          wheat.style.removeProperty("--sweep");
          if (Math.abs(x) >= 36) reveal();
        }
      });
    } else if (year === "2026") {
      dialogue(year, story.terazniejszosc, "Zagraj w memory", memoryGame);
    } else {
      dialogue(year, story.przyszlosc, "Zaprojektuj zabawkę", drawing);
    }
  }

  function toyGame() {
    const toys = story.zabawki;
    const letters = Array(toys.length).fill("");
    let step = 0;
    let editingReview = false;
    setView("toys", "1976");

    function slots() {
      return '<div class="letter-slots" aria-label="Zebrane litery">' + letters.map((letter, index) =>
        `<button type="button" data-letter-index="${index}" aria-label="Zabawka ${index + 1}, ${letter || "brak litery"}"${step === index ? ' aria-current="step"' : ""}>${letter || "·"}</button>`
      ).join("") + '</div>';
    }

    function renderSlots() {
      const element = panel.querySelector(".slot-row");
      element.innerHTML = slots();
      element.querySelectorAll("[data-letter-index]").forEach(item => {
        item.addEventListener("click", () => {
          if (step === toys.length) editingReview = true;
          step = Number(item.dataset.letterIndex);
          show();
        });
      });
    }

    function show() {
      const review = step === toys.length;
      const [file, name] = review ? [] : toys[step];
      room("1976", review ? image("zabawki-1976/06-klocki", "toy-hero")
        : `<div class="toy-swipe">${image("zabawki-1976/" + file, "toy-hero", name)}</div>`);
      if (!review) {
        const zone = scene.querySelector(".toy-swipe");
        drag(zone, {
          move: ({ x }) => { zone.style.setProperty("--toy-offset", `${Math.max(-58, Math.min(x, 58))}px`); },
          release: ({ x }) => {
            const next = x > 44 ? step - 1 : x < -44 ? step + 1 : step;
            if (next >= 0 && next !== step) {
              step = next;
              show();
            } else {
              zone.style.removeProperty("--toy-offset");
            }
          }
        });
      }
      setPanel(chapter(review ? "1976 · Rozwiązanie" : `1976 · Zabawka ${step + 1} z ${toys.length}`) +
        heading(review ? "Ułóż hasło z liter" : name) +
        `<p class="lead">${review ? "Sprawdź litery w kolejności obrazków. Dotknij pola, żeby wrócić do zabawki."
          : "Znajdź zabawkę i wpisz literę z etykiety. Obrazki możesz przesuwać palcem."}</p>` +
        '<form id="toy-form" novalidate>' +
        (review ? '<p class="feedback" role="status"></p>' :
          `<label class="field-label" for="toy-letter">Litera z etykiety</label>
            <input id="toy-letter" class="field letter-field" type="text" value="${letters[step]}"
              autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="2">`) +
        '<div class="slot-row"></div><div class="dialog-actions">' +
        (step > 0 ? button("Wstecz", "back", "secondary") : "") +
        `<button class="button" type="submit">${review ? "Sprawdź hasło" : editingReview ? "Wróć do liter" : step === toys.length - 1 ? "Zobacz litery" : "Dalej"}</button></div></form>`);
      renderSlots();
      if (step > 0) selectAction(panel, "back", () => { step -= 1; show(); });
      const input = panel.querySelector("#toy-letter");
      if (input) input.addEventListener("input", () => {
        const typed = normalize(input.value).match(/\p{L}/gu) || [];
        input.value = letters[step] = typed.at(-1) || "";
        renderSlots();
      });
      panel.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        if (!review) {
          step = editingReview ? toys.length : step + 1;
          editingReview = false;
          show();
          return;
        }
        if (toys.every((toy, index) => toy[2] === letters[index])) {
          visited.add("1976");
          setView("solved", "1976");
          room("1976", image("symbole/wieza-z-klockow", "victory-tower"));
          setPanel(chapter("1976 · Zagadka rozwiązana") + heading("Brawo! Mamy wszystkie litery") +
            '<p class="lead">Profesor: „Teraz czas zobaczyć, w co bawią się Cisowiaczki dzisiaj. Poszukaj drzwi z otwartą książką.”</p>' +
            button("Szukamy książki", "continue"));
          selectAction(panel, "continue", () => gate("2026"));
          return;
        }
        panel.querySelector(".feedback").textContent = letters.includes("")
          ? "Brakuje liter. Dotknij pustego pola, żeby wrócić do tej zabawki."
          : "Spróbuj jeszcze raz. Sprawdź litery na etykietach i kolejność obrazków.";
      });
    }
    show();
  }

  function shuffle(cards) {
    for (let index = cards.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[other]] = [cards[other], cards[index]];
    }
    return cards;
  }

  function memoryGame() {
    setView("memory", "2026");
    room("2026");
    const cards = shuffle([...story.pary, ...story.pary]);
    let open = [];
    let pairs = 0;
    let waiting = false;
    setPanel(chapter("2026 · Minigra") + heading("Znajdź pary") +
      '<p class="lead">Odkrywaj po dwie karty.</p>' +
      `<p id="pair-count" class="pair-count">Pary <strong>0 / ${story.pary.length}</strong></p>` +
      '<div class="memory-board" aria-label="Karty memory">' + cards.map(([file, name], index) =>
        `<button class="memory-card" type="button" style="--deal:${index * 14}ms" aria-label="Karta ${index + 1}, zakryta">
          <span class="card-inner" aria-hidden="true">
            <span class="card-back">${image("symbole/rewers-memory")}</span>
            <span class="card-front">${image("memory-2026/" + file, "", name)}</span>
          </span>
        </button>`).join("") + '</div><div id="memory-next"></div>');
    const buttons = [...panel.querySelectorAll(".memory-card")];

    function flip(index, visible) {
      const card = buttons[index];
      card.classList.toggle("flipped", visible);
      card.setAttribute("aria-label", `Karta ${index + 1}, ${visible ? cards[index][1] : "zakryta"}`);
    }

    buttons.forEach((card, index) => card.addEventListener("click", () => {
      if (waiting || open.includes(index) || card.classList.contains("matched")) return;
      flip(index, true);
      open.push(index);
      if (open.length < 2) return;
      const [first, second] = open;
      if (cards[first][0] === cards[second][0]) {
        for (const item of open) {
          buttons[item].classList.add("matched");
          buttons[item].setAttribute("aria-disabled", "true");
        }
        open = [];
        pairs += 1;
        panel.querySelector("#pair-count strong").textContent = `${pairs} / ${story.pary.length}`;
        announce(pairs === story.pary.length ? "Wszystkie pary znalezione." : `Znaleziono parę. ${pairs} z ${story.pary.length}.`);
        if (pairs === story.pary.length) {
          visited.add("2026");
          setView("memory", "2026");
          const footer = panel.querySelector("#memory-next");
          footer.innerHTML = button("Posłuchaj pytania Kuby", "continue");
          selectAction(footer, "continue", () => dialogue("2026", story.pytanieKuby, "Szukamy rakiety", () => gate("2076")));
          footer.querySelector("button").focus();
        }
      } else {
        waiting = true;
        window.setTimeout(() => {
          flip(first, false);
          flip(second, false);
          open = [];
          waiting = false;
          announce("Te karty nie tworzą pary. Spróbuj dalej.");
        }, reducedMotion.matches ? 800 : 1050);
      }
    }));
  }

  function drawing() {
    setView("drawing", "2076");
    room("2076", image("rekwizyty/pudelko", "drawing-box") +
      image("rekwizyty/kartki-i-kredki", "drawing-paper") +
      image("zabawki-2076/skrzydlaty-konik", "flying-toy"));
    setPanel(chapter("2076 · Pracownia wynalazków") + heading("Teraz twój czas") +
      '<ol class="drawing-steps"><li>Weź kartkę i kredki.</li><li>Narysuj zabawkę. Pokaż, co potrafi.</li><li>Wrzuć rysunek do pudełka „Zabawki z 2076”.</li></ol>' +
      button("Rysunek w pudełku", "done"));
    selectAction(panel, "done", finale);
  }

  function finale() {
    visited.add("2076");
    setView("finale", "2076");
    room("2076", image("postacie/profesor/macha", "character professor finale-professor") +
      image("symbole/koperta", "final-envelope") +
      image("zabawki-2076/latajacy-zolw", "invention one") +
      image("zabawki-2076/robot-z-kwiatem", "invention two") +
      image("zabawki-2076/gwiazda-na-kolkach", "invention three"));
    setPanel(chapter("Koniec podróży · 1976 / 2026 / 2076") + heading("Projekt przyjęty!") +
      '<p class="lead">Profesor: „Dziękuję za podróż! Ciekawe, które dziecko w 2076 roku będzie się bawić twoją zabawką?”</p>' +
      button("Zagraj od początku", "restart", "secondary"));
    selectAction(panel, "restart", () => {
      opening();
      panel.querySelector("h1").focus({ preventScroll: true });
    });
  }

  opening();
})();
