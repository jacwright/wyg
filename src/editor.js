module.exports = Editor;
var shortcuts = require('shortcut-string');
var ElementSelection = require('./element-selection');
var UndoManager = require('./undo-manager');
var Blocks = require('./blocks');
var defaultCommands = require('./default-commands');
var defaultShortcuts = require('./default-shortcuts');
var fKey = /^F\d+$/;
var defaultOptions = {
  handleContentEditable: true
};

/**
 * A browser text editor based on contenteditable.
 * @param {Element} element The HTML element which contains this editor
 * @param {[type]} options Options for this editor
 */
function Editor(element, options) {
  element.editor = this;
  this.handleShortcut = this.handleShortcut.bind(this);
  this.handlePaste = this.handlePaste.bind(this);
  this.element = element;
  this.blocks = new Blocks(this.element);
  this.options = Object.assign({}, defaultOptions, options);
  this.commands = Object.assign({ editor: this }, defaultCommands.commands);
  this.state = Object.assign({ editor: this }, defaultCommands.state);
  this.shortcuts = Object.assign({}, defaultShortcuts);
  this.selection = new ElementSelection(this.element);
  this.undoManager = new UndoManager(this);
  this.enabled = true;
}

Editor.prototype = {
  constructor: Editor,

  /**
   * Provides the current document which may be different from the current scope because of iframes
   * @return {Document} The document this editor is operating within
   */
  get document() {
    return this.element.ownerDocument;
  },

  /**
   * Enable/disabled the editor which makes it able to be typed into and edited by a user
   * @type {Boolean} Whether the editor is editable
   */
  get enabled() {
    return this._enabled;
  },

  set enabled(value) {
    if (this._enabled === value) return;
    this._enabled = value;
    if (this.options.handleContentEditable) this.element.contentEditable = value;
    var document = this.element.ownerDocument;

    // use the tags, not the style attribute
    document.execCommand('styleWithCSS', false, false);
    // use <p> by default, not <div> or <br>
    document.execCommand('defaultParagraphSeparator', false, 'p');

    if (value) {
      this.selection.startTracking();
      this.undoManager.startObserving();
      this.element.addEventListener('keydown', handleKeyDown);
      this.element.addEventListener('shortcut', this.handleShortcut);
      this.element.addEventListener('paste', this.handlePaste);
    } else {
      this.selection.stopTracking();
      this.undoManager.stopObserving();
      this.element.removeEventListener('keydown', handleKeyDown);
      this.element.removeEventListener('shortcut', this.handleShortcut);
      this.element.removeEventListener('paste', this.handlePaste);
    }
  },

  /**
   * Get the html for this editor
   * @return {String} The HTML content for this editable area
   */
  get html() {
    return this.element.innerHTML;
  },

  set html(value) {
    this.element.innerHTML = value;
  },

  /**
   * Undo the last action
   */
  undo: function() {
    this.undoManager.undo();
  },

  /**
   * Redo the last undo
   */
  redo: function() {
    this.undoManager.redo();
  },







  /**
   * Format the current selection with the block tag and name
   * @param {String} tag Block tag name (or parent name for li blocks like ol/ul)
   * @param {String} className [Optional] The class name the blocks should have
   */
  formatBlock: function(tag, className) {
    className = className || null;
    // var bookmark = this.editor.selection.getBookmark();

    var blocks = this.blocks.getSelected();
    if (this.blocks.blocksMatchTag(blocks, tag, className)) {
      return;
    }

    var newBlocks = this.blocks.convertTag(blocks, tag, className);

    // If this is a list, combined adjacent lists to it
    if (newBlocks[0].nodeName === 'LI') {
      var prevLI = this.blocks.previousBlock(newBlocks[0]);
      var nextLI = this.blocks.previousBlock(newBlocks[newBlocks.length - 1]);
      if (!this.blocks.blockMatchesTag(prevLI)) prevLI = null;
      if (!this.blocks.blockMatchesTag(nextLI)) nextLI = null;

      if (this.blocks.blockMatchesTag(prevLI)) {
        var prevSibs = this.blocks.blockRange(prevLI.parentNode.firstElementChild, prevLI).forEach(function(li) {
          return li.cloneNode(true);
        });
        newBlocks.unshift.apply(newBlocks, prevSibs);
      }

      if (this.blocks.blockMatchesTag(nextLI)) {
        var nextSibs = this.blocks.blockRange(nextLI, nextLI.parentNode.lastElementChild).forEach(function(li) {
          return li.cloneNode(true);
        });
        newBlocks.push.apply(newBlocks, nextSibs);
      }

      if (this.blocks.blockMatchesTag(list)) {
        blocks.forEach(function(block) {
          var parent = block.parentNode;
          parent.removeChild(block);
          if (block.nodeName === 'LI' && parent.children.length === 0) {
            parent.parentNode.removeChild(parent);
          }
        });
      }
    }

    // For a LIST find the first LI that is the same, if any, and put all the LIs into it, cloning any LIs that weren't
    // it's children. Otherwise use the UL/OL that was created for this operation.
    blocks.forEach(function(block, i) {
      var newBlock = newBlocks[i];
      if (newBlock !== block) {
        block.parentNode.replaceChild(newBlock, block);
      }
    });

    // this.editor.selection.selectBookmark(bookmark);
  },







  handleShortcut: function(event) {
    var commandName = this.shortcuts[event.shortcut];
    if (commandName && this.commands[commandName]) {
      event.preventDefault();
      this.commands[commandName]();
    }
  },

  handlePaste: function(event) {
    event.preventDefault();
  },
};


var ctrlKeys = {
  Control: true,
  Shift: true,
  Alt: true,
  Meta: true
};

// Dispatch shortcut event on element
function handleKeyDown(event) {
  // Assume one of these for shortcuts
  var key = event.key;
  var ctrlKeyPressed = event.ctrlKey || event.metaKey || event.altKey;
  if (fKey.test(key) || ctrlKeyPressed && !ctrlKeys[key]) {
    var shortcutEvent = new Event('shortcut', { cancelable: true });
    shortcutEvent.shortcut = shortcuts.fromEvent(event);
    this.dispatchEvent(shortcutEvent);
    if (shortcutEvent.defaultPrevented) {
      event.preventDefault();
    }
  }
}
