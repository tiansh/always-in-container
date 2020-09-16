; (async function () {

  Array.from(document.querySelectorAll('[data-i18n]')).forEach(node => {
    const i18n = node.dataset.i18n;
    delete node.dataset.i18n;
    const text = browser.i18n.getMessage(i18n);
    node.textContent = text;
  });
  document.title = browser.i18n.getMessage('selectTitle');

  const url = new URL(location.href).searchParams.get('go');
  if (!url || !(function () { try { new URL(url); } catch (e) { return false; } return true; }())) {
    const current = await browser.tabs.getCurrent();
    browser.tabs.remove(current.id);
    return;
  }
  document.getElementById('redirect-url').appendChild(document.createTextNode(url));

  // this will store a string of keys pressed when searching for contexts to
  // switch to.
  var contextPrefix = "";

  /** @type {Array<{ name: string, icon: string, iconUrl: string, color: string, colorCode: string, cookieStoreId: string }>} */
  const contexts = await browser.contextualIdentities.query({});

  /** @type {HTMLUListElement} */
  const ul = document.getElementById('container-list');

  // given a cookieStoreId (reference to a container), create a new tab with
  // the URL, switch to it and close the temporary tab.
  async function createTabAndSwitchTab(cookieStoreId) {
    const current = await browser.tabs.getCurrent();
    const { active, index, windowId } = current;
    browser.tabs.create({
      url: url + '',
      active: active,
      cookieStoreId: cookieStoreId,
      index: index,
      windowId: windowId,
    });
    browser.tabs.remove(current.id);
  }

  document.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button');
    if (!button) return;
    event.stopPropagation();
    event.preventDefault();
    const cookieStoreId = button.dataset.cookieStoreId;
    if (!cookieStoreId) return;
    createTabAndSwitchTab(cookieStoreId);
  }, true);

  // tracks keys pressed, if a single context starts with the keys pressed,
  // then use that context
  document.addEventListener('keydown', event => {
    // update or clear the contextPrefix variable while typing
    if (event.key === "Backspace") {
      var endIndex = contextPrefix.length - 2;
      if (endIndex === -1) {
        contextPrefix = "";
      } else {
        contextPrefix = contextPrefix.substring(0, contextPrefix.length - 1)
      }
    } else if (event.key.length === 1) {
      contextPrefix += event.key;
    }

    // count the matching contexts for the current prefix
    var matching = contexts.filter((context, index) => {
      if (context.name.toLowerCase().startsWith(contextPrefix)) {
        return true
      } else {
        return false
      }
    });

    // show the current prefix and matching containers on the form
    if (contextPrefix != "") {
      document.getElementById("context-prefix-message").style.visibility = "visible";
      var names = matching.map((context, index) => {
        return context.name;
      });
      const message = "("+contextPrefix+") " + names.join(", ");
      document.getElementById("context-prefix").innerHTML = message;
    } else {
      document.getElementById("context-prefix-message").style.visibility = "hidden";
    }

    // open the tab if there is only one in the matching list
    if (matching.length === 1) {
      createTabAndSwitchTab(matching[0].cookieStoreId);
    }
  }, true);

  contexts.forEach((context, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
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
