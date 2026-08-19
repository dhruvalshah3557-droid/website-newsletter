(function () {
  const tabs = document.querySelectorAll('.tab');
  const search = document.getElementById('search');
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const lastFetch = document.getElementById('last-fetch');

  let activeCategory = 'All';

  document.getElementById('year').textContent = new Date().getFullYear();

  function applyFilter() {
    const query = (search ? search.value : '').trim().toLowerCase();
    let visible = 0;

    grid.querySelectorAll('.card').forEach((card) => {
      const category = card.getAttribute('data-category') || '';
      const title = card.getAttribute('data-title') || '';
      const source = card.getAttribute('data-source') || '';
      const desc = card.getAttribute('data-desc') || '';

      const matchesCategory = activeCategory === 'All' || category === activeCategory;
      const matchesQuery =
        !query || title.includes(query) || source.includes(query) || desc.includes(query);

      const show = matchesCategory && matchesQuery;
      card.style.display = show ? '' : 'none';
      if (show) {
        visible += 1;
      }
    });

    if (empty) {
      empty.style.display = visible === 0 ? '' : 'none';
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.getAttribute('data-cat');
      applyFilter();
    });
  });

  if (search) {
    search.addEventListener('input', applyFilter);
  }

  function refreshLastFetch() {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        if (lastFetch && data.lastFetchAt) {
          lastFetch.textContent = new Date(data.lastFetchAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      })
      .catch(() => {});
  }

  refreshLastFetch();
  setInterval(refreshLastFetch, 60000);
  applyFilter();
})();
