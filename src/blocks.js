module.exports = Blocks;


function Blocks(element) {
  this.element = element;
  this.names = [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'li' ];
  this.walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, function(element) {
    return this.names.indexOf(element.nodeName.toLowerCase()) !== -1;
  }.bind(this));
}


/**
 * Get all blocks that have the selection within them or encompassing them
 * @return {Array} An array of block elements
 */
Blocks.prototype.getSelected = function() {
  var selection = this.element.ownerDocument.getSelection();
  if (!selection.rangeCount) return;

  var range = selection.getRangeAt(0);
  var startBlock = this.closestBlock(range.startContainer);
  var endBlock = range.endContainer === range.startContainer ? startBlock : this.closestBlock(range.endContainer);

  if (startBlock === endBlock) {
    return [ startBlock ];
  } else {
    return this.blockRange(startBlock, endBlock);
  }
};

Blocks.prototype.previousBlock = function(node) {
  this.walker.currentNode = node;
  return this.walker.previousNode();
};

Blocks.prototype.nextBlock = function(node) {
  this.walker.currentNode = node;
  return this.walker.nextNode();
};

Blocks.prototype.closestBlock = function(node) {
  return (node.closest || node.parentNode.closest)(this.names.join(','));
};

Blocks.prototype.blockRange = function(fromBlock, toBlock) {
  var block, blocks = [ fromBlock ];
  this.walker.currentNode = fromBlock;
  while (block = this.walker.nextNode()) {
    blocks.push(block);
    if (block === toBlock) {
      break;
    }
  }
  return blocks;
};

Blocks.prototype.blockMatchesTag = function(block, tag, className) {
  tag = tag.toUpperCase();
  className = className || null;
  if (block.nodeName === 'LI') block = block.parentNode;
  return block.nodeName === tag && block.getAttribute('class') === className;
};

Blocks.prototype.blocksMatchTag = function(blocks, tag, className) {
  tag = tag.toUpperCase();
  className = className || null;
  return blocks.every(function(block) {
    if (block.nodeName === 'LI') block = block.parentNode;
    return block.nodeName === tag && block.getAttribute('class') === className;
  });
};

Blocks.prototype.searchRange = function(fromBlock, toBlock, matcher) {
  if (matcher(fromBlock)) {
    return fromBlock;
  }
  var block;
  this.walker.currentNode = fromBlock;
  while (block = this.walker.nextNode()) {
    if (matcher(block)) return block;
    if (block === toBlock) break;
  }
};


Blocks.prototype.convertTag = function(blocks, tag, className) {
  var list;
  tag = tag.toUpperCase();
  className = className || null;

  // For lists, all the li nodes will be put into one parent list
  if (tag === 'UL' || tag === 'OL') {
    list = document.createElement(tag);
    if (className) list.className = className;
  }

  return blocks.map(function(block) {
    var newBlock;
    var clone = block.cloneNode(true);

    if (list) {
      newBlock = document.createElement('li');
      list.appendChild(newBlock);
    } else {
      newBlock = document.createElement(tag);
      if (className) newBlock.className = className;
    }
    while (clone.firstChild) newBlock.appendChild(clone.firstChild);
    return newBlock;
  });
};

