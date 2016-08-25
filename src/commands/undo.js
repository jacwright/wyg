var editor = require('../index');
var selection = require('../selection');
var Bookmark = require('../bookmark');
var isMac = require('../platform').isMac;
var undoShortcut = isMac ? 'Cmd+Z' : 'Ctrl+Z';
var redoShortcut = isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y';


editor.registerShortcut(undoShortcut, function(event, editor) {
  event.preventDefault();
  var currentEditable = selection.anchorEditable;
  var currentSelection = new Bookmark(currentEditable);
  if (document.execCommand('undo')) {
    document.execCommand('redo');
    var undoEditable = selection.anchorEditable;
    if (currentEditable === undoEditable && currentSelection.equals(new Bookmark(undoEditable))) {
      if (!scrollIntoViewIfNecessary()) {
        document.execCommand('undo');
      }
    } else {
      requestAnimationFrame(scrollIntoView);
    }
  }
});


editor.registerShortcut(redoShortcut, function(event, editor) {
  event.preventDefault();
  var currentEditable = selection.anchorEditable;
  var currentSelection = new Bookmark(currentEditable);
  if (document.execCommand('redo')) {
    document.execCommand('undo');
    var undoEditable = selection.anchorEditable;
    if (currentEditable === undoEditable && currentSelection.equals(new Bookmark(undoEditable))) {
      document.execCommand('redo');
    }
  }
});


function scrollIntoView() {
  setTimeout(function() {
    var container = selection.focusElement.closest('#editor');
    var view = container.getBoundingClientRect();
    var caret = selection.getCaretRect();
    var midPoint = view.top + view.height/2;
    var difference = midPoint - caret.bottom;
    scrollTo(container, Math.round(container.scrollTop - difference));
  });
}

function scrollIntoViewIfNecessary() {
  var container = selection.focusElement.closest('#editor');
  var view = container.getBoundingClientRect();
  var caret = selection.getCaretRect();
  if (caret.top < view.top || caret.bottom > view.bottom) {
    var midPoint = view.top + view.height/2;
    var difference = midPoint - caret.bottom;
    scrollTo(container, Math.round(container.scrollTop - difference));
    return true;
  }
  return false;
}


function scrollTo(element, to, duration) {
  if (!duration || duration < 0) duration = 200;
  var start = Date.now();
  var difference = to - element.scrollTop;
  var perTick = difference / duration * 10;

  requestAnimationFrame(function step() {
    var percent = (Date.now() - start) / duration;
    if (percent >= 1) {
      element.scrollTop = to;
    } else {
      var percentToFinal = 1 - easeInOutQuad(percent);
      element.scrollTop = to - difference * percentToFinal;
      requestAnimationFrame(step);
    }
  });
}


function easeInOutQuad(percent) {
  if ((percent /= .5) < 1) {
    return 0.5 * percent * percent;
  } else {
    return -0.5 * ((--percent) * (percent - 2) - 1);
  }
}
