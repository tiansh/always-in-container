; (async function () {

  Array.from(document.querySelectorAll('[data-i18n]')).forEach(node => {
    const i18n = node.dataset.i18n;
    delete node.dataset.i18n;
    const text = browser.i18n.getMessage(i18n);
    node.textContent = text;
  });

  const url = new URL(location.href).searchParams.get('go');
  if (!url || !(function () { try { new URL(url); } catch (e) { return false; } return true; }())) {
    const current = await browser.tabs.getCurrent();
    browser.tabs.remove(current.id);
    return;
  }
  document.getElementById('redirect-url').appendChild(document.createTextNode(url));

  /** @type {HTMLUListElement} */
  const ul = document.getElementById('container-list');

  ul.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (!button) return;
    const cookieStoreId = button.dataset.cookieStoreId;
    if (!cookieStoreId) return;
    const current = await browser.tabs.getCurrent();
    const { active, index, windowId } = current;
    await browser.tabs.create({
      url: url + '',
      active: active,
      cookieStoreId,
      index: index,
      windowId: windowId,
    });
    browser.tabs.remove(current.id);
  });

  /** @type {Array<{ name: string, icon: string, iconUrl: string, color: string, colorCode: string, cookieStoreId: string }>} */
  const contexts = await browser.contextualIdentities.query({});
  contexts.forEach((context, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    li.appendChild(button);

    /*
     * https://bugzilla.mozilla.org/show_bug.cgi?id=1377302
     * fill="context-fill" is not supported in non chrome codes
     * We use svg color matrix filter to color the icon correctly
     */
    /** @type {SVGSVGElement} */
    const iconSvg = new DOMParser().parseFromString(`
<svg viewBox="0 0 32 32" color-interpolation-filters="sRGB" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <filter id="filter-${index}"><feColorMatrix type="matrix" values="${(function () {
    const hexColor = context.colorCode.replace(/[^0-9A-Fa-f]*/g, '');
    const rrggbb = hexColor.replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3');
    const [red, green, blue] = rrggbb.split(/(?=(?:..)*$)/).map(v => Number.parseInt(v, 16) / 255);
    return `0 0 0 0 ${red} 0 0 0 0 ${green} 0 0 0 0 ${blue} 0 0 0 1 0`;
  }())}" /></filter>
  <image xlink:href="${context.iconUrl}" filter="url(#filter-${index})" width="32px" height="32px" />
</svg>
`, 'image/svg+xml').documentElement;
    const icon = document.createElement('span');
    icon.className = 'icon-wrap';
    icon.appendChild(iconSvg);
    button.appendChild(icon);

    const name = document.createElement('span');
    name.textContent = context.name;
    button.appendChild(name);
    ul.appendChild(li);
    button.dataset.cookieStoreId = context.cookieStoreId;
  });
}());
