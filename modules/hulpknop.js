/* Hulpknop: verbergt Simulise's zwevende "Hulp nodig?" (a.support-button); die overlapt de
 * Inspector van de Magister-extensie. De CSS staat in theme.css onder data-sim-hide-support. */
SD.register({
  id: 'hulpknop',
  init(SD) { SD.root.setAttribute('data-sim-hide-support', ''); },
  destroy(SD) { SD.root.removeAttribute('data-sim-hide-support'); },
});
