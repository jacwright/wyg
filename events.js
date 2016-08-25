

function registerElement(element) {
  element.addEventListener('input', onInput);


  if (!('oninput' in element)) {
    element.lastHTML = element.innerHTML;
    element.addEventListener('');
    element.addEventListener('paste', handlePaste, false);
    element.addEventListener('keyup', handleChanges, false);
    element.addEventListener('mouseup', handleChanges, false);
    element.addEventListener('mousedown', handleChanges, false);
    element.addEventListener('paste', handleChanges, false);
    element.addEventListener('cut', handleChanges, false);
  }
}



function onInput(event) {
  if (event.currentTarget !== event.target && !event.target.contentEditable) {
    // Fix IE's target
    Object.defineProperty(event, 'target', { get: function() { return event.currentTarget }});
  }
}

function handleChangesDelayed(event) {
  setTimeout(function() {
    handleChanges(event);
  });
}

function handleChanges(event) {
  var element = event.target;
  var html = element.innerHTML;
  if (html !== element.lastHTML) {
    element.dispatchFrom(element, 'htmlChange', false, { value: html, previous: element.lastHTML });
    element.lastHTML = html;
  }
}