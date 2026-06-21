// js file made from https://github.com/cittadhammo/dpd-db/tree/main/tbw/output are loaded in every page !
// variables dpd_ebts, ... can be called directly.

// ================================================================= //
// == Глобальные переменные и управление окном словаря == //
// ================================================================= //

let dictionaryWindow = null;

/**
 * Открывает окно словаря, закрывая предыдущее, если оно существует.
 * @param {string} url - URL для загрузки в окне.
 */
function openDictionaryWindow(url) {
    const newWindowWidth = 500;
    const newWindowHeight = 500;
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;
    const newWindowleft = 30;
    const newWindowTop = screenHeight - newWindowHeight - 50;
    const popupFeatures = `width=${newWindowWidth},height=${newWindowHeight},left=${newWindowleft},top=${newWindowTop},scrollbars=yes,resizable=yes`;

    if (dictionaryWindow && !dictionaryWindow.closed) {
        dictionaryWindow.close();
    }
    dictionaryWindow = window.open(url, 'dictionaryPopup', popupFeatures);
    if (dictionaryWindow) {
        dictionaryWindow.focus();
    }
}

/**
 * НОВАЯ ВЕРСИЯ: Создает кликабельный <span> вместо <a>, чтобы избежать конфликта стилей.
 * @param {string} wordToLink - Слово для элемента.
 * @returns {string} - HTML-строка с кликабельным <span>.
 */
function createClickableSpan(wordToLink) {
    const langPrefix = typeof savedDict !== 'undefined' && savedDict.includes("ru") ? "ru/" : "";
    const wordSearchUrl = `https://dict.dhamma.gift/${langPrefix}search_html?q=${encodeURIComponent(wordToLink)}`;
    
    // Используем span с onclick, чтобы не наследовались стили от тега <a>
    return `<span onclick="event.preventDefault(); event.stopPropagation(); openDictionaryWindow('${wordSearchUrl}');"
                  style="cursor: pointer; text-decoration: none;">${wordToLink}</span>`;
}

/**
 * НОВАЯ УМНАЯ ФУНКЦИЯ: Безопасно превращает слова в HTML-тексте в кликабельные элементы,
 * не затрагивая существующие теги (например, <b>).
 * @param {string} html - HTML-строка для обработки.
 * @returns {string} - HTML с кликабельными словами.
 */
