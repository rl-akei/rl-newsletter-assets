/* Pilote des animations « vrais outils ».
   Une seule timeline GSAP, découpée en étapes. Chaque étape joue son mouvement puis s'arrête :
   Sylvain parle, puis passe à la suivante.
   Clavier : espace, flèche droite, Entrée ou page suivante = étape suivante ; flèche gauche ou page
   précédente = étape d'avant ; R = rejouer l'étape ; 0 = depuis le début ; F = plein écran ; H = aide.
   Adresse : ?auto (tout joue en boucle), ?etape=N (posé à la fin de l'étape N), ?t=12.5 (posé à 12,5 s),
   ?rendu (capture vidéo, rien ne joue tout seul), ?propre (pas d'aide à l'écran). */
(function () {
  const PAUSE = 3.4;                      // tenue de chaque étape en lecture continue et en vidéo
  const C = { cream: "#FFFCF7", ink: "#0D1A14", slate: "#5C6661", beige: "#D2CFC9", mind: "#DFE971" };
  const stage = document.getElementById("stage");
  const tl = gsap.timeline({ paused: true });
  const ETAPES = [];
  let fin = 0;                            // fin de la dernière étape construite, pause comprise
  let derniere = { x: 0, y: 0 };          // dernière position donnée à la souris

  // Position d'un élément dans la scène 1920 × 1080, sans tenir compte des transformations en cours
  function pos(sel, fx = 0.5, fy = 0.5) {
    let el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!el) throw new Error("introuvable : " + sel);
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = 0, y = 0;
    while (el && el !== stage) {
      x += el.offsetLeft; y += el.offsetTop;
      el = el.offsetParent;
      if (el && el !== stage) { x += el.clientLeft; y += el.clientTop; }
    }
    return { x: x + w * fx, y: y + h * fy };
  }

  const RL = {
    tl, ETAPES, pos, C,
    etape(fn) {
      const S = fin;
      const d = fn(S) || 1;
      ETAPES.push({ S, E: S + d });
      fin = S + d + PAUSE;
    },
    entre(sel, at, o = {}) {
      tl.fromTo(sel, { opacity: 0, y: o.y ?? 32 }, { opacity: 1, y: 0, duration: o.d ?? 0.6, ease: "expo.out", stagger: o.st ?? 0 }, at);
    },
    sort(sel, at, d = 0.2) { tl.to(sel, { opacity: 0, duration: d, ease: "power1.out" }, at); },
    fenetre(sel, at) {
      tl.fromTo(sel, { opacity: 0, y: 40, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "expo.out" }, at);
    },
    ferme(sel, at) { tl.to(sel, { opacity: 0, scale: 0.98, duration: 0.3, ease: "power1.in" }, at); },
    legende(n, at) {
      tl.to(`.leg:not(#leg${n})`, { opacity: 0, duration: 0.2, ease: "power1.out" }, at);
      tl.fromTo(`#leg${n}`, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, at + 0.15);
    },
    // k = -1 : aucun temps ; 0 déclencheur ; 1 l'IA prépare ; 2 tu décides ; 3 résultat
    phase(k, at) {
      document.querySelectorAll(".temps .t").forEach((el, j) => {
        const on = j === k, ok = j < k;
        tl.to(el.querySelector(".fd"), { opacity: on ? 1 : 0, duration: 0.4, ease: "power2.out" }, at);
        tl.to(el, { color: on ? C.cream : ok ? C.ink : C.slate, duration: 0.4 }, at);
        tl.to(el.querySelector("i"), { backgroundColor: on ? C.mind : ok ? C.ink : "rgba(210,207,201,0)", borderColor: on ? C.mind : ok ? C.ink : C.beige, duration: 0.4 }, at);
      });
    },
    // Souris : la pointe de la flèche arrive sur le centre de la cible
    sourisPose(cible, fx, fy) { const p = typeof cible === "string" ? pos(cible, fx, fy) : cible; derniere = p; gsap.set("#souris", { x: p.x - 3, y: p.y - 3 }); },
    souris(cible, at, d = 0.7, fx, fy) {
      const p = typeof cible === "string" ? pos(cible, fx, fy) : cible;
      derniere = p;
      tl.to("#souris", { x: p.x - 3, y: p.y - 3, duration: d, ease: "power3.inOut" }, at);
    },
    montre(at) { tl.to("#souris", { opacity: 1, duration: 0.25 }, at); },
    cache(at) { tl.to("#souris", { opacity: 0, duration: 0.25 }, at); },
    clic(at) {
      const p = derniere;
      tl.to("#souris", { scale: 0.86, duration: 0.08, ease: "power2.out" }, at);
      tl.to("#souris", { scale: 1, duration: 0.16, ease: "power2.out" }, at + 0.08);
      tl.set("#clic", { x: p.x, y: p.y, scale: 0.3, opacity: 0 }, at);
      tl.to("#clic", { opacity: 0.9, duration: 0.04 }, at);
      tl.to("#clic", { scale: 1.25, opacity: 0, duration: 0.45, ease: "power2.out" }, at + 0.04);
    },
  };
  window.RL = RL;

  // ---------- Mise à l'échelle : la scène 1920 × 1080 tient dans la fenêtre ----------
  function ajuste() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
  }

  // ---------- Pilotage au clavier ----------
  let i = -1, jeu = null;
  const borne = (n) => Math.max(0, Math.min(ETAPES.length - 1, n));
  function joue(n) {
    n = borne(n);
    if (jeu) jeu.kill();
    tl.pause();
    tl.seek(ETAPES[n].S, true);
    jeu = tl.tweenTo(ETAPES[n].E, { ease: "none" });
    i = n;
  }
  function pose(n) {
    n = borne(n);
    if (jeu) jeu.kill();
    tl.pause();
    tl.seek(ETAPES[n].E, true);
    i = n;
  }
  const params = new URLSearchParams(location.search);
  function aide(texte, ms = 3500) {
    if (params.has("propre") || params.has("rendu")) return;
    const a = document.getElementById("aide");
    a.textContent = texte; a.classList.add("on");
    clearTimeout(aide._t); aide._t = setTimeout(() => a.classList.remove("on"), ms);
  }
  addEventListener("keydown", (e) => {
    const k = e.key;
    if ([" ", "ArrowRight", "Enter", "PageDown", "ArrowDown"].includes(k)) { e.preventDefault(); if (i < ETAPES.length - 1) joue(i + 1); }
    else if (["ArrowLeft", "PageUp", "ArrowUp"].includes(k)) { e.preventDefault(); pose(i - 1); }
    else if (k === "r" || k === "R") joue(i);
    else if (k === "0" || k === "Home") joue(0);
    else if (k === "f" || k === "F") { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (k === "h" || k === "H") aide(`Étape ${i + 1} sur ${ETAPES.length} · espace : suivante · ← : d'avant · R : rejouer · F : plein écran`);
    else if (k === "a" || k === "A") { if (jeu) jeu.kill(); tl.repeat(-1).play(); }
  });

  // ---------- Démarrage, une fois polices et images prêtes ----------
  RL.construire = function (fn) {
    const pret = Promise.all([document.fonts.ready, new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r)))]);
    pret.then(() => {
      fn(RL);
      tl.set({}, {}, fin);                // la dernière étape garde sa tenue
      ajuste(); addEventListener("resize", ajuste);
      window.__rl = { duree: tl.duration(), etapes: ETAPES, seek: (t) => { tl.seek(t, true); return t; } };
      if (params.has("rendu")) { tl.seek(0, true); }
      else if (params.has("t")) { tl.seek(parseFloat(params.get("t")), true); }
      else if (params.has("etape")) { pose(parseInt(params.get("etape"), 10)); }
      else if (params.has("auto")) { tl.repeat(-1).play(0); }
      else { joue(0); aide("Espace : étape suivante · ← : étape d'avant · R : rejouer · F : plein écran · H : aide"); }
      window.__pret = true;
    });
  };
})();
