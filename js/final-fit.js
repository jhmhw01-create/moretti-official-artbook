
(() => {
  const DESKTOP = 901;

  function fitPage(){
    const body = document.body;
    if(!body) return;

    if(innerWidth < DESKTOP){
      body.classList.remove('moretti-final-fit');
      body.style.removeProperty('--moretti-page-scale');
      body.style.removeProperty('--moretti-fit-left');
      body.style.removeProperty('--moretti-fit-top');
      return;
    }

    const top = document.querySelector('.topbar, .top');
    const main = document.querySelector('main');
    if(!main) return;

    // Reset before measuring.
    body.classList.remove('moretti-final-fit');
    body.style.setProperty('--moretti-page-scale','1');

    const topH = top ? Math.ceil(top.getBoundingClientRect().height) : 0;
    const rect = main.getBoundingClientRect();

    // Actual unscaled page footprint.
    const naturalW = Math.max(main.scrollWidth, Math.ceil(rect.width));
    const naturalH = Math.max(main.scrollHeight, Math.ceil(rect.height));

    const availableW = Math.max(320, innerWidth - 34);
    const availableH = Math.max(360, innerHeight - topH - 18);

    let scale = Math.min(1, availableW / naturalW, availableH / naturalH);

    // A tiny safety margin prevents browser rounding from creating a scrollbar.
    scale = Math.max(.55, scale * .985);

    body.style.setProperty('--moretti-page-scale', scale.toFixed(4));
    body.style.setProperty('--moretti-fit-top', (topH + 7) + 'px');
    body.classList.add('moretti-final-fit');
  }

  addEventListener('load', fitPage);
  addEventListener('resize', fitPage);
  if(document.fonts?.ready) document.fonts.ready.then(fitPage);
  setTimeout(fitPage, 120);
})();
