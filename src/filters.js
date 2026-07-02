export function filterProducts(products, { category = 'all', searchTerm = '' }) {
  let result = products;

  if (category !== 'all') {
    result = result.filter(p => p.category === category);
  }

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    result = result.filter(p => {
      const name = p.name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
      const desc = p.description.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
      return name.includes(term) || desc.includes(term);
    });
  }

  return result;
}
