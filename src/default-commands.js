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

  h1:         makeFormatBlock('h1'),
  h2:         makeFormatBlock('h2'),
  h3:         makeFormatBlock('h3'),
  h4:         makeFormatBlock('h4'),
  h5:         makeFormatBlock('h5'),
  h6:         makeFormatBlock('h6'),
  p:          makeFormatBlock('p'),
  blockquote: makeFormatBlock('blockquote'),

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


function makeFormatBlock(tag, className) {
  return function() {
    this.editor.formatBlock(tag, className);
  };
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
      blockEl = this.editor.getBlockElement(el);
      return blockEl && blockEl.tagName.toLowerCase() === name;
    }
  };
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

