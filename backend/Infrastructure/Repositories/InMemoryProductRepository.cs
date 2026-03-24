using System.Collections.Concurrent;
using EcoMarketplace.API.Models;

namespace EcoMarketplace.API.Repositories
{
    public class InMemoryProductRepository : IProductRepository
    {
        private readonly ConcurrentDictionary<int, Product> _products = new();
        private int _nextId = 1;

        public InMemoryProductRepository()
        {
            // Ajouter quelques produits de test
            AddTestProducts();
        }

        private void AddTestProducts()
        {
            var testProducts = new[]
            {
                new Product
                {
                    Id = _nextId++,
                    Title = "Smartphone reconditionné",
                    Description = "Smartphone comme neuf, batterie remplacée",
                    Price = 299.99m,
                    Condition = ProductCondition.LikeNew,
                    Category = ProductCategory.Electronics,
                    SellerId = 2, // ID du vendeur de test
                    Images = new[] { "phone1.jpg", "phone2.jpg" },
                    Location = "Paris",
                    Material = "Aluminium recyclé",
                    IsRecycled = true,
                    IsSustainable = true,
                    RecycledPercentage = 85,
                    EcoScore = 85,
                    Status = ProductStatus.Available,
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                },
                new Product
                {
                    Id = _nextId++,
                    Title = "T-shirt en coton bio",
                    Description = "T-shirt 100% coton biologique, certification GOTS",
                    Price = 24.99m,
                    Condition = ProductCondition.New,
                    Category = ProductCategory.Textile,
                    SellerId = 2,
                    Images = new[] { "tshirt1.jpg" },
                    Location = "Lyon",
                    Material = "Coton biologique",
                    IsRecycled = false,
                    IsSustainable = true,
                    RecycledPercentage = 0,
                    EcoScore = 90,
                    Status = ProductStatus.Available,
                    CreatedAt = DateTime.UtcNow.AddDays(-5)
                },
                new Product
                {
                    Id = _nextId++,
                    Title = "Table en bois massif",
                    Description = "Table en chêne massif issue de forêts gérées durablement",
                    Price = 450.00m,
                    Condition = ProductCondition.Good,
                    Category = ProductCategory.Furniture,
                    SellerId = 2,
                    Images = new[] { "table1.jpg", "table2.jpg" },
                    Location = "Bordeaux",
                    Material = "Bois certifié FSC",
                    IsRecycled = false,
                    IsSustainable = true,
                    RecycledPercentage = 0,
                    EcoScore = 88,
                    Status = ProductStatus.Available,
                    CreatedAt = DateTime.UtcNow.AddDays(-10)
                }
            };

            foreach (var product in testProducts)
            {
                _products[product.Id] = product;
            }
        }

        public async Task<Product?> GetByIdAsync(int id)
        {
            _products.TryGetValue(id, out var product);
            return await Task.FromResult(product);
        }

        public async Task<IEnumerable<Product>> GetAllAsync(
            int page,
            int pageSize,
            string? search = null,
            ProductCategory? category = null,
            int? minEcoScore = null,
            decimal? maxPrice = null)
        {
            var query = _products.Values.AsEnumerable()
                .Where(p => p.Status != ProductStatus.Removed);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim().ToLowerInvariant();
                query = query.Where(p =>
                    p.Title.ToLowerInvariant().Contains(searchTerm) ||
                    p.Description.ToLowerInvariant().Contains(searchTerm) ||
                    (!string.IsNullOrWhiteSpace(p.Material) && p.Material.ToLowerInvariant().Contains(searchTerm)) ||
                    (!string.IsNullOrWhiteSpace(p.Location) && p.Location.ToLowerInvariant().Contains(searchTerm)));
            }

            if (category.HasValue)
            {
                query = query.Where(p => p.Category == category.Value);
            }

            if (minEcoScore.HasValue)
            {
                query = query.Where(p => p.EcoScore >= minEcoScore.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= maxPrice.Value);
            }

            var products = query
                .OrderByDescending(p => p.EcoScore)
                .ThenByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return await Task.FromResult(products);
        }

        public async Task<IEnumerable<Product>> GetBySellerIdAsync(int sellerId)
        {
            var products = _products.Values
                .Where(p => p.SellerId == sellerId && p.Status != ProductStatus.Removed)
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            return await Task.FromResult(products);
        }

        public async Task<IEnumerable<Product>> GetByCategoryAsync(ProductCategory category)
        {
            var products = _products.Values
                .Where(p => p.Category == category && p.Status != ProductStatus.Removed)
                .OrderByDescending(p => p.EcoScore)
                .ToList();

            return await Task.FromResult(products);
        }

        public async Task<IEnumerable<Product>> SearchAsync(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return await Task.FromResult(Enumerable.Empty<Product>());

            searchTerm = searchTerm.ToLower();

            var products = _products.Values
                .Where(p => p.Status != ProductStatus.Removed &&
                    (p.Title.ToLower().Contains(searchTerm) ||
                     p.Description.ToLower().Contains(searchTerm) ||
                     (p.Material != null && p.Material.ToLower().Contains(searchTerm))))
                .OrderByDescending(p => p.EcoScore)
                .ToList();

            return await Task.FromResult(products);
        }

        public async Task<Product> AddAsync(Product product)
        {
            product.Id = _nextId++;
            product.CreatedAt = DateTime.UtcNow;
            product.Status = ProductStatus.Available;
            product.ViewCount = 0;

            _products[product.Id] = product;
            return await Task.FromResult(product);
        }

        public async Task UpdateAsync(Product product)
        {
            if (_products.ContainsKey(product.Id))
            {
                product.UpdatedAt = DateTime.UtcNow;
                _products[product.Id] = product;
            }
            await Task.CompletedTask;
        }

        public async Task DeleteAsync(int id)
        {
            if (_products.TryGetValue(id, out var product))
            {
                product.Status = ProductStatus.Removed;
                _products[id] = product;
            }
            await Task.CompletedTask;
        }

        public async Task<int> GetTotalCountAsync(
            string? search = null,
            ProductCategory? category = null,
            int? minEcoScore = null,
            decimal? maxPrice = null)
        {
            var query = _products.Values.AsEnumerable()
                .Where(p => p.Status != ProductStatus.Removed);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim().ToLowerInvariant();
                query = query.Where(p =>
                    p.Title.ToLowerInvariant().Contains(searchTerm) ||
                    p.Description.ToLowerInvariant().Contains(searchTerm) ||
                    (!string.IsNullOrWhiteSpace(p.Material) && p.Material.ToLowerInvariant().Contains(searchTerm)) ||
                    (!string.IsNullOrWhiteSpace(p.Location) && p.Location.ToLowerInvariant().Contains(searchTerm)));
            }

            if (category.HasValue)
            {
                query = query.Where(p => p.Category == category.Value);
            }

            if (minEcoScore.HasValue)
            {
                query = query.Where(p => p.EcoScore >= minEcoScore.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= maxPrice.Value);
            }

            return await Task.FromResult(query.Count());
        }
    }
}