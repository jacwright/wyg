module.exports = SelectionRange;
var indexOf = Array.prototype.indexOf;

/**
 * Similar to a range object, with anchor/focus instead of start/end since selection can go forwards and backwards
 */
function SelectionRange(selection) {
  this.anchorNode   = selection && selection.anchorNode || null;
  this.anchorOffset = selection && selection.anchorOffset || 0;
  this.focusNode    = selection && selection.focusNode || null;
  this.focusOffset  = selection && selection.focusOffset || 0;
}

/**
 * Restores a bookmark to a range object
 * @param {Element} container The HTML Element that was used to create the bookmark
 * @param {Object} bookmark A bookmark object that was previously retrived using getBookmark
 * @return {SelectionRange} A range representing this bookmark
 */
SelectionRange.restoreBookmark = function(container, bookmark) {
  var range = new SelectionRange();
  range.restoreBookmark(container, bookmark);
  return range;
};

SelectionRange.prototype = {
  constructor: SelectionRange,

  /**
   * Returns the element the anchor is in (if it is a text node will return the parent)
   * @return {Element} The anchor node if it is an element or the parent if it is a text node
   */
  get anchorElement() {
    var node = this.anchorNode;
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    return node;
  },

  /**
   * Returns the element the focus is in (if it is a text node will return the parent)
   * @return {Element} The focus node if it is an element or the parent if it is a text node
   */
  get focusElement() {
    var node = this.anchorNode;
    while (node && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    return node;
  },

  /**
   * Whether the selection is collapsed to a single point
   * @return {Boolean} Whether the selection is collapsed
   */
  get isCollapsed() {
    return this.anchorNode === this.focusNode && this.anchorOffset === this.focusOffset;
  },

  /**
   * Whether the selections point to the same location
   * @param {SelectionRange|Selection} selection Another SelectionRange or the browser's Selection object
   * @return {Boolean} Whether the two selections are equal to each other
   */
  equals: function(selection) {
    return selection.anchorNode   === this.anchorNode   &&
           selection.anchorOffset === this.anchorOffset &&
           selection.focusNode    === this.focusNode    &&
           selection.focusOffset  === this.focusOffset;
  },

  /**
   * Select this SelectionRange
   */
  select: function() {
    if (!this.anchorNode) return;
    var document = this.anchorNode.ownerDocument;
    var selection = document.defaultView.getSelection();

    if (!this.equals(selection)) {
      var range = document.createRange();
      range.setStart(this.anchorNode, this.anchorOffset);
      selection.removeAllRanges();
      selection.addRange(range);
      // using the selection API instead of range since the focus (where the cursor is) can be behind the anchor
      selection.extend(this.focusNode, this.focusOffset);
    }
  },

  /**
   * Returns a serializeable object for storage that can be restored later using a the same container. The nodes are
   * represented as arrays of indexes to find the node from the given container.
   * @param {Element} container The HTML Element used to create the bookmark
   * @return {Object} A bookmark object containing information to help restore the range later
   */
  getBookmark: function(container) {
    return {
      anchorPath: this.anchorNode ? getNodePath(container, this.anchorNode) : null,
      anchorOffset: this.anchorOffset,
      focusPath: this.focusNode ? getNodePath(container, this.focusNode) : null,
      focusOffset: this.focusOffset
    }
  },

  /**
   * Restore a bookmark into this range from the given container.
   * @param {Element} container The HTML Element that was used to create the bookmark
   * @param {Object} bookmark A bookmark object that was previously retrived using getBookmark
   */
  restoreBookmark: function(container, bookmark) {
    this.anchorNode = bookmark.anchorPath ? getNode(container, bookmark.anchorPath) : null;
    this.anchorOffset = bookmark.anchorOffset;
    this.focusNode = bookmark.focusPath ? getNode(container, bookmark.focusPath) : null;
    this.focusOffset = bookmark.focusOffset;
  }
};




// Creates an array of indexes to help find the same element within the editor
function getNodePath(container, node) {
  var path = [];
  while (node !== container) {
    var parent = node.parentNode;
    path.unshift(indexOf.call(parent.childNodes, node));
    node = parent;
  }
  return path;
}

function getNode(container, path) {
  var node = container;
  path.forEach(function(index) {
    node = node.childNodes[index];
  });
  return node;
}
