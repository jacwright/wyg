module.exports = UndoManager;
var SelectionRange = require('./selection-range');

/**
 * An undo manager for the editor. It uses a mutation observer to clump multiple DOM updates into one undo step so
 * that robust and custom actions can be done by the editor. By storing the minimal changes to the DOM rather than a
 * complete copy we save a lot of memory, especially for larger documents.
 *
 * This undo manager supports collapsing characterData updates into one step for a better user experience, also saving
 * memory. It supports storing the selection before and after an undo step so that the correct selection can be
 * restored.
 *
 * UndoManager allows you to respond to changes and "fix" them if required. When a change happens an event will be
 * dispatched, "changing", that you can listen to in order to get the records of the change, see what was changed, make
 * additional changes, and/or stop (or rather revert) the change by calling event.preventDefault(). After this is
 * handled another event is dispatched, "change", to indicate a change was completed. If the change was stopped and no
 * additional changes made no "change" event will be dispatched. Note: "changing" will not be dispatched for undo/redo,
 * only for user-initiated changes. "change" will always be dispatched.
 *
 * You can also add JavaScript functions to the undo stack or executing them. Changes to the DOM will be ignored as a
 * result of this so that your JavaScript will not be fighting its changes in the undo stack.
 */
function UndoManager(editor) {
  this.editor = editor;
  this.observer = new MutationObserver(this.onChange.bind(this));
  this.undoStack = [];
  this.redoStack = [];
}


UndoManager.mutationTypes = {
  attributes: AttributeMutation,
  characterData: CharacterDataMutation,
  childList: ChildListMutation
};


UndoManager.prototype = {
  constructor: UndoManager,

  /**
   * Start observing for changes on the element
   */
  startObserving: function() {
    this.observer.observe(this.editor.element, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [ 'href', 'src' ]
    });
  },

  /**
   * Stop observing changes
   */
  stopObserving: function() {
    this.observer.disconnect();
  },

  /**
   * Ignores the upcoming changes to the DOM
   */
  ignoreNext: function() {
    if (this._ignoreNext) return;
    this._ignoreNext = true;
    setTimeout(function() {
      this._ignoreNext = false;
    });
  },

  /**
   * Undo the last action
   * @return {Boolean} Whether the undo was successful or not (if there are none)
   */
  undo: function() {
    var entry = this.undoStack.pop();
    if (!entry) return false;

    this.redoStack.push(entry);
    this.lastMutation = null;

    // Provide some robustness in case DOM has changed
    var successful = entry.undo();

    // Continue until we find a successful undo or run out of undos
    if (!successful) return this.undo();

    this.ignoreNext();
    if (entry.oldSelection) entry.oldSelection.select();
    this.editor.element.dispatchEvent(new Event('change'));
    return true;
  },

  /**
   * Undo the last action
   * @return {Boolean} Whether the undo was successful or not (if there are none)
   */
  redo: function() {
    var entry = this.redoStack.pop();
    if (!entry) return false;

    this.undoStack.push(entry);
    this.lastMutation = null;

    var successful = entry.redo();

    // Continue until we find a successful redo or run out of redos
    if (!successful) return this.redo();

    this.ignoreNext();
    if (entry.selection) entry.selection.select();
    this.editor.element.dispatchEvent(new Event('change'));
    return true;
  },

  /**
   * Executes a JavaScript action with an undoable counterpart. If redo is provided this will be used in the redo stack
   * instead of the action (usually the action will work for redo, but not always).
   * @param {Function} action The action that needs to be executed right now
   * @param {Function} undo The counterpart to the action that will undo what was done
   * @param {Function} redo [Optional] When `action` can't be used to redo, this will handle it
   */
  execute: function(action, undo, redo) {
    this.ignoreNext();
    var oldSelectionRange = this.editor.selection.getRange();
    action();
    var selectionRange = this.editor.selection.getRange();
    this.undoStack.push({
      undo: undo,
      redo: redo || action,
      oldSelection: oldSelectionRange,
      selection: selectionRange
    });
  },

  /**
   * Responds to DOM mutation changes
   */
  onChange: function(records) {
    // Log changes when asked to do so
    if (this.editor.debug) {
      console.log('------Mutation------', this._ignoreNext ? '(ignored)' : '');
      records.forEach(function(record) {
        console.log(record);
      });
    }

    if (this._ignoreNext) {
      this._ignoreNext = false;
      return;
    }

    records = this._getRecords(records);
    if (!records.length) return;

    if (this._changing) {
      if (this._changing.undone) {
        // Changes happened and then were undone, there should be a match of the same number of records, but if there
        // were other changes done during the preventDefault then these will appear before the undone changes. Drop the
        // undos. If the undone changes had 3 records, the first 3 and last 3 will be dropped and anything else will be
        // kept (if additional changes were made).
        this._changing = records.slice(0, -this._changing.undone);
      } else {
        this._changing.push.apply(this._changing, records);
      }
    } else {
      this._queueChange(records);
    }
  },

  // Get the normalized change records from the mutation records
  _getRecords: function(records) {
    var prev;
    return records.map(function(record) {
      if (prev && record.type === prev.type && prev.type === 'characterData' && record.target === prev.node) {
        prev.value = record.target.nodeValue;
        return;
      }
      var Class = UndoManager.mutationTypes[record.type];
      if (Class) {
        prev = new Class(record);
        return prev;
      }
    }).filter(Boolean);
  },

  // Queue a change up dispatching the event and checking if anything changes before dispatching
  _queueChange: function(records) {
    var oldSelectionRange = this.editor.selection.range;
    this._changing = records;
    var event = new Event('changing', { cancelable: true });
    event.records = records;
    this.editor.element.dispatchEvent(event);

    // Roll back the changes
    if (event.defaultPrevented) {
      records.undone = 0;
      records.reverse().forEach(function(record) {
        if (record.undo()) records.undone++;
      });
    }

    setTimeout(function() {
      var changed = this._changing;
      this._changing = null;
      if (changed.length) {
        this._storeChange(changed);
        this.editor.element.dispatchEvent(new Event('change'));
      } else {
        oldSelectionRange.select();
      }
    }.bind(this));
  },

  // Once a change is done, store it in the undo array (merging with the last change if required)
  _storeChange: function(records) {
    var oldSelectionRange = this.editor.selection.range;
    var selectionRange = this.editor.selection.getRange();

    var record = records[records.length - 1];
    if (record.type === 'characterData') {
      if (this.lastMutation && this.lastMutation.getInputType() === record.getInputType()) {
        this.lastMutation.value = record.value;
        this.undoStack[this.undoStack.length - 1].selection = selectionRange;
        return;
      }
    }

    var lastCharacterRecord = null;
    for (var i = records.length - 1; i >= 0; i--) {
      var r = records[i];
      if (records[i].type === 'characterData') {
        lastCharacterRecord = records[i];
        break;
      }
    }
    this.lastMutation = lastCharacterRecord;

    records.oldSelection = oldSelectionRange;
    records.selection = selectionRange;
    this.undoStack.push(makeRecordsUndoable(records));
    this.redoStack.length = 0;
  }
};


