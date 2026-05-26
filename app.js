// ============================================================
// Bebidasem · Dashboard de Estoque (versão estática)
// Lê os dados de window.DASHBOARD_DATA (do data.js)
// ============================================================

(function () {
  'use strict';

  const data = window.DASHBOARD_DATA;
  const SALES_WINDOW = data.salesWindowDays || 90;

  const state = {
    daysThreshold: 5,
    searchQuery: '',
    statusFilter: 'all',
    vendorFilter: 'all',
    sortBy: 'days',
    sortDir: 'asc'
  };

  // Velocidade, dias de cobertura, status e sugestão
  function enrich(product) {
    const dailyVelocity = product.sold90 / SALES_WINDOW;

    let daysOfCover, status;

    if (product.stock === 0) {
      daysOfCover = 0;
      status = 'critical';
    } else if (dailyVelocity === 0) {
      daysOfCover = Infinity;
      status = 'stagnant';
    } else {
      daysOfCover = product.stock / dailyVelocity;
      if (daysOfCover < state.daysThreshold * 0.5) status = 'critical';
      else if (daysOfCover < state.daysThreshold) status = 'warning';
      else status = 'ok';
    }

    let suggestion = 0;
    if (status === 'critical' || status === 'warning') {
      const targetDays = state.daysThreshold + 30;
      const target = Math.ceil(dailyVelocity * targetDays);
      suggestion = Math.max(target - product.stock, 6);
      suggestion = Math.ceil(suggestion / 6) * 6;
    }

    return { ...product, dailyVelocity, daysOfCover, status, suggestion };
  }

  function recompute() {
    return data.products.map(enrich);
  }

  function renderStats(products) {
    const out = products.filter(p => p.stock === 0).length;
    const low = products.filter(
      p => p.status === 'warning' || (p.status === 'critical' && p.stock > 0)
    ).length;
    const ok = products.filter(p => p.status === 'ok' || p.status === 'stagnant').length;
    const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
    const totalSold = products.reduce((sum, p) => sum + p.sold90, 0);

    document.getElementById('stat-out').textContent = out;
    document.getElementById('stat-out-detail').innerHTML =
      `de <strong>${products.length}</strong> produtos zerados`;

    document.getElementById('stat-low').textContent = low;
    document.getElementById('stat-low-detail').innerHTML =
      `acabam em menos de <strong>${state.daysThreshold}</strong> dias`;

    document.getElementById('stat-ok').textContent = ok;
    document.getElementById('stat-ok-detail').innerHTML = `com cobertura adequada`;

    document.getElementById('stat-total').textContent = totalUnits.toLocaleString('pt-BR');
    document.getElementById('stat-total-detail').innerHTML =
      `<strong>${totalSold}</strong> vendidos em 90 dias`;

    // Sincroniza visualmente qual card está "ativo" com o filtro atual
    document.querySelectorAll('.stat-card[data-card-filter]').forEach(card => {
      card.classList.toggle('active', card.dataset.cardFilter === state.statusFilter);
    });
  }

  function renderRecommendations(products) {
    const container = document.getElementById('recommendations');
    const priority = products
      .filter(p => p.status === 'critical' || p.status === 'warning')
      .filter(p => p.sold90 > 0)
      .sort((a, b) => a.daysOfCover - b.daysOfCover)
      .slice(0, 9);

    document.getElementById('rec-count').textContent = priority.length;

    if (priority.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; background: var(--paper-warm); border: 1px solid var(--border);">
          <div style="font-size: 32px; margin-bottom: 12px;">✓</div>
          <div style="font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; color: var(--green); margin-bottom: 6px;">
            Nenhuma reposição urgente
          </div>
          <div style="font-size: 13px; color: var(--muted);">
            Todos os produtos com venda ativa têm cobertura acima de ${state.daysThreshold} dias.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = priority.map(p => {
      const daysLabel = p.stock === 0
        ? 'ESGOTADO'
        : `${Math.floor(p.daysOfCover)} dias`;
      const daysClass = p.status === 'critical' ? 'critical' : 'warning';
      const priorityClass = p.status === 'critical' ? 'priority-high' : 'priority-medium';

      return `
        <div class="rec-card ${priorityClass}">
          <img class="rec-card-img" src="${p.image}" alt="" loading="lazy" />
          <div class="rec-card-content">
            <div class="rec-card-title">${p.title}</div>
            <div class="rec-card-meta">${p.vendor} · ${p.sold90} un./90d</div>
            <div class="rec-card-action">
              <div class="rec-card-suggest">
                +${p.suggestion}
                <small>UN. SUGERIDAS</small>
              </div>
              <div class="rec-card-days ${daysClass}">${daysLabel}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTable(products) {
    let filtered = products;

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q)
      );
    }

    if (state.statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (state.statusFilter === 'out') return p.stock === 0;
        if (state.statusFilter === 'critical') return p.status === 'critical';
        if (state.statusFilter === 'warning') return p.status === 'warning';
        if (state.statusFilter === 'ok') return p.status === 'ok' || p.status === 'stagnant';
        return true;
      });
    }

    if (state.vendorFilter !== 'all') {
      filtered = filtered.filter(p => p.vendor === state.vendorFilter);
    }

    filtered.sort((a, b) => {
      let av, bv;
      if (state.sortBy === 'stock') { av = a.stock; bv = b.stock; }
      else if (state.sortBy === 'velocity') { av = a.dailyVelocity; bv = b.dailyVelocity; }
      else if (state.sortBy === 'days') {
        av = a.daysOfCover === Infinity ? 9999 : a.daysOfCover;
        bv = b.daysOfCover === Infinity ? 9999 : b.daysOfCover;
      }
      return state.sortDir === 'asc' ? av - bv : bv - av;
    });

    document.getElementById('visible-count').textContent = filtered.length;
    document.getElementById('total-count').textContent = products.length;

    const tbody = document.getElementById('tbody');

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <div class="emoji">⌕</div>
            <div>Nenhum produto encontrado com esses filtros</div>
          </div>
        </td></tr>
      `;
      return;
    }

    const maxStock = Math.max(...products.map(p => p.stock), 100);

    tbody.innerHTML = filtered.map(p => {
      const rowClass = p.status === 'critical'
        ? 'row-critical'
        : (p.status === 'warning' ? 'row-warning' : '');

      let badge;
      if (p.stock === 0) badge = `<span class="badge critical">Esgotado</span>`;
      else if (p.status === 'critical') badge = `<span class="badge critical">Crítico</span>`;
      else if (p.status === 'warning') badge = `<span class="badge warning">Atenção</span>`;
      else if (p.status === 'stagnant') badge = `<span class="badge stagnant">Parado</span>`;
      else badge = `<span class="badge ok">Saudável</span>`;

      const fillPct = Math.min((p.stock / maxStock) * 100, 100);
      const fillClass = p.status === 'critical' ? 'critical' : (p.status === 'warning' ? 'warning' : '');

      let daysCell;
      if (p.daysOfCover === Infinity) {
        daysCell = `<div class="days-cell infinite">—<small>SEM VENDAS</small></div>`;
      } else if (p.daysOfCover === 0) {
        daysCell = `<div class="days-cell critical">0<small>ESGOTADO</small></div>`;
      } else {
        const cls = p.status === 'critical' ? 'critical' : (p.status === 'warning' ? 'warning' : 'ok');
        daysCell = `<div class="days-cell ${cls}">${Math.floor(p.daysOfCover)}<small>DIAS</small></div>`;
      }

      const suggestion = p.suggestion > 0
        ? `<strong style="color: var(--accent); font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500;">+${p.suggestion}</strong>`
        : `<span style="color: var(--muted);">—</span>`;

      const velocity = p.dailyVelocity === 0
        ? `<span style="color: var(--muted);">0</span>`
        : p.dailyVelocity.toFixed(2);

      return `
        <tr class="${rowClass}">
          <td>
            <div class="product-cell">
              <img class="product-thumb" src="${p.image}" alt="" loading="lazy" />
              <div class="product-info">
                <div class="product-name">${p.title}</div>
                <div class="product-sku">${p.vendor} · ${p.sku}</div>
              </div>
            </div>
          </td>
          <td class="numeric">
            <div class="stock-bar-wrap">
              <div class="stock-bar"><div class="stock-bar-fill ${fillClass}" style="width: ${fillPct}%"></div></div>
              <div class="stock-num">${p.stock}</div>
            </div>
          </td>
          <td class="numeric">${velocity}</td>
          <td class="numeric">${daysCell}</td>
          <td>${badge}</td>
          <td class="numeric">${suggestion}</td>
        </tr>
      `;
    }).join('');
  }

  function populateVendorFilter() {
    const vendors = [...new Set(data.products.map(p => p.vendor))].sort();
    const select = document.getElementById('vendor-filter');
    vendors.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    });
  }

  function render() {
    const products = recompute();
    renderStats(products);
    renderRecommendations(products);
    renderTable(products);
    updateSortIndicators();
  }

  function updateSortIndicators() {
    document.querySelectorAll('th.sortable').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.dataset.sort === state.sortBy) {
        th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  // Helper: muda o filtro de status e sincroniza UI
  function setStatusFilter(value) {
    state.statusFilter = value;
    // Sincroniza botões superiores
    document.querySelectorAll('.filter-btn[data-filter]').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === value);
    });
    render();
  }

  function setupEvents() {
    document.getElementById('search').addEventListener('input', e => {
      state.searchQuery = e.target.value;
      render();
    });

    // Botões superiores de filtro
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        setStatusFilter(btn.dataset.filter);
      });
    });

    // Cards principais → também filtram (com toggle: clicar de novo desmarca)
    document.querySelectorAll('.stat-card[data-card-filter]').forEach(card => {
      const apply = () => {
        const target = card.dataset.cardFilter;
        // Se o card já está ativo, volta para "all"
        if (state.statusFilter === target) {
          setStatusFilter('all');
        } else {
          setStatusFilter(target);
        }
      };
      card.addEventListener('click', apply);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          apply();
        }
      });
    });

    document.getElementById('vendor-filter').addEventListener('change', e => {
      state.vendorFilter = e.target.value;
      render();
    });

    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (state.sortBy === col) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = col;
          state.sortDir = 'asc';
        }
        render();
      });
    });
  }

  function setMetadata() {
    const updateDate = new Date(data.shop.lastUpdate);
    const formatted = updateDate.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('last-update').textContent = `ATUALIZADO ${formatted.toUpperCase()}`;
    document.getElementById('footer-date').textContent = formatted;
  }

  document.addEventListener('DOMContentLoaded', () => {
    setMetadata();
    populateVendorFilter();
    setupEvents();
    render();
  });
})();
