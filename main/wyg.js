var Class = require('chip-utils/class');
var slice = Array.prototype.slice;


function Editor(element) {
  this.element = element;
  this.blocks = [];
  this.blocks.byId = {};
  this.selection = new Selection();
}

Class.extend(Editor, {

  bold: function() {
    // Add the bold markup, or set the intent
  },

  italic: function() {
    // Add the italic markup, or set the intent
  },

  link: function(url) {
    // Add a link
  },

  setBlockType: function(type) {
    if (!Block.types.hasOwnProperty(type)) {
      return false;
    }
    // Set the selected blocks to the given type
    this.getSelectedBlocks().forEach(function(block) {
      block.type = type;
      this.updateBlock(block);
    }, this);
  },

  getSelectedBlocks: function() {
    if (this.selection.startBlock === this.selection.endBlock) {
      if (!this.selection.startBlock) return [];
      return [ this.selection.startBlock ];
    }
    return this.blocks.slice(
      this.blocks.indexOf(this.selection.startBlock),
      this.blocks.indexOf(this.selection.endBlock)
    );
  },




  fromDOM: function() {
    slice.call(this.element.childNodes).map(function(node) {
      return Block.fromDOM(node);
    }).filter(Boolean)
  },


  insertBlock: function(block, index) {
    this.blocks.splice(index, 0, block);
    block.id = newId();
    this.blocks.byId[block.id] = block;
  },

  updateBlock: function(block, index) {
    this.blocks.splice(index, 1, block);
  },

  removeBlock: function(index) {
    var block = this.blocks.splice(index, 1).pop();
    if (block) {
      delete this.blocks.byId[block.id];
      return true;
    } else {
      return false;
    }
  }

});

var markups = {
  a, strong, em
}


/*

1. space will create a list
* space will create a bullet list

Each line-item is a Block. Multiple consecutive Blocks of the same list type will be rendered within the same ol/ul
Enter key will create another list item of the same if in a list
Otherwise enter will create a paragraph

A mapping function will create the HTML for each known block item

A parsing function will create the blocks from HTML

A function will convert text+markup into HTML (newlines become <br>, cannot use textContent because of this)

Have full import/export of trusted HTML

Have partial import/export of trusted HTML (one or two blocks)

*/


function Selection() {
  this.startBlock = null;
  this.startIndex = 0;
  this.endBlock = null;
  this.endIndex = 0;
}


function Block() {
  this.type = 'p';
  this.text = '';
  this.markups = [];
  this.metadata = {};
}

Class.extend(Block, {
  static: {
    types: {
      p: true,
      h2: true,
      h3: true,
      pre: true,
      figure: true,
      blockquote: true,
      ol_li: true,
      ul_li: true
    }
  },


  toDOM: function() {
    var element = document.createElement(this.type);
    element.textContent = this.text;
    return element;
  },

  fromDOM: function(element) {
    this.type = element.tagName.toLowerCase();
    this.text = element.textContent;
  }
});



function newId() {
  return Math.random().toString(36).slice(-5);
}


// CSS Selector and template
var mappings = {
  p: '<p></p>',
  figure: '<figure contenteditable="false"><img src="{{url}}"><figcaption contenteditable="true">{{caption}}</figcaption></figure>'
};