function undoRecord(record) {
  return record.undo();
}

function redoRecord(record) {
  return record.redo();
}

// Add undo/redo methods to the array
function makeRecordsUndoable(records) {
  records.undo = undoRecords;
  records.redo = redoRecords;
  return records;
}

function undoRecords() {
  var someUndone = false;
  this.reverse().forEach(function(record) {
    if (record.undo()) someUndone = true;
  });
  return someUndone;
}

function redoRecords() {
  var someRedone = false;
  this.reverse().forEach(function(record) {
    if (record.redo()) someRedone = true;
  });
  return someRedone;
}


/**
 * Undoable mutation for attribute mutations
 */
function AttributeMutation(record) {
  this.node = record.target;
  this.name = record.attributeName;
  this.namespace = record.attributeNamespace;
  this.oldValue = record.oldValue;
  this.value = this.node.getAttribute(this.name);
}

AttributeMutation.prototype.type = 'attributes';

AttributeMutation.prototype.undo = function() {
  if (!this.node.ownerDocument.contains(this.node)) {
    return false;
  }
  if (this.oldValue === null) {
    this.node.removeAttributeNS(this.namespace, this.name);
  } else {
    this.node.setAttributeNS(this.namespace, this.name, this.oldValue);
  }
  return true;
};

AttributeMutation.prototype.redo = function() {
  if (!this.node.ownerDocument.contains(this.node)) {
    return false;
  }
  if (this.value === null) {
    this.node.removeAttributeNS(this.namespace, this.name);
  } else {
    this.node.setAttributeNS(this.namespace, this.name, this.value);
  }
  return true;
};


/**
 * Undoable mutation for character data mutations
 */
function CharacterDataMutation(record) {
  this.node = record.target;
  this.oldValue = record.oldValue;
  this.value = this.node.nodeValue;
}

CharacterDataMutation.prototype.type = 'characterData';

CharacterDataMutation.prototype.getInputType = function() {
  return this.value.length > this.oldValue.length ? 'insert' : 'delete';
};

CharacterDataMutation.prototype.undo = function() {
  if (!this.node.ownerDocument.contains(this.node)) {
    return false;
  }
  this.node.nodeValue = this.oldValue;
  return true;
};

CharacterDataMutation.prototype.redo = function() {
  if (!this.node.ownerDocument.contains(this.node)) {
    return false;
  }
  this.node.nodeValue = this.value;
  return true;
};


/**
 * Undoable mutation for child list mutations
 */
function ChildListMutation(record) {
  this.node = record.target;
  this.added = record.addedNodes;
  this.removed = record.removedNodes;
  this.nextSibling = record.nextSibling;
}

ChildListMutation.prototype.type = 'childList';

ChildListMutation.prototype.getInputType = function() {
  return this.value.length > this.oldValue.length ? 'insert' : 'delete';
};

ChildListMutation.prototype.undo = function() {
  if (!this.node.ownerDocument.contains(this.node)) {
    return false;
  }

  var i;
  for (i = 0; i < this.added.length; i++) {
    this.node.removeChild(this.added[i]);
  }
  var frag = document.createDocumentFragment();
  for (i = 0; i < this.removed.length; i++) {
    frag.appendChild(this.removed[i])
  }
  this.node.insertBefore(frag, this.nextSibling);
  return true;
};

ChildListMutation.prototype.redo = function() {
  if (!this.node.ownerDocument.contains(this.node)) {
    return false;
  }

  var i;
  for (i = 0; i < this.removed.length; i++) {
    this.node.removeChild(this.removed[i]);
  }
  var frag = document.createDocumentFragment();
  for (i = 0; i < this.added.length; i++) {
    frag.appendChild(this.added[i])
  }
  this.node.insertBefore(frag, this.nextSibling);
  return true;
};
