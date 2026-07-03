export class NotebookUI {
  constructor(container) {
    this.entries = container.querySelector('#notebook-entries');
  }

  setData(state) {
    this.state = state;
    this.render();
  }

  render() {
    if (!this.state) return;

    if (this.state.notebook.length === 0) {
      this.entries.innerHTML = '<p style="color:var(--text-secondary)">Your field notebook is empty. Explore regions and collect artifacts to fill it.</p>';
      return;
    }

    this.entries.innerHTML = this.state.notebook.map(entry => {
      const date = new Date(entry.time).toLocaleString();
      return `
        <div class="notebook-entry">
          <div class="entry-time">${date}</div>
          <div class="entry-text">${entry.text}</div>
        </div>
      `;
    }).join('');
  }
}
