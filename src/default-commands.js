/*
* Rrom Adam Sanderson's WYSIWYG
* https://github.com/adamsanderson/wysiwyg/
*/
var ELEMENT_NODE = document.ELEMENT_NODE;

exports.commands = {
  undo:       undo,
  redo:       redo,
  bold:       makeCommand('bold'),
  italic:     makeCommand('italic'),
  strike:     makeCommand('strikethrough'),
  underline:  makeCommand('underline'),
  sub:        makeCommand('subscript'),
  sup:        makeCommand('superscript'),

  h1:         makeCommand('formatblock', 'h1'),
  h2:         makeCommand('formatblock', 'h2'),
  h3:         makeCommand('formatblock', 'h3'),
  h4:         makeCommand('formatblock', 'h4'),
  h5:         makeCommand('formatblock', 'h5'),
  h6:         makeCommand('formatblock', 'h6'),
  p:          makeCommand('formatblock', 'p'),
  div:        makeCommand('formatblock', 'div'),
  blockquote: makeCommand('formatblock', 'blockquote'),

  ol:         makeCommand('insertorderedlist'),
  ul:         makeCommand('insertunorderedlist'),

  indent:     makeCommand('indent'),
  outdent:    makeCommand('outdent'),
  clear:      makeCommand('removeformat'),

  hr:         makeCommand('inserthorizontalrule'),
  img:        makeCommand('insertimage'),
  br:         makeCommand('inserthtml', '<br>'),

  html:       makeCommand('inserthtml')
};

exports.state = {
  bold:       makeQuery('bold'),
  italic:     makeQuery('italic'),
  strike:     makeQuery('strikethrough'),
  underline:  makeQuery('underline'),
  sub:        makeQuery('subscript'),
  sup:        makeQuery('superscript'),

  h1:         checkParent('h1'),
  h2:         checkParent('h2'),
  h3:         checkParent('h3'),
  h4:         checkParent('h4'),
  h5:         checkParent('h5'),
  h6:         checkParent('h6'),
  p:          checkParent('p'),
  div:        checkParent('div'),
  blockquote: checkParent('blockquote'),

  ol:         checkParent('ol'),
  ul:         checkParent('ul')
};

function undo() {
  this.editor.undo();
}

function redo() {
  this.editor.redo();
}

function makeCommand(command, param) {
  return function(userParam) {
    return this.editor.document.execCommand(command, false, param || userParam);
  };
}

function makeQuery(command) {
  return function() {
    return this.editor.document.queryCommandState(command);
  };
}

function checkParent(name) {
  return function() {
    var el, blockEl;
    el = nearestElement(getRangeStartNode());

    if (el) {
      blockEl = getBlockElement(el);
      return blockEl && blockEl.tagName.toLowerCase() === name;
    }
  };
}

function getBlockElement(el) {
  var style   = getStyle(el);
  var display = style.display;

  if (display == 'block' || display == 'table') {
    return el;
  } else {
    return getBlockElement(el.parentElement);
  }
}

function nearestElement(node) {
  return node.nodeType == ELEMENT_NODE ? node : node.parentElement;
}

function getStyle(el) {
  if (window.getComputedStyle) {
    return window.getComputedStyle(el);
  } else {
    return el.currentStyle;
  }
}

function getRangeStartNode() {
  var document = this.editor.document;
  var selection = document.getSelection();
  var node;

  if (selection.rangeCount) {
    node = selection.getRangeAt(0).startContainer;
  } else {
    node = document.body;
  }

  return node;
}
