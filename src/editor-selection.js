module.exports = EditorSelection;
var SelectionRange = require('./selection-range');

/**
 * A selection helper object assigned to a Editor instance to help manage document selection
 * @param {Editor} editor An instance of an Editor
 */
function EditorSelection(editor) {
  this.editor = editor;
}


EditorSelection.prototype = {
  constructor: EditorSelection,

  currentRange: new SelectionRange(),

  /**
   * Get the document the editor element belongs to. When using iframes this isn't necessarily currently scoped document
   * @return {Document} The document the editor element resides in
   */
  get document() {
    return this.editor.element.ownerDocument;
  },

  /**
   * Get the selection object for the window the editor element currently resides in
   * @return {Selection} The native browser's selection object
   */
  getSelection: function() {
    return this.document.getSelection();
  },

  /**
   * Get the range of the current selection range
   * @return {SelectionRange} The current selection range, this is a custom range object with anchor/focus instead of
   * start/end properties to work better with selection
   */
  getRange: function() {
    return new SelectionRange(this.getSelection());
  },

  /**
   * Get the range of the current selection range but anchor/focus to null if the selection isn't within the editor
   * @return {SelectionRange} The current selection range
   */
  getScopedRange: function() {
    var selection = this.getSelection();
    if (selection.anchorNode && !this.editor.element.contains(selection.anchorNode)) {
      selection = null;
    }
    return new SelectionRange(selection);
  },

  /**
   * Set the selection to the provided range object. Will take a SelectionRange or a built-in Range object
   * @param {SelectionRange|Range} range The range to set the selection to
   */
  setRange: function(range) {
    if (!range) {
      return;
    } else if (range.anchorNode) {
      this.select(range.anchorNode, range.anchorOffset, range.focusNode, range.focusOffset);
    } else if (range.startContainer) {
      var selection = range.startContainer.ownerDocument.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  },

  /**
   * Whether the current selection is within the given element, will return true only if the whole selection is within
   * the given element
   * @param {Element} element The element to test
   * @return {Boolean} Whether the selection is within the element
   */
  within: function(element) {
    var selection = this.getSelection();
    if (selection.anchorNode === null) return false;
    return element.contains(selection.anchorNode) &&
           (selection.anchorNode === selection.focusNode || element.contains(selection.focusNode));
  },

  /**
   * Select the  given anchor and focus. If no focus is provided will just be a collapsed selection
   * @param {Node} anchorNode The node the selection starts in
   * @param {Number} anchorOffset The offset of the selection within the anchor node
   * @param {Node} focusNode [Optional] The node the selection stops in
   * @param {Number} focusOffset [Optional] The offset the selection stops in
   */
  select: function(anchorNode, anchorOffset, focusNode, focusOffset) {
    if (!anchorNode) return;
    var document = anchorNode.ownerDocument;
    var selection = document.getSelection();
    var range = document.createRange();
    range.setStart(anchorNode, anchorOffset);
    selection.removeAllRanges();
    selection.addRange(range);
    if (focusNode) {
      selection.extend(focusNode, focusOffset);
    }
  },

  /**
   * Place the selection at the beginning text entry point of an element. This will find the first text node or BR
   * @param {Element} element The element to start looking for the first selectable area
   */
  selectBeginning: function(element) {
    var document = element.ownerDocument;
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, function(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue.trim() === '' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      } else if (node.nodeName === 'BR') {
        return NodeFilter.FILTER_ACCEPT;
      } else {
        return NodeFilter.FILTER_SKIP;
      }
    });
    var node = walker.nextNode();
    if (node) {
      if (nextNode.nodeType === Node.TEXT_NODE) {
        this.select(node, 0);
      } else {
        this.select(node.parentNode, 0);
      }
    }
  },


  /**
   * Get the bounding client rect of the current selection or null if there is no current selection
   * @return {ClientRect} The client rect for the current selection
   */
  getBoundingClientRect: function() {
    var selection = this.getSelection();
    if (!selection.rangeCount) return null;
    var range = selection.getRangeAt(0);

    // If the selection is not collapsed return the box that surrounds the whole
    if (!selection.isCollapsed) return range.getBoundingClientRect();

    // When a single cursor, there can be a rect at the end of one line AND the beginning of another, use the latter
    var rects = range.getClientRects();
    var rect = rects[rects.length - 1];

    // If we can't get the rect, insert a bit of text and get the bounding rect of that
    // (last-ditch hack, work to remove)
    if (!rect) {
      var shadowCaret = this.document.createTextNode('|');
      range.insertNode(shadowCaret);
      range.selectNode(shadowCaret);
      rect = range.getBoundingClientRect();
      shadowCaret.parentNode.removeChild(shadowCaret);
    }
    return rect;
  },


  /**
   * Tracks the current selection in the editor and dispatches a "selectionchange" event on the editor element when it
   * changes. This uses requestAnimationFrame because the native selectionchange event on document is not on IE and even
   * in Chrome it doesn't fire off when selection changes due DOM changes (e.g. the element with the selection is
   * removed from the DOM). This should be a low-impact solution that still fits our needs.
   */
  startTracking: function() {
    if (this._trackId) return;
    var currentRange = this.currentRange = new SelectionRange();
    var lastRange = currentRange;
    Object.freeze(currentRange);

    this._trackId = requestAnimationFrame(function getLatestSelection() {
      this._trackId = requestAnimationFrame(getLatestSelection.bind(this));
      var range = this.getScopedRange();

      if (!currentRange.equals(range)) {
        lastRange = currentRange;
        this.currentRange = currentRange = range;
        Object.freeze(currentRange);
        var event = new Event('selectionchange');
        event.lastRange = lastRange;
        event.currentRange = currentRange;
        this.editor.element.dispatchEvent(event);
      }
    }.bind(this));
  },

  /**
   * Stops tracking the current selection in the editor, cleaning up for garbage collection
   */
  stopTracking: function() {
    cancelAnimationFrame(this._trackId);
    this.currentRange = new SelectionRange();
    this._trackId = null;
  }

};
