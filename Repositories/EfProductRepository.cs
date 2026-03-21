using Microsoft.EntityFrameworkCore;
using EcoMarketplace.API.Models;
using EcoMarketplace.API.Data;

namespace EcoMarketplace.API.Repositories
{
    public class EfProductRepository : IProductRepository
    {
        private readonly ApplicationDbContext _context;

        public EfProductRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Product?> GetByIdAsync(int id)
        {
            return await _context.Products
                .Include(p => p.Seller)
                .Include(p => p.Transactions)
                .FirstOrDefaultAsync(p => p.Id == id && p.Status != ProductStatus.Removed);
        }

        public async Task<IEnumerable<Product>> GetAllAsync(
            int page,
            int pageSize,
            string? search = null,
            ProductCategory? category = null,
            int? minEcoScore = null,
            decimal? maxPrice = null)
        {
            var query = _context.Products
                .Include(p => p.Seller)
                .Where(p => p.Status != ProductStatus.Removed)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim().ToLower();
                query = query.Where(p =>
                    p.Title.ToLower().Contains(searchTerm) ||
                    p.Description.ToLower().Contains(searchTerm) ||
                    p.Material.ToLower().Contains(searchTerm) ||
                    p.Location.ToLower().Contains(searchTerm));
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

            return await query
                .OrderByDescending(p => p.EcoScore)
                .ThenByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetBySellerIdAsync(int sellerId)
        {
            return await _context.Products
                .Include(p => p.Seller)
                .Where(p => p.SellerId == sellerId && p.Status != ProductStatus.Removed)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetByCategoryAsync(ProductCategory category)
        {
            return await _context.Products
                .Include(p => p.Seller)
                .Where(p => p.Category == category && p.Status != ProductStatus.Removed)
                .OrderByDescending(p => p.EcoScore)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> SearchAsync(string searchTerm)
        {
            searchTerm = searchTerm.ToLower();

            return await _context.Products
                .Include(p => p.Seller)
                .Where(p => p.Status != ProductStatus.Removed &&
                    (p.Title.ToLower().Contains(searchTerm) ||
                     p.Description.ToLower().Contains(searchTerm) ||
                     p.Material.ToLower().Contains(searchTerm)))
                .OrderByDescending(p => p.EcoScore)
                .ToListAsync();
        }

        public async Task<Product> AddAsync(Product product)
        {
            product.CreatedAt = DateTime.UtcNow;
            product.Status = ProductStatus.Available;
            product.ViewCount = 0;

            await _context.Products.AddAsync(product);
            await _context.SaveChangesAsync();

            return product;
        }

        public async Task UpdateAsync(Product product)
        {
            product.UpdatedAt = DateTime.UtcNow;
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var product = await GetByIdAsync(id);
            if (product != null)
            {
                product.Status = ProductStatus.Removed;
                await UpdateAsync(product);
            }
        }

        public async Task<int> GetTotalCountAsync(
            string? search = null,
            ProductCategory? category = null,
            int? minEcoScore = null,
            decimal? maxPrice = null)
        {
            var query = _context.Products
                .Where(p => p.Status != ProductStatus.Removed)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.Trim().ToLower();
                query = query.Where(p =>
                    p.Title.ToLower().Contains(searchTerm) ||
                    p.Description.ToLower().Contains(searchTerm) ||
                    p.Material.ToLower().Contains(searchTerm) ||
                    p.Location.ToLower().Contains(searchTerm));
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

            return await query.CountAsync();
        }
    }
}