function linkifyHtmlContent(html) {
    if (!html) return "";
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) {
        if (walker.currentNode.parentElement.tagName !== 'A' && walker.currentNode.parentElement.tagName !== 'SPAN') {
             textNodes.push(walker.currentNode);
        }
    }
    for (let i = textNodes.length - 1; i >= 0; i--) {
        const node = textNodes[i];
        const fragment = document.createDocumentFragment();
        const parts = node.nodeValue.split(/([a-zA-ZāīūṅñṭḍṇḷṃĀĪŪṄÑṬḌṆḶṂёЁа-яА-Я']+)/g);
        parts.forEach(part => {
            if (/^[a-zA-ZāīūṅñṭḍṇḷṃĀĪŪṄÑṬḌṆḶṂёЁа-яА-Я']+$/.test(part)) {
                const spanWrapper = document.createElement('div'); // dummy element
                spanWrapper.innerHTML = createClickableSpan(part);
                fragment.appendChild(spanWrapper.firstChild);
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });
        node.parentNode.replaceChild(fragment, node);
    }
    return tempDiv.innerHTML;
}


// ================================================================= //
// == Основная логика и обработчики событий == //
// ================================================================= //

function enablePaliLookup() {
    $(document).on('mouseenter', 'span.lookup', function() {
        const $this = $(this);
        if ($this.hasClass('pinned') || $this.children('.meaning').length > 0) return;
        createMeaningBox($this);
    });

    $(document).on('mouseleave', 'span.lookup', function() {
        const $this = $(this);
        if (!$this.hasClass('pinned')) {
            $this.children('.meaning').remove();
        }
    });

    $(document).on('click', 'span.lookup', function(event) {
        event.stopPropagation();
        const $this = $(this);
        const isPinned = $this.hasClass('pinned');

        $('.lookup.pinned').not($this).removeClass('pinned').children('.meaning').remove();

        if (isPinned) {
            $this.removeClass('pinned').children('.meaning').remove();
        } else {
            $this.addClass('pinned');
            if ($this.children('.meaning').length === 0) {
                createMeaningBox($this);
            }
        }
    });

    $(document).on('click', function() {
        $('.lookup.pinned').removeClass('pinned').children('.meaning').remove();
    });

    generateLookupMarkup();
}

function disablePaliLookup() {
    $(document).off('mouseenter mouseleave click');
    $('.meaning').remove();
    $('.lookup').each(function() {
        this.outerHTML = $(this).text();
    });
}

function createMeaningBox($element) {
    const word = $element.text().toLowerCase().trim();
    const meaningHTML = lookupWord(word);
    if (meaningHTML) {
        const textBox = $('<span class="meaning">' + meaningHTML + '</span>');
        $element.append(textBox);
    }
}

/**
 * ИЗМЕНЕННАЯ ВЕРСИЯ, использующая новую функцию linkifyHtmlContent.
 */
function lookupWord(word) {
    let out = "";
    const originalWord = word;
    word = word.replace(/[’”'"]/g, "").replace(/ṁ/g, "ṃ");

    if (typeof dpd_i2h !== 'undefined' && word in dpd_i2h) {
        out += `<strong>${createClickableSpan(originalWord)}</strong><br><ul style="line-height: 1.4em; padding-left: 15px; margin-top: 4px;">`;
        for (const headword of dpd_i2h[word]) {
            if (typeof dpd_ebts !== 'undefined' && headword in dpd_ebts) {
                const linkedDefinition = linkifyHtmlContent(dpd_ebts[headword]);
                out += `<li>${linkedDefinition}</li>`; // headword уже внутри определения
            }
        }
        out += "</ul>";
    }

    if (typeof dpd_deconstructor !== 'undefined' && word in dpd_deconstructor) {
        if (out === "") {
            out += `<strong>${createClickableSpan(originalWord)}</strong><br>`;
        }
        const linkedDeconstruction = linkifyHtmlContent(dpd_deconstructor[word]);
        out += `<ul style="line-height: 1.4em; padding-left: 15px; margin-top: 4px;"><li>${linkedDeconstruction}</li></ul>`;
    }

    return out.replace(/ṃ/g, "ṁ");
}

// ================================================================= //
// == ИСХОДНЫЙ КОД ДЛЯ РАЗМЕТКИ СТРАНИЦЫ (без изменений) == //
// ================================================================= //

function E(nodeName, text) {
    var e = document.createElement(nodeName);
    if (text) e.appendChild(T(text));
    return e;
}

function generateLookupMarkup() {
    var classes = "td[lang=pi]";
    generateMarkupCallback.nodes = $(classes).toArray();
    generateMarkupCallback.start = Date.now();
    generateMarkupCallback();
}

function generateMarkupCallback() {
    var node = generateMarkupCallback.nodes.shift();
    if (!node) {
        console.log('Markup generation took ' + (Date.now() - generateMarkupCallback.start) + 'ms');
        return;
    }
    toLookupMarkup(node);
    setTimeout(generateMarkupCallback, 5);
}

var paliRex = /([aiueokgcjtdnpbmyrlvshāīūṭḍṅṇṁñḷ’­”]+)/i;
var splitRex = /([^  ,.–—:;?!“‘-]+)/;

function toLookupMarkup(startNode) {
    var parts, i, out = "", proxy, node;
    var it = new Iter(startNode, 'text');
    while (node = it.next()) {
        if (node.nodeValue) {
            if (node.parentNode.closest('a, h1, h2, h3, h4, .meaning')) continue;
            out = "";
            parts = node.nodeValue.split(splitRex);
            for (i = 0; i < parts.length; i++) {
                if (i % 2 == 1) {
                    out += '<span class="lookup">' + parts[i] + '</span>';
                } else {
                    out += parts[i];
                }
            }
            proxy = document.createElement('span');
            node.parentNode.replaceChild(proxy, node);
            proxy.outerHTML = out;
        }
    }
}

function _IterPermissions(permissables) {
    if (!permissables) return undefined;
    var tmp = [];
    if (permissables.indexOf('element') != -1) tmp.push(1);
    if (permissables.indexOf('text') != -1) tmp.push(3);
    if (permissables.indexOf('comment') != -1) tmp.push(8);
    if (permissables.indexOf('document') != -1) tmp.push(9);
    if (tmp.length > 0) return tmp;
}

function Iter(node, permissables) {
    this.permissables = _IterPermissions(permissables);
    this.next_node = node;
}
Iter.prototype = {
    next_node: undefined,
    stack: [],
    permissables: null,
    next: function() {
        var current = this.next_node;
        if (current === undefined) return undefined;
        if (current.firstChild) {
            this.stack.push(this.next_node);
            this.next_node = this.next_node.firstChild;
        } else if (this.next_node.nextSibling) {
            this.next_node = this.next_node.nextSibling;
        } else {
            while (this.stack.length > 0) {
                var back = this.stack.pop();
                if (back.nextSibling) {
                    this.next_node = back.nextSibling;
                    break;
                }
            }
            if (this.stack.length == 0) this.next_node = undefined;
        }
        if (!this.permissables) return current;
        if (this.permissables.indexOf(current.nodeType) != -1) return current;
        return this.next();
    }
};