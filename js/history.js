export class History {
  constructor(limit = 60) {
    this.limit = limit;
    this.entries = [];
    this.index = -1;
  }
  reset(state) {
    this.entries = [];
    this.index = -1;
    this.push(state);
  }
  push(state) {
    this.entries.splice(this.index + 1);
    this.entries.push(structuredClone(state));
    if (this.entries.length > this.limit + 1) this.entries.shift();
    this.index = this.entries.length - 1;
  }
  get canUndo() {
    return this.index > 0;
  }
  get canRedo() {
    return this.index < this.entries.length - 1;
  }
  undo() {
    return this.canUndo ? structuredClone(this.entries[--this.index]) : null;
  }
  redo() {
    return this.canRedo ? structuredClone(this.entries[++this.index]) : null;
  }
}
