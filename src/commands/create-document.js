var editor = require('../index');
var selection = require('../selection');

editor.registerShortcut('Cmd+Enter', function(event, editor) {
  event.preventDefault();

  // TODO create a new scene right after this one, then chapter, don't be doing anything undo/redoable
  if (selection.focusElement.tagName === 'P') {
    var p = selection.focusElement;
    document.execCommand('insertHTML', false, '<hr><p><br></p>');
  }

  return;
  var sel = window.getSelection();
  var block = sel.focusNode;
  var range = document.createRange();
  sel.removeAllRanges();

  while (block.parentNode.tagName !== 'DIV') {
    block = block.parentNode;
  }

  if (block.previousSibling && block.previousSibling.className === 'scene-break' && block.childNodes.length === 1 && block.childNodes[0].tagName === 'BR') {
    var page = block.parentNode;
    range.setStartBefore(block.previousSibling);
    range.setEndAfter(block);
    sel.addRange(range);
    document.execCommand('delete');
    sel.removeAllRanges();
    range.setStartAfter(page);
    range.collapse();
    sel.addRange(range);
    document.execCommand('insertHTML', false, '<br><div class="page"><h1><br></h1></div><br>');
    sel.removeAllRanges();
    range.selectNode(page.nextSibling.nextSibling.querySelector('h1').firstChild);
    sel.addRange(range);
  } else {
    range.setStartAfter(block);
    sel.addRange(range);
    document.execCommand('insertHTML', false, '<div class="scene-break" contenteditable="false"></div><p><br></p>');
    // sel.anchorNode.previousSibling.setAttribute('contenteditable', 'false');
/*

Notes:

Using mutation observers we could update the DOM in non-undoable ways, for example add contenteditable="false" to
scene-breaks.

Will not work with IE <= 11. Only Edge. Does not support insertHTML.

Could use this or CKEditor on each "page" and localize the undo-redo to text. Creating a new chapter would not be
undoable, but creating a scene might be. Deleting a chapter or scene would throw them into the trash and so having
and undo is less critical.


*/
  }
});