//     NoFlo - Flow-Based Programming for JavaScript
//     (c) 2014-2017 Flowhub UG
//     NoFlo may be freely distributed under the MIT license
const { EventEmitter } = require('events');

// ## NoFlo Port Base class
//
// Base port type used for options normalization. Both inports and outports extend this class.

// The list of valid datatypes for ports.
const validTypes = [
  'all',
  'string',
  'number',
  'int',
  'object',
  'array',
  'boolean',
  'color',
  'date',
  'bang',
  'function',
  'buffer',
  'stream',
];

function handleOptions(options = {}) {
  // We default to the `all` type if no explicit datatype
  // was provided
  let datatype = options.datatype || 'all';
  // Normalize the legacy `integer` type to `int`.
  if (datatype === 'integer') { datatype = 'int'; }

  // By default ports are not required for graph execution
  const required = options.required || false;

  // Ensure datatype defined for the port is valid
  if (validTypes.indexOf(datatype) === -1) {
    throw new Error(`Invalid port datatype '${datatype}' specified, valid are ${validTypes.join(', ')}`);
  }

  // Ensure schema defined for the port is valid
  const schema = options.schema || options.type;

  if (schema && (schema.indexOf('/') === -1)) {
    throw new Error(`Invalid port schema '${schema}' specified. Should be URL or MIME type`);
  }

  /* eslint-disable prefer-object-spread */
  return Object.assign({}, options, {
    datatype,
    required,
    schema,
  });
}

module.exports = class BasePort extends EventEmitter {
  constructor(options) {
    super();
    // Options holds all options of the current port
    this.options = handleOptions(options);
    // Sockets list contains all currently attached
    // connections to the port
    this.sockets = [];
    // Name of the graph node this port is in
    this.node = null;
    // Name of the port
    this.name = null;
  }

  getId() {
    if (!this.node || !this.name) {
      return 'Port';
    }
    return `${this.node} ${this.name.toUpperCase()}`;
  }

  getDataType() { return this.options.datatype; }

  getSchema() { return this.options.schema || null; }

  getDescription() { return this.options.description; }

  attach(socket, index = null) {
    let idx = index;
    if (!this.isAddressable() || (index === null)) {
      idx = this.sockets.length;
    }
    this.sockets[idx] = socket;
    this.attachSocket(socket, idx);
    if (this.isAddressable()) {
      this.emit('attach', socket, idx);
      return;
    }
    this.emit('attach', socket);
  }

  /* eslint-disable class-methods-use-this */
  attachSocket() { }

  detach(socket) {
    const index = this.sockets.indexOf(socket);
    if (index === -1) {
      return;
    }
    this.sockets[index] = undefined;
    if (this.isAddressable()) {
      this.emit('detach', socket, index);
      return;
    }
    this.emit('detach', socket);
  }

  isAddressable() {
    if (this.options.addressable) { return true; }
    return false;
  }

  isBuffered() {
    if (this.options.buffered) { return true; }
    return false;
  }

  isRequired() {
    if (this.options.required) { return true; }
    return false;
  }

  isAttached(socketId = null) {
    if (this.isAddressable() && (socketId !== null)) {
      if (this.sockets[socketId]) { return true; }
      return false;
    }
    if (this.sockets.length) { return true; }
    return false;
  }

  listAttached() {
    const attached = [];
    for (let idx = 0; idx < this.sockets.length; idx += 1) {
      const socket = this.sockets[idx];
      if (socket) { attached.push(idx); }
    }
    return attached;
  }

  isConnected(socketId = null) {
    if (this.isAddressable()) {
      if (socketId === null) { throw new Error(`${this.getId()}: Socket ID required`); }
      if (!this.sockets[socketId]) { throw new Error(`${this.getId()}: Socket ${socketId} not available`); }
      return this.sockets[socketId].isConnected();
    }

    let connected = false;
    this.sockets.forEach((socket) => {
      if (!socket) { return; }
      if (socket.isConnected()) {
        connected = true;
      }
    });
    return connected;
  }

  /* eslint-disable class-methods-use-this */
  canAttach() { return true; }
};
