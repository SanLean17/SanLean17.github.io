/* =========================================================
   SANLEAN - ROULETTE ENGINE
   Canvas 2D perk roulette
   ========================================================= */

const imageCache = new Map();

/* =========================================================
   CARGAR JSON
   ========================================================= */

async function loadJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url}`);
  }

  return response.json();
}

/* =========================================================
   RANDOM
   ========================================================= */

function shuffled(array) {
  const result = array.slice();

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/* =========================================================
   IMÁGENES
   ========================================================= */

function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);

    image.onerror = () => {
      console.warn("No se pudo cargar:", src);
      reject(new Error(`No se pudo cargar ${src}`));
    };

    image.src = src;
  });

  imageCache.set(src, promise);

  return promise;
}

/* =========================================================
   PRE-CARGA DE TODOS LOS PERKS
   ========================================================= */

async function preloadImages(items, imgBase) {

  const promises = items.map(item => {

    const src = `${imgBase}/${item.key}.png`;

    return loadImage(src).catch(() => null);

  });

  await Promise.all(promises);
}

/* =========================================================
   EASING
   ========================================================= */

/*
  Arranca rápido y desacelera suavemente al final.
*/

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

/* =========================================================
   DIBUJAR UN PERK
   ========================================================= */

function drawPerk(ctx, image, x, y, width, height) {

  if (!image) {
    return;
  }

  /*
    Las imágenes de perks son cuadradas.
    Las dibujamos manteniendo la proporción.
  */

  const imageRatio = image.width / image.height;

  let drawWidth = width;
  let drawHeight = width / imageRatio;

  if (drawHeight > height) {
    drawHeight = height;
    drawWidth = height * imageRatio;
  }

  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );
}

/* =========================================================
   DIBUJAR EL REEL
   ========================================================= */

function drawReel(
  canvas,
  ctx,
  sequence,
  position,
  cellSize
) {

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  /*
    Fondo negro del reel.
  */

  ctx.fillStyle = "#080808";

  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  /*
    El movimiento es vertical.

    Cada perk ocupa una celda completa.
    position puede ser decimal para conseguir
    el desplazamiento suave entre imágenes.
  */

  const firstIndex = Math.floor(position) - 2;

  const fraction = position - Math.floor(position);

  for (
    let i = firstIndex;
    i < firstIndex + 7;
    i++
  ) {

    if (i < 0 || i >= sequence.length) {
      continue;
    }

    const item = sequence[i];

    const imagePromise = imageCache.get(
      `survivor/${item.key}.png`
    );

    if (!imagePromise) {
      continue;
    }

    /*
      La promesa normalmente ya está resuelta
      gracias a la precarga.
    */

    imagePromise.then(image => {

      /*
        Evitamos dibujar una imagen vieja
        si el canvas ya cambió de estado.
      */

      if (!canvas.isConnected) {
        return;
      }

      const y =
        (i - position) * cellSize;

      drawPerk(
        ctx,
        image,
        0,
        y,
        width,
        cellSize
      );

    }).catch(() => {});
  }

  /*
    Oscurecimiento suave en los extremos.
  */

  const topGradient = ctx.createLinearGradient(
    0,
    0,
    0,
    height * .28
  );

  topGradient.addColorStop(
    0,
    "rgba(8,8,8,.95)"
  );

  topGradient.addColorStop(
    1,
    "rgba(8,8,8,0)"
  );

  ctx.fillStyle = topGradient;

  ctx.fillRect(
    0,
    0,
    width,
    height * .28
  );


  const bottomGradient = ctx.createLinearGradient(
    0,
    height * .72,
    0,
    height
  );

  bottomGradient.addColorStop(
    0,
    "rgba(8,8,8,0)"
  );

  bottomGradient.addColorStop(
    1,
    "rgba(8,8,8,.95)"
  );

  ctx.fillStyle = bottomGradient;

  ctx.fillRect(
    0,
    height * .72,
    width,
    height * .28
  );
}

/* =========================================================
   ANIMAR UN REEL
   ========================================================= */

function spinTrack(
  canvas,
  pool,
  imgBase,
  target,
  vertical = true,
  itemSize = 180,
  delay = 0
) {

  return new Promise(async resolve => {

    /*
      Si ya está girando, no iniciamos otro.
    */

    if (canvas.dataset.spinning === "true") {
      return;
    }

    canvas.dataset.spinning = "true";

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      canvas.dataset.spinning = "false";
      resolve(target);
      return;
    }

    /*
      Retina / pantallas de alta densidad.
    */

    const cssWidth =
      canvas.clientWidth || itemSize;

    const cssHeight =
      canvas.clientHeight || itemSize;

    const dpr =
      Math.min(window.devicePixelRatio || 1, 2);

    canvas.width =
      Math.round(cssWidth * dpr);

    canvas.height =
      Math.round(cssHeight * dpr);

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    /*
      La celda ocupa todo el canvas.
    */

    const cellSize = cssHeight;

    /*
      Generamos una secuencia larga.

      Esto hace que durante el giro
      no parezca simplemente que se mueve
      una lista de 4 o 5 imágenes.
    */

    const sequence = [];

    const spinLength = 36;

    for (let i = 0; i < spinLength; i++) {

      const randomPool =
        shuffled(pool);

      sequence.push(
        randomPool[0]
      );
    }

    /*
      El resultado siempre queda al final.
    */

    sequence.push(target);

    /*
      Precargamos las imágenes que realmente
      van a aparecer durante esta animación.
    */

    await Promise.all(
      sequence.map(item => {

        return loadImage(
          `${imgBase}/${item.key}.png`
        ).catch(() => null);

      })
    );

    /*
      Espera escalonada entre reels.
    */

    if (delay > 0) {
      await new Promise(
        r => setTimeout(r, delay)
      );
    }

    const targetIndex =
      sequence.length - 1;

    /*
      El target debe terminar exactamente
      en el centro del canvas.

      Por eso usamos:

      targetIndex - 0.5
    */

    const startPosition = 0;

    const endPosition =
      targetIndex;

    /*
      Duración total.

      El original utiliza una animación
      prolongada de slot/reel.
    */

    const duration = 3000;

    const startTime =
      performance.now();

    function frame(now) {

      const elapsed =
        now - startTime;

      let progress =
        elapsed / duration;

      if (progress > 1) {
        progress = 1;
      }

      /*
        Movimiento suave:
        rápido al principio,
        desaceleración progresiva.
      */

      const eased =
        easeOutQuint(progress);

      const position =
        startPosition +
        (endPosition - startPosition) *
        eased;

      /*
        Canvas.
      */

      ctx.clearRect(
        0,
        0,
        cssWidth,
        cssHeight
      );

      /*
        Fondo.
      */

      ctx.fillStyle = "#080808";

      ctx.fillRect(
        0,
        0,
        cssWidth,
        cssHeight
      );

      /*
        Dibujar los elementos visibles.

        Usamos directamente las imágenes
        precargadas para que el movimiento
        no dependa de promesas durante el frame.
      */

      const first =
        Math.floor(position) - 2;

      for (
        let i = first;
        i <= first + 6;
        i++
      ) {

        if (
          i < 0 ||
          i >= sequence.length
        ) {
          continue;
        }

        const item =
          sequence[i];

        const src =
          `${imgBase}/${item.key}.png`;

        const image =
          imageCache.get(src);

        if (!image) {
          continue;
        }

        /*
          imageCache contiene Promise.
          Si todavía no terminó,
          simplemente esperamos el próximo frame.
        */

        if (
          typeof image.then === "function"
        ) {

          image.then(img => {

            if (
              canvas.dataset.spinning !==
              "true"
            ) {
              return;
            }

            const y =
              (i - position) *
              cellSize;

            drawPerk(
              ctx,
              img,
              0,
              y,
              cssWidth,
              cellSize
            );

          }).catch(() => {});

        } else {

          const y =
            (i - position) *
            cellSize;

          drawPerk(
            ctx,
            image,
            0,
            y,
            cssWidth,
            cellSize
          );
        }
      }

      /*
        Máscara superior.
      */

      const top =
        ctx.createLinearGradient(
          0,
          0,
          0,
          cssHeight * .30
        );

      top.addColorStop(
        0,
        "rgba(8,8,8,.96)"
      );

      top.addColorStop(
        1,
        "rgba(8,8,8,0)"
      );

      ctx.fillStyle = top;

      ctx.fillRect(
        0,
        0,
        cssWidth,
        cssHeight * .30
      );

      /*
        Máscara inferior.
      */

      const bottom =
        ctx.createLinearGradient(
          0,
          cssHeight * .70,
          0,
          cssHeight
        );

      bottom.addColorStop(
        0,
        "rgba(8,8,8,0)"
      );

      bottom.addColorStop(
        1,
        "rgba(8,8,8,.96)"
      );

      ctx.fillStyle = bottom;

      ctx.fillRect(
        0,
        cssHeight * .70,
        cssWidth,
        cssHeight * .30
      );

      /*
        Final.
      */

      if (progress >= 1) {

        /*
          Dibujamos definitivamente
          el perk seleccionado.
        */

        const finalSrc =
          `${imgBase}/${target.key}.png`;

        const finalPromise =
          imageCache.get(finalSrc);

        if (finalPromise) {

          finalPromise.then(finalImage => {

            ctx.clearRect(
              0,
              0,
              cssWidth,
              cssHeight
            );

            ctx.fillStyle =
              "#080808";

            ctx.fillRect(
              0,
              0,
              cssWidth,
              cssHeight
            );

            drawPerk(
              ctx,
              finalImage,
              0,
              0,
              cssWidth,
              cssHeight
            );

          }).catch(() => {});
        }

        canvas.dataset.spinning =
          "false";

        resolve(target);

        return;
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

/* =========================================================
   PERKS HABILITADAS
   ========================================================= */

function pickEnabled(
  items,
  disabledSet
) {

  const pool =
    items.filter(
      item => !disabledSet.has(item.key)
    );

  /*
    Si deshabilitó todo,
    volvemos a usar todos.
  */

  return pool.length
    ? pool
    : items;
}

/* =========================================================
   CONFLICTOS
   ========================================================= */

function conflictsWith(
  key,
  chosenKeys,
  groups
) {

  return groups.some(group => {

    return (
      group.includes(key) &&
      group.some(
        k => chosenKeys.includes(k)
      )
    );

  });
}

/* =========================================================
   ELEGIR BUILD DE 4
   ========================================================= */

function pickBuildOf4(
  items,
  disabledSet,
  conflictGroups
) {

  const pool =
    pickEnabled(
      items,
      disabledSet
    );

  let attempt = 0;

  while (attempt < 300) {

    attempt++;

    const shuffledPool =
      shuffled(pool);

    const chosen = [];

    for (
      const item of shuffledPool
    ) {

      if (
        chosen.length >= 4
      ) {
        break;
      }

      if (
        chosen.find(
          c => c.key === item.key
        )
      ) {
        continue;
      }

      if (
        conflictsWith(
          item.key,
          chosen.map(
            c => c.key
          ),
          conflictGroups
        )
      ) {
        continue;
      }

      chosen.push(item);
    }

    if (
      chosen.length === 4
    ) {
      return chosen;
    }
  }

  /*
    Fallback.
  */

  return shuffled(pool).slice(0, 4);
}

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

function initConfigGrid(
  gridEl,
  items,
  imgBase,
  disabledSet
) {

  gridEl.innerHTML = "";

  items.forEach(item => {

    const div =
      document.createElement("div");

    div.className =
      "config-item";

    div.innerHTML = `
      <img
        src="${imgBase}/${item.key}.png"
        alt="${item.name}"
        loading="lazy"
      >
      <div class="cfg-name">
        ${item.name}
      </div>
    `;

    div.addEventListener(
      "click",
      () => {

        if (
          disabledSet.has(item.key)
        ) {

          disabledSet.delete(
            item.key
          );

        } else {

          disabledSet.add(
            item.key
          );
        }

        div.classList.toggle(
          "disabled"
        );
      }
    );

    gridEl.appendChild(div);
  });
}

/* =========================================================
   ABRIR / CERRAR CONFIGURACIÓN
   ========================================================= */

function initConfigToggle(
  headerEl,
  gridEl
) {

  headerEl.addEventListener(
    "click",
    () => {

      headerEl.classList.toggle(
        "open"
      );

      gridEl.classList.toggle(
        "open"
      );
    }
  );
}
