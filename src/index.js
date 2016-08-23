require('es6-object-assign').polyfill();
var Editor = require('./editor');

/**
 * Create a new editor
 * @param  {[type]} element [description]
 * @return {[type]}         [description]
 */
exports.create = function(element, options) {
  return new Editor(element, options);
};